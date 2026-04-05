# Performance Optimization Plan — Iteration 1

## Context

This iteration focuses on the **remaining unimplemented optimizations** from the original [performance-optimization-plan.md](performance-optimization-plan.md), informed by recent work on shared-slot improvements, the minimap update loop optimization, and the scoreboard refactor.

### What's Already Been Completed

| System | Optimization | Commit |
|---|---|---|
| **Minimap** | Removed city position updates from 0.1s timer | `e0e8e53` |
| **Minimap** | Pre-built `COLOR_TEXTURES[]` lookup table | `e0e8e53` |
| **Minimap** | `setTextureCached()` — skip `BlzFrameSetTexture` when unchanged | `e0e8e53` |
| **Minimap** | Reused `unitsToRemove` array across ticks | `e0e8e53` |
| **Minimap** | Ally color filter poll reduced from 33Hz → 2Hz | `e0e8e53` |
| **Debug** | Inline `DEBUG_PRINTS.master` guard on all high-frequency debug prints | `d1e7827` |
| **Scoreboard** | Refactored to single data model + viewer-aware renderers | `4b9743f` |
| **Scoreboard** | `effectiveLocal` computed once per cycle (was per-board per-player) | `4b9743f` |
| **Scoreboard** | `refreshValues()` skips re-sorting (values only, no sort) | `4b9743f` |
| **Shared Slots** | Multi-slot distribution (all 5 phases) | Multiple |
| **Shared Slots** | Elimination debuff (replaces instant neutralization) | `146e0d2` |
| **Shared Slots** | FFA-only guard — skip team alliances in FFA mode | `abb34a6` |
| **Shared Slots** | Removed `originalOwnerMap` and `neutralizePlayerUnits()` | `146e0d2` |

### Remaining Bottlenecks (Ranked by Impact)

1. **Spawner `step()` per-unit overhead** — `matchPlayers.find()` O(n) scan runs for every spawned unit; `GetUnitRallyPoint()` creates + destroys a handle per unit
2. **Spawner `onDeath()` — O(n) `indexOf` + `splice`** on spawn arrays with hundreds of units
3. **TooltipManager 50Hz poll** — `BlzGetMouseFocusUnit()` + `World2Screen()` every 20ms, far more frequent than needed
4. **Game loop double `onEndTurn()`** — edge case where `onEndTurn` can fire twice in the same timer callback

---

## Execution Tasks

### Task 1: Cache `matchPlayers.find()` Result per Spawner Step (Medium Impact, Low Risk)

**File:** [src/app/spawner/spawner.ts](../../src/app/spawner/spawner.ts#L88)

The `matchPlayers.find(x => x.getPlayer() == this.getOwner())` linear scan runs once per spawned unit inside the loop, but the result is the same for all units in a single `step()` call (same owner). Hoist it before the loop.

```typescript
// BEFORE (inside loop, runs per unit):
GlobalGameData.matchPlayers.find((x) => x.getPlayer() == this.getOwner()).trackedData.units.add(u);

// AFTER (outside loop, runs once):
const ownerMatchPlayer = GlobalGameData.matchPlayers.find((x) => x.getPlayer() == this.getOwner());
// ... inside loop:
ownerMatchPlayer?.trackedData.units.add(u);
```

**Savings:** Reduces O(n × amount) to O(n + amount) per spawner per step, where n = number of match players and amount = units spawned.

- [x] **1.1** — Hoist `matchPlayers.find()` before the spawn loop and cache the rally point `location` handle

---

### Task 2: Cache Rally Point per Spawner Step (Medium Impact, Low Risk)

**File:** [src/app/spawner/spawner.ts](../../src/app/spawner/spawner.ts#L84)

`GetUnitRallyPoint()` creates a new `location` handle each call. All units from one spawner use the same rally point. Get it once before the loop and destroy once after.

```typescript
// BEFORE (inside loop):
let loc: location = GetUnitRallyPoint(this.unit);
// ... IssuePointOrderLoc(u, 'attack', loc);
// ... RemoveLocation(loc);

// AFTER (outside loop):
const rallyLoc = GetUnitRallyPoint(this.unit);
for (let i = 0; i < amount; i++) {
    // ... IssuePointOrderLoc(u, 'attack', rallyLoc);
}
if (rallyLoc != null) RemoveLocation(rallyLoc);
```

**Savings:** Reduces handle creation/destruction from O(amount) to O(1) per spawner per step.

- [x] **2.1** — Move `GetUnitRallyPoint` and `RemoveLocation` outside the spawn loop

---

### Task 3: Replace `indexOf` + `splice` with `Set` in Spawn Tracking (Medium Impact, Low Risk)

**File:** [src/app/spawner/spawner.ts](../../src/app/spawner/spawner.ts#L140)

The `spawnMap` uses `Map<player, unit[]>` where `onDeath()` calls `indexOf(unit)` + `splice(index, 1)` — both O(n) operations. With hundreds of units per player, this means hundreds of array shifts per death.

Changing to `Map<player, Set<unit>>` makes both add and delete O(1), and `.size` replaces `.length` for count checks.

```typescript
// BEFORE:
private spawnMap: Map<player, unit[]>;
// onDeath: indexOf + splice
// step: .push(u), .length

// AFTER:
private spawnMap: Map<player, Set<unit>>;
// onDeath: .delete(unit)
// step: .add(u), .size
```

**Savings:** Eliminates O(n) linear scan + O(n) array shift per unit death. With hundreds of deaths per game, this is significant.

- [x] **3.1** — Convert `spawnMap` from `Map<player, unit[]>` to `Map<player, Set<unit>>`
- [x] **3.2** — Update all call sites: `push` → `add`, `length` → `size`, `indexOf`+`splice` → `delete`, `[]` → `new Set()`

---

### Task 4: Reduce TooltipManager Poll Frequency (Low Impact, Low Risk)

**File:** [src/app/managers/tooltip-manager.ts](../../src/app/managers/tooltip-manager.ts#L47)

The tooltip hover timer fires every **0.02s (50Hz)**. The tooltip only needs to:
- Detect focus unit changes — `BlzGetMouseFocusUnit()` doesn't need 50Hz; 20Hz (0.05s) is sufficient for hover detection
- Track position of visible tooltip — this does benefit from higher frequency for smooth following, but 30Hz (0.033s) is adequate given the minimap itself only updates at 10Hz

Change from 0.02s to 0.04s (25Hz). This halves the timer overhead while remaining responsive for hover interactions.

- [x] **4.1** — Change `TooltipManager` timer interval from `0.02` to `0.04`

---

### Task 5: Fix Game Loop Double `onEndTurn` Edge Case (Low Impact, Low Risk)

**File:** [src/app/game/game-mode/base-game-mode/game-loop-state.ts](../../src/app/game/game-mode/base-game-mode/game-loop-state.ts)

The game loop timer has a structural issue where `onEndTurn(turn)` can fire redundantly. After `onTick()` runs, there's a `if (tickCounter <= 0) onEndTurn()` check before the decrement. Since `tickCounter` is initialized to `TURN_DURATION_IN_SECONDS` (60) and always reset to 60 at turn boundaries, this condition is unreachable dead code — `tickCounter` is always ≥ 1 when entering the callback. The second `if (tickCounter <= 0)` block after the decrement already handles the turn boundary correctly (end turn, reset counter, increment turn, start next turn).

Removing the dead code simplifies the game loop logic and eliminates a potential double `onEndTurn` if `tickCounter` were ever externally set to 0.

- [x] **5.1** — Remove the unreachable first `onEndTurn` check before the decrement

---

## Priority Summary

| Task | Optimization | Impact | Risk |
|------|---|---|---|
| 1.1 | Cache `matchPlayers.find()` per step | Medium | Low |
| 2.1 | Cache rally point per step | Medium | Low |
| 3.1–3.2 | `spawnMap` array → Set | Medium | Low |
| 4.1 | Reduce tooltip poll 50Hz → 25Hz | Low | Low |
| 5.1 | Fix double `onEndTurn` | Low | Low |
