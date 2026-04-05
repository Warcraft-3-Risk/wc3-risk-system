# Scoreboard Refactor — Execution Plan

This is the step-by-step execution plan for the scoreboard refactor described in [scoreboard-refactor-investigation.md](scoreboard-refactor-investigation.md).

---

## Phase 1: Extract Data Model

- [x] **1.1** Create `src/app/scoreboard/scoreboard-data-model.ts`
  - Define `PlayerRow` interface with all fields from investigation doc
  - Define `TeamRow` interface
  - Implement `ScoreboardDataModel` class with:
    - `players: PlayerRow[]` (sorted)
    - `teams: TeamRow[]` (sorted, populated when not FFA)
    - `refresh(activePlayers, isFFA)` — full rebuild + sort (consolidates 3 duplicate sort implementations)
    - `refreshValues(activePlayers, isFFA)` — rebuild values without re-sort (for `updatePartial`)
  - Sorting: alive by income desc, eliminated by turnDied desc (tie-break by player ID)
  - Team sorting: by total income desc (tie-break by team number)

---

## Phase 2: Create Renderer Base + PlayerRenderer

- [x] **2.1** Create `src/app/scoreboard/scoreboard-renderer.ts`

  - Abstract `ScoreboardRenderer` class that owns a `multiboard` handle
  - Shared helpers: `setTitle()`, `setVisibility()`, `setItemWidth()`, `setItemValue()`, `build()`
  - Abstract methods: `renderFull(data)`, `renderPartial(data)`, `renderAlert(player, countryName)`, `destroy()`
  - Constructor takes column count + row sizing config

- [x] **2.2** Create `src/app/scoreboard/player-renderer.ts`

  - Extends `ScoreboardRenderer`
  - 6 columns: Player, Inc, C, K, D, Status
  - `renderFull(data)` — full render from `data.players` (replaces StandardBoard.updateFull)
  - `renderPartial(data)` — partial render (replaces StandardBoard.updatePartial)
  - `renderAlert(player, countryName)` — alert row
  - Uses `effectiveLocal` from data model for viewer-aware coloring (TANGERINE for self, WHITE otherwise)
  - Eliminated player formatting (grey, rating display, account name)
  - City count highlight when >= victory threshold

- [x] **2.3** Wire `PlayerRenderer` into `ScoreboardManager`
  - `ffaSetup()` creates a `PlayerRenderer` instead of `StandardBoard`
  - `updateFull()` calls `dataModel.refresh()` then `renderer.renderFull(dataModel)`
  - `updatePartial()` calls `dataModel.refreshValues()` then `renderer.renderPartial(dataModel)`

---

## Phase 3: Convert TeamRenderer and ObserverRenderer

- [x] **3.1** Create `src/app/scoreboard/observer-renderer.ts`

  - Extends `ScoreboardRenderer`
  - 7 columns: Player, Inc, Gold, C, K, D, Status
  - `renderFull(data)` — full render with gold column, income delta, team prefix
  - `renderPartial(data)` — partial render
  - Combat highlight (15s blue) using `isInCombat` from `PlayerRow`
  - Income delta display with color coding (green/red/gray)
  - No viewer-specific coloring (observers see all in white)

- [x] **3.2** Create `src/app/scoreboard/team-renderer.ts`

  - Extends `ScoreboardRenderer`
  - 6 columns: Player, Inc, C, K, D, Status
  - `renderFull(data)` — renders from `data.teams`, groups by team with optional team total rows
  - `renderPartial(data)` — partial render using team grouping
  - Ally/enemy coloring: TANGERINE for self, GREEN for allies, WHITE for enemies
  - Team total rows in LIGHT_BLUE when space allows (size + teams.length <= 26)
  - Team elimination uses entire-team check (not individual player)

- [x] **3.3** Wire `TeamRenderer` and `ObserverRenderer` into `ScoreboardManager`
  - `teamSetup()` creates a `TeamRenderer` instead of `TeamBoard`
  - `obsSetup()` creates an `ObserverRenderer` instead of `ObserverBoard`
  - Update `iterateBoards()` to work with new renderer map

---

## Phase 4: Convert SessionBoard

- [x] **4.1** Create `src/app/scoreboard/session-renderer.ts`
  - Extends `ScoreboardRenderer`
  - 5 columns: Player, W, L, K, D
  - Keeps its own `SessionStats` map (wins, losses, kills, deaths) — this data is NOT part of `ScoreboardDataModel` since it persists across matches
  - `recordMatchResult()` and `recordKillsDeaths()` stay on this class
  - `renderFull()` sorts by wins desc, then K/D desc
  - `renderPartial()` delegates to `renderFull()` (same as current)

---

## Phase 5: Simplify Replay POV Swap

- [x] **5.1** Refactor `ScoreboardManager.checkReplayPovBoardSwap()`

  - Instead of toggling visibility between two independent boards, re-render the active board with the new perspective
  - The data model is already consistent — just call `renderFull(dataModel)` or `renderPartial(dataModel)` on the newly-visible renderer
  - Remove the race condition where a POV swap between two independent board updates leaves one stale

- [x] **5.2** Add `effectiveLocal` to `ScoreboardDataModel`
  - Computed once per refresh cycle: `isReplay() ? getReplayObservedPlayer() : GetLocalPlayer()`
  - All renderers read `data.effectiveLocal` instead of computing it independently
  - On POV swap, refresh `effectiveLocal` and re-render

---

## Phase 6: Cleanup

- [x] **6.1** Delete old board files _(dead code — no imports from active code, safe to delete)_

  - `src/app/scoreboard/standard-board.ts`
  - `src/app/scoreboard/observer-board.ts`
  - `src/app/scoreboard/team-board.ts`
  - `src/app/scoreboard/session-board.ts`
  - `src/app/scoreboard/scoreboard.ts` (replaced by `scoreboard-renderer.ts`)

- [x] **6.2** Update all imports across the codebase

  - All consumers of `ScoreboardManager` should not need changes (public API stays the same)
  - Remove any dangling imports to deleted files

- [x] **6.3** Verify compilation with `npm run test`

---

## Conclusions

### Bugs Found & Fixed

1. **Observer board shown to players** (pre-existing bug) — `toggleVisibility(true)` called `setVisibility(true)` on both standard and observer boards for all clients. In WC3, the last board set to visible wins, so the observer board (with the Gold column) appeared for players when an observer was present. Fixed by making `toggleVisibility(true)` respect per-client board assignment via `GetLocalPlayer()`.

2. **Income column not updating on POV switch** — `renderPartial()` in `PlayerRenderer` and `TeamRenderer` skipped the income column. Switching perspective in replay left stale TANGERINE/WHITE coloring on income values. Fixed by including income updates in both `renderPartial()` methods.

3. **Team and player re-sorting on every tick** — `refreshValues()` called `buildTeamRows()` which fully re-sorted teams and members within teams. The original code only sorted on `updateFull()` (once per turn), not `updatePartial()` (every tick). Fixed by introducing `refreshTeamValues()` that updates data in-place without re-sorting.

4. **Replay POV not checked during countdown** — `checkReplayPovBoardSwap()` only ran inside `updateFull()`/`updatePartial()`, which are not called during the countdown state. Switching perspective during countdown had no effect. Fixed by adding a lightweight `updateReplayPov()` method and calling it from the countdown timer.

### Performance

| Operation | Before | After |
|---|---|---|
| `updateFull()` (per turn) | Each board independently reads ActivePlayer fields, sorts, and renders. With observer: 3× data reads, 3× sorts | 1× data read into `PlayerRow[]`, 1× sort. Renderers consume cached data |
| `updatePartial()` (per tick) | Each board independently reads ActivePlayer fields and renders | 1× data read (no sort) via `refreshValues()`. Renderers consume cached data |
| `effectiveLocal` | Each board computes `isReplay() ? getReplayObservedPlayer() : GetLocalPlayer()` independently, sometimes multiple times per render | Computed once per refresh cycle in the data model |
| Team totals | `TeamBoard` and `ObserverBoard` each call `team.getIncome()`, `team.getCities()`, etc. independently | Read once in `buildTeamRows()` / `refreshTeamValues()` |
