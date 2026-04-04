# Scoreboard Manager Refactor Investigation

## Goal

Convert the scoreboard system from **multiple board class instances each owning their own multiboard** to a **single data model + viewer-aware rendering** approach. A player sees the player multiboard, an observer sees the observer multiboard, and a team player sees the team multiboard — all driven from the same underlying data.

## Primary Motivation

The main driver for this refactor is **replay POV switching bugs**. The current system swaps visibility between two independent board instances (`standard` and `obs`) when the observed player changes during replay. If a POV switch happens mid-operation (e.g., during `updateFull()` or `updatePartial()`), the two boards can end up in inconsistent states — one board may have been partially updated while the other hasn't been touched yet. By having all renderers read from the same data model, a POV switch simply re-renders the active view from consistent, already-computed data rather than toggling between two independently-managed boards.

---

## Current Architecture

### Class Hierarchy

```
Scoreboard (abstract)
├── StandardBoard   — FFA player view (6 cols: Player, Inc, C, K, D, Status)
├── TeamBoard       — Team player view (6 cols, grouped by team with optional team totals)
├── ObserverBoard   — Observer view (7 cols: Player, Inc, Gold, C, K, D, Status)
└── SessionBoard    — Between-match stats (5 cols: Player, W, L, K, D)
```

### ScoreboardManager (Singleton)

```typescript
scoreboards: Record<'standard' | 'obs', Scoreboard>  // max 2 active boards
sessionBoard: SessionBoard | null
observers: player[]
```

- `ffaSetup()` → creates `StandardBoard`
- `teamSetup()` → creates `TeamBoard`
- `obsSetup()` → creates `ObserverBoard` + toggles per-client visibility
- `sessionSetup()` → creates `SessionBoard`

### How It Works Today

1. **One multiboard per board type** — not per player. The same `multiboard` handle is shared across all clients.
2. **Visibility** is toggled per-client using `GetLocalPlayer()` checks:
   - Players see `standard` (StandardBoard or TeamBoard)
   - Observers see `obs` (ObserverBoard)
3. **Each board class owns both data logic and rendering** — sorting, formatting, color-coding, and multiboard cell writes are all interleaved in `updateFull()` / `updatePartial()`.
4. **Duplicate logic** across boards: sorting (StandardBoard and ObserverBoard share almost identical sort), eliminated player formatting, rating display, status formatting, etc.

---

## Problems with Current Approach

| Problem                                 | Details                                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Duplicated sorting logic**            | StandardBoard and ObserverBoard have near-identical sort functions (alive first by income desc, eliminated by turnDied desc).                     |
| **Duplicated rendering logic**          | Eliminated player formatting, rating change display, city highlight logic, status display — all repeated across 3+ board classes.                 |
| **Tight coupling of data and view**     | Each board reads directly from `ActivePlayer.trackedData` and formats inline. No separation between "what data to show" and "how to render it."   |
| **Hard to add new columns/views**       | Adding a new column or a new viewer type requires modifying or duplicating an entire board class.                                                 |
| **Replay POV swap is visibility-based** | `checkReplayPovBoardSwap()` just hides/shows entire boards. In a data-driven model, it could re-render the same board with different perspective. |

---

## Performance Analysis

The current scoreboard system has several performance issues, mostly concentrated in the per-tick `updatePartial()` path.

### Update Frequency

| Callsite                      | Method            | Frequency                             |
| ----------------------------- | ----------------- | ------------------------------------- |
| `GameLoopState.onTick()`      | `updatePartial()` | **Every game tick**                   |
| `GameLoopState.onStartTurn()` | `updateFull()`    | Once per turn                         |
| `GameLoopState.onEndTurn()`   | `updateFull()`    | Once per turn                         |
| `onCityCapture()`             | `updatePartial()` | On city capture events                |
| `on-player-status.ts`         | `updatePartial()` | On player status change (6 callsites) |
| `SharedSlotManager`           | `updateFull()`    | On slot redistribution                |

The dominant cost is `updatePartial()` being called **every single tick**, which drives the issues below.

### Issue 1: Invisible Boards Are Always Updated

`ScoreboardManager.iterateBoards()` calls `updatePartial()` / `updateFull()` on **every** registered board. The observer board gets fully re-rendered every tick even when only players are viewing it (and vice versa). Roughly **50% of all multiboard work targets a board nobody is looking at**.

```typescript
// scoreboard-manager.ts — both boards always updated
private iterateBoards(callback: (board: Scoreboard) => void) {
    Object.values(this.scoreboards).forEach((board) => {
        if (board) callback(board);
    });
}
```

### Issue 2: Excessive MultiboardGetItem/MultiboardReleaseItem Calls

Every `setItemValue()` call in the base `Scoreboard` class does a `MultiboardGetItem` → set value → `MultiboardReleaseItem` cycle. For a 12-player game on a single tick:

| Board                           | Players | Columns updated per player                    | Cell writes per tick |
| ------------------------------- | ------- | --------------------------------------------- | -------------------- |
| StandardBoard `updatePartial()` | 12      | 5 (name, cities, kills, deaths, status)       | 60                   |
| ObserverBoard `updatePartial()` | 12      | 6 (name, gold, cities, kills, deaths, status) | 72                   |
| **Total per tick**              |         |                                               | **132**              |
| **Per turn (60 ticks)**         |         |                                               | **~7,920**           |

Each of those 132 calls per tick involves a `MultiboardGetItem` + `MultiboardReleaseItem` pair = **264 native API calls per tick** just for partial updates.

### Issue 3: Redundant GetLocalPlayer() Calls

`effectiveLocal` (the `isReplay() ? getReplayObservedPlayer() : GetLocalPlayer()` pattern) is recomputed:

- Once per player row in `StandardBoard.updatePartial()` (inside the loop)
- Once per player row in `ObserverBoard.updatePartial()`
- Once per player in `TeamBoard.getStringColor()` (called per player per update)
- Again inside `StandardBoard.updatePlayerData()` for eliminated player checks

For 12 players across 2 boards, that's **30+ redundant calls per tick** to the same function that always returns the same value within a single update cycle.

### Issue 4: String Allocation Per Cell Per Tick

Every `updatePartial()` builds new template literal strings for every cell: `` `${textColor}${value}` ``. Even when the underlying value hasn't changed since last tick, new strings are allocated and passed to `MultiboardSetItemValue`. WC3/Lua string handling makes this non-trivial garbage.

### Issue 5: Array.sort() on Every updateFull()

`updateFull()` calls `Array.sort()` unconditionally. This only runs once per turn (not per tick), so the performance impact is **minor**. However, it does re-sort even when no income or elimination changes have occurred since the last sort.

### How the Refactor Addresses These

| Issue                         | Fix in new architecture                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| Invisible board updates       | Manager can skip rendering for boards that aren't visible to any client                      |
| Excessive GetItem/ReleaseItem | Dirty-checking on the data model: only write cells whose values actually changed             |
| Redundant GetLocalPlayer()    | Computed once per update cycle in the data model or once per render call                     |
| String allocation             | Compare new value to last-written value before calling setItemValue; skip if identical       |
| Sort on unchanged data        | Data model can track a dirty flag and skip sort when no relevant data changed (low priority) |

The biggest wins are **skipping invisible board updates** and **dirty-checking cells before writing**, which together could eliminate 50-80% of per-tick multiboard API calls.

---

## Proposed Architecture

### Core Idea

Separate **data** (what to display) from **rendering** (how to display it for a specific viewer type).

```
┌──────────────────────────────────────────┐
│         ScoreboardDataModel              │
│  (sorted player list, stats, state)      │
│  - Single source of truth                │
│  - Sorting logic lives here              │
│  - No multiboard operations              │
└──────────────┬───────────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌──────────┐
│ Player │ │  Team  │ │ Observer │
│Renderer│ │Renderer│ │ Renderer │
└────────┘ └────────┘ └──────────┘
  Each renderer owns a multiboard
  and knows how to format cells
  for its viewer type
```

### Key Components

#### 1. ScoreboardDataModel

A class that holds all scoreboard-relevant state:

```typescript
interface PlayerRow {
	player: ActivePlayer;
	handle: player;
	income: number;
	incomeDelta: number;
	gold: number;
	cities: number;
	kills: number;
	deaths: number;
	status: string;
	statusDuration: number;
	isEliminated: boolean;
	isNomad: boolean;
	isSTFU: boolean;
	turnDied: number;
	lastCombat: number;
	isInCombat: boolean;
	teamNumber?: number;
	ratingChange?: { effectiveChange: number; wasFloorProtected: boolean } | null;
	displayName: string; // NameManager.getDisplayName()
	acctName: string; // NameManager.getAcct()
	btag: string; // NameManager.getBtag()
	originalColorCode: string; // NameManager.getOriginalColorCode()
}

interface TeamRow {
	team: Team;
	number: number;
	totalIncome: number;
	totalCities: number;
	totalKills: number;
	totalDeaths: number;
	members: PlayerRow[];
}
```

- `refresh()` — pulls latest data from `ActivePlayer.trackedData`, sorts, and caches `PlayerRow[]` / `TeamRow[]`
- Sorting logic consolidated here (one implementation instead of three)
- No multiboard calls

#### 2. ScoreboardRenderer (abstract)

```typescript
abstract class ScoreboardRenderer {
	protected board: multiboard;
	protected size: number;

	abstract renderFull(data: ScoreboardDataModel): void;
	abstract renderPartial(data: ScoreboardDataModel): void;
	abstract renderAlert(player: player, countryName: string): void;

	// Shared helpers from current Scoreboard base
	setTitle(str: string): void;
	setVisibility(bool: boolean): void;
	protected setItemWidth(width: number, row: number, col: number): void;
	protected setItemValue(value: string, row: number, col: number): void;
}
```

#### 3. Concrete Renderers

| Renderer           | Viewer                 | Columns                            | Special behavior                           |
| ------------------ | ---------------------- | ---------------------------------- | ------------------------------------------ |
| `PlayerRenderer`   | Active players (FFA)   | Player, Inc, C, K, D, Status       | Highlights own row in tangerine            |
| `TeamRenderer`     | Active players (Teams) | Player, Inc, C, K, D, Status       | Groups by team, ally=green, enemy=white    |
| `ObserverRenderer` | Observers              | Player, Inc, Gold, C, K, D, Status | Shows gold, income delta, combat highlight |
| `SessionRenderer`  | All (post-match)       | Player, W, L, K, D                 | Unchanged from current SessionBoard        |

Each renderer only contains **formatting/rendering logic** — no data fetching or sorting.

#### 4. Updated ScoreboardManager

```typescript
class ScoreboardManager {
	private dataModel: ScoreboardDataModel;
	private renderers: Map<ScoreboardViewType, ScoreboardRenderer>;
	private sessionRenderer: SessionRenderer | null;

	updateFull() {
		this.dataModel.refresh();
		this.renderers.forEach((r) => r.renderFull(this.dataModel));
	}

	updatePartial() {
		this.dataModel.refreshValues(); // no re-sort
		this.renderers.forEach((r) => r.renderPartial(this.dataModel));
	}
}
```

---

## Migration Steps

### Phase 1: Extract Data Model

1. Create `ScoreboardDataModel` class with `PlayerRow` / `TeamRow` interfaces.
2. Implement `refresh()` that reads from `ActivePlayer.trackedData` and sorts.
3. Consolidate the three duplicate sort implementations into one.

**Risk**: Low — purely additive, existing boards still work.

### Phase 2: Create Renderer Base + PlayerRenderer

1. Rename existing `Scoreboard` base to `ScoreboardRenderer` (or create new alongside).
2. Convert `StandardBoard` → `PlayerRenderer` that takes `ScoreboardDataModel` in `renderFull()`/`renderPartial()` instead of reading from `ActivePlayer` directly.
3. Wire up `ScoreboardManager` to pass data model to renderer.

**Risk**: Medium — changes the core render path. Test with FFA games first.

### Phase 3: Convert TeamRenderer and ObserverRenderer

1. Convert `TeamBoard` → `TeamRenderer`.
2. Convert `ObserverBoard` → `ObserverRenderer`.
3. Each reads from `ScoreboardDataModel` instead of reaching into `ActivePlayer`/`Team` objects.

**Risk**: Medium — same as Phase 2 but for two more board types.

### Phase 4: Convert SessionBoard

1. Move session stats tracking into `ScoreboardDataModel` (or a separate `SessionDataModel`).
2. Convert `SessionBoard` → `SessionRenderer`.

**Risk**: Low — session board is simpler and already somewhat isolated.

### Phase 5: Simplify Replay POV (Primary Goal)

1. Instead of swapping board visibility for replay POV changes, re-render the active board with the new perspective player.
2. This eliminates the need for `checkReplayPovBoardSwap()` toggling two separate boards.
3. A POV switch mid-operation no longer causes inconsistent state — the data model is already up-to-date, and the renderer just re-reads it.
4. Eliminates the race condition where `checkReplayPovBoardSwap()` runs between a `standard` board update and an `obs` board update, leaving one stale.

**Risk**: Low-Medium — replay behavior is sensitive; needs testing. However, this is the phase that fixes the actual bugs motivating the refactor.

---

## Key Considerations

### WC3 Multiboard Constraints

- **One visible multiboard per client** — `MultiboardDisplay` is the only way to show/hide. You still need separate `multiboard` handles for player vs observer views since they have different column counts.
- **`GetLocalPlayer()` desync risk** — any code inside `if (GetLocalPlayer() == somePlayer)` that does non-cosmetic work will desync. Current code is already careful about this; the refactor must preserve this discipline.
- **Column count is per-board** — you cannot have different column counts per viewer on the same multiboard. This means the observer board (7 cols) must remain a separate multiboard from the player board (6 cols).

### What This Does NOT Change

- Still need separate multiboard handles for different column layouts (player vs observer).
- Still need `GetLocalPlayer()` visibility toggling.
- `SessionBoard` lifecycle (persists across matches) stays the same.

### What This DOES Change

- **Data reads happen once** in `ScoreboardDataModel.refresh()`, not repeated across 2-3 board classes.
- **Sorting happens once**, not duplicated.
- **Formatting helpers** (eliminated colors, rating display, city highlight) can be shared utility functions instead of duplicated private methods.
- **Adding a new view** (e.g., a spectator-only stats overlay) only requires a new renderer, not a new board class that re-implements data fetching.
- **Testing** becomes easier since data model can be tested independently of multiboard calls.
- **Invisible boards are no longer updated** — the manager can check visibility before calling render.
- **Dirty-checking** — renderers can compare `PlayerRow` values against last-written values and skip unchanged cells, dramatically reducing multiboard API calls per tick.
- **`effectiveLocal` computed once** per update cycle, not per-row per-board.

---

## Effort Estimate

| Phase                    | Files Changed                                                 | Complexity |
| ------------------------ | ------------------------------------------------------------- | ---------- |
| Phase 1: Data Model      | 1 new file                                                    | Low        |
| Phase 2: PlayerRenderer  | 2-3 files (StandardBoard → PlayerRenderer, ScoreboardManager) | Medium     |
| Phase 3: Team + Observer | 2-3 files each                                                | Medium     |
| Phase 4: Session         | 1-2 files                                                     | Low        |
| Phase 5: Replay POV      | 1 file (ScoreboardManager)                                    | Low-Medium |

Total: ~5-8 files touched, 1-2 new files created.

---

## Code Duplication That Gets Eliminated

These blocks currently exist in near-identical form across multiple files:

1. **Player sort by income/elimination** — `StandardBoard.updateFull()`, `ObserverBoard.updateFull()`
2. **Rating change display** — `StandardBoard.updateFull()`, `ObserverBoard.updateFull()`
3. **Eliminated player formatting** — `StandardBoard.updatePlayerData()`, `ObserverBoard.setEliminatedColumns()`, `TeamBoard.updatePlayerData()`
4. **City count highlight** — all three boards
5. **Status formatting** (Nomad/STFU duration) — all three boards
6. **`effectiveLocal` calculation** — repeated in every `updateFull()`/`updatePartial()`/`getStringColor()`

---

## Design Decisions

1. **`ScoreboardDataModel` rebuilds `PlayerRow[]` on every call.** No caching. WC3's tick-based update model (called at turn boundaries) means rebuild frequency is low, and this avoids staleness risk entirely.

2. **Renderers keep formatting fully independent.** No shared `formatPlayerRow()` helper. Each renderer owns its own column formatting logic, even where it overlaps. This keeps renderers self-contained and avoids coupling between view types.

3. **`isInCombat` is part of the data model.** The combat state (currently only used by ObserverBoard's 15s highlight) is exposed as an `isInCombat` boolean on `PlayerRow`. This makes it available to any renderer that wants it in the future.
