# Bug Testing Plan: FPS, Minimap Icons, Guard Priority

This document outlines how we can test and diagnose three known bugs by extracting pure logic from the codebase and writing targeted unit tests.

---

## Bug 1: FPS Drops Late Game

**Symptom:** FPS drops significantly in late-game scenarios. UI frame updates are a likely contributor.

**Root Cause Hypothesis:** The scoreboard `updatePartial()` runs every game tick, calling `buildPlayerRow()` which creates new objects and performs lookups per player per tick. In late game with many eliminated players and rating calculations, this becomes expensive.

### Testable Pure Logic

| Component | File | What to Extract |
|-----------|------|-----------------|
| Player sorting | `scoreboard-data-model.ts:74-87` | Sort algorithm: active > eliminated, by income desc, tie-break by player ID |
| Team sorting | `scoreboard-data-model.ts:208-212` | Sort by team income desc, tie-break by team number |
| Combat detection | `scoreboard-data-model.ts:150-151` | `isInCombat = gameTime > 15 && gameTime - lastCombat <= 15` |
| City count highlight | `scoreboard-data-model.ts:199` | `cities >= requiredCities` |

### Tests to Write

1. **Player sort order**: Given a mix of active/eliminated players with various incomes, verify correct sort order
2. **Eliminated player tiebreaker**: Players eliminated in different turns sort by most-recently-eliminated first
3. **Team sort**: Teams sorted by total income descending
4. **Combat detection**: Edge cases at exactly 15 seconds, 0 seconds, boundaries
5. **Allocation stress test**: Verify sort stability with large player counts (24 players)

### Potential Fix Directions

- Throttle `updatePartial()` to every N ticks instead of every tick
- Cache `buildPlayerRow()` values and only rebuild on change events
- Skip rendering for non-visible multiboard items

---

## Bug 2: Minimap Icons Left at Ports

**Symptom:** Minimap icons remain at port locations without associated units, likely after transport load/unload sequences.

**Root Cause Hypothesis:** Race condition in the transport unit lifecycle — when a unit loads into a transport, `unregisterTrackedUnit()` returns the frame to the pool. But if the unit dies during the delayed track queue processing, or becomes a guard during the delay, the frame may not be properly cleaned up. Also, the `processDelayedTrackQueue()` runs on a 0.1s timer that may fire before or after guard assignment.

### Testable Pure Logic

| Component | File | What to Extract |
|-----------|------|-----------------|
| Unit tracking validity | `minimap-icon-manager.ts:165-187` | `registerIfValid()` filter: alive, SPAWN type, not GUARD, not already tracked |
| Delayed track queue filter | `transport-manager.ts:156-167` | Skip dead, guard, or reloaded units |
| Dead unit detection | `minimap-icon-manager.ts:392` | `typeId === 0 \|\| hp <= 0.405` |
| Frame pool lifecycle | `minimap-icon-manager.ts` | Register → unregister → pool recycling consistency |

### Tests to Write

1. **registerIfValid filtering**: Verify units must be alive, SPAWN type, not GUARD, and not duplicate-tracked
2. **Delayed track queue**: Units that die, become guards, or reload during delay are skipped
3. **Frame pool accounting**: After register + unregister cycle, pool count returns to original
4. **Load/unload lifecycle**: Complete transport lifecycle tracks and untracks correctly
5. **Guard transition during transport**: Unit becomes guard while in delayed queue — verify no orphan icon
6. **Double unregister safety**: Calling unregister twice doesn't corrupt pool

### Potential Fix Directions

- Add frame cleanup sweep on turn boundaries
- Verify frame accounting matches tracked unit count as an invariant check
- Add explicit state tracking to prevent double-register/unregister

---

## Bug 3: Guard Priority Ignores Shared Slots

**Symptom:** Unit priority for guard selection is incorrect when units span shared slots. Tanks are incorrectly prioritized as guards even though they shouldn't be, because `CompareUnitByValue()` looks up settings from the unit's slot owner rather than the logical player.

**Root Cause Hypothesis:** In `CompareUnitByValue()`, player settings are retrieved via `SharedSlotManager.getOwnerOfUnit(compareUnit)`. For shared-slot units, this returns the logical owner, but `ReplaceGuard()` uses `CompareUnitByValue(GetEnumUnit(), guardChoice)` where units from different shared slots may have different logical owners. The settings lookup should use the **city owner's** settings (since it's the city owner's guard priority that matters), not the unit owner's settings.

### Testable Pure Logic

| Component | File | What to Extract |
|-----------|------|-----------------|
| `CompareUnitByValue` | `unit-comparisons.ts:12-34` | Unit comparison by point value + player settings |
| `CompareUnitByHealth` | `unit-comparisons.ts:44-59` | Health-based tiebreaker |
| Guard selection algorithm | `replace-guard.ts:7-22` | Iterate group → pick best by CompareUnitByValue |
| Kill handler dispatch | `handle-guard-death.ts:9-28` | Sequential handler chain: self → allied → enemy → invalid |
| Enemy search priority | `enemy-kill-handler.ts:7-55` | 3-step radius search with escalating distance |

### Tests to Write

1. **CompareUnitByValue — maximize mode**: Higher value unit selected when `settings.value = true`
2. **CompareUnitByValue — minimize mode**: Lower value unit selected when `settings.value = false`
3. **CompareUnitByHealth tiebreaker**: When values equal, health preference applies
4. **Null handling**: One or both units null → correct fallback
5. **Same unit**: Returns initial when both are the same reference
6. **Guard selection from group**: Best unit according to settings is selected from a group of candidates
7. **Shared slot scenario**: Units owned by different shared slots but same logical player — settings should come from city owner
8. **Kill handler dispatch order**: Self handler tried first, then allied, then enemy, then invalid
9. **Enemy search escalation**: Small radius first, then large radius, then small around killer

### Proposed Fix

Change `CompareUnitByValue()` to accept an explicit `settingsOwner: player` parameter (the city owner), rather than looking up settings from the unit's `getOwnerOfUnit()`. This ensures all candidates are compared using the same player's guard priority preferences.

---

## Implementation Approach

### Phase 1: Extract Pure Logic

Extract comparison and sorting functions that take plain data inputs (no WC3 globals) and return plain data outputs:

- **`guard-priority-logic.ts`**: Pure `compareByValue()`, `compareByHealth()`, `selectBestGuard()`
- **`scoreboard-sort-logic.ts`**: Pure `sortPlayers()`, `sortTeams()`, `isInCombat()`
- **`icon-lifecycle-logic.ts`**: Pure `shouldTrackUnit()`, `shouldRetrack()`, `isUnitDead()`

### Phase 2: Write Tests

Each extracted module gets comprehensive tests with edge cases and shared-slot scenarios.

### Phase 3: Wire Extracted Logic Back

Replace inline logic in production code with calls to the extracted pure functions, maintaining backward compatibility.
