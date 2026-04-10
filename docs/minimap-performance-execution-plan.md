# Minimap Performance Execution Plan

## Context

This plan addresses the performance issues identified in `docs/minimap-performance-spike.md`.
Each step extracts testable pure logic, adds tests to validate the problem and the fix, and
checks the item off once verified.

---

## Step 1: Frame Pool Logic — Unbounded Growth & Leak Detection

**Problem:** The frame pool in `MinimapIconManager` only grows (`expandPool`) and never
shrinks. Pool expansions (200 frames) run synchronously in the game thread, causing lag
spikes. There is no cap, no high-water-mark tracking, and no frame-leak detection.

**Extract:** `src/app/utils/minimap-frame-pool-logic.ts`

Pure functions:

| Function | Purpose |
|----------|---------|
| `shouldExpandPool(poolSize, needed)` | Returns true only when pool is exhausted |
| `calculateExpansionSize(currentTotal, batchSize, maxCap)` | Caps expansion at max, returns 0 if at cap |
| `trackHighWaterMark(currentTracked, previousHigh)` | Returns `max(currentTracked, previousHigh)` |
| `detectFrameLeak(poolSize, trackedCount, totalCreated)` | Returns leaked count: `totalCreated - poolSize - trackedCount` |
| `shouldShrinkPool(poolSize, trackedCount, minPoolSize)` | Returns excess frames to release |

**Tests:** `tests/minimap-frame-pool-logic.test.ts`

- [x] Pool expansion only triggers when pool hits 0
- [x] Expansion capped at MAX_POOL_SIZE (e.g., 3000)
- [x] Expansion returns 0 when already at cap
- [x] High-water mark tracking across combat spikes
- [x] Frame leak detection: positive when frames unaccounted for
- [x] Frame leak detection: zero in healthy state
- [x] Pool shrink suggestion: excess frames above threshold
- [x] Pool shrink: never suggests shrinking below minimum
- [x] Simulated 5-minute combat: pool growth stays bounded
- [x] Rapid expand/contract cycles don't exceed cap

---

## Step 2: Update Loop Cost Estimation & Dirty-Flag Optimization

**Problem:** `updateAllIcons()` runs every 0.1s and processes ALL cities (200) + ALL tracked
units (up to 1,000+) every tick. City colors rarely change but are recomputed each tick,
generating ~10,000 unnecessary native calls/second.

**Extract:** `src/app/utils/minimap-update-loop-logic.ts`

Pure functions:

| Function | Purpose |
|----------|---------|
| `estimateNativeCallsPerTick(cityCount, unitCount)` | Returns estimated native calls per update tick |
| `estimateCallsPerSecond(callsPerTick, ticksPerSecond)` | Total calls per second |
| `shouldUpdateCityColor(currentOwner, lastOwner, allyModeChanged, fogChanged)` | Dirty-flag: true only when state changed |
| `estimateSavingsWithDirtyFlag(cityCount, dirtyCount, ticksPerSecond)` | How many calls saved per second by dirty-flagging |
| `suggestUpdateFrequency(trackedUnitCount, targetBudget)` | Returns optimal tick interval for budget |

**Tests:** `tests/minimap-update-loop-logic.test.ts`

- [x] 200 cities + 600 units → ~5,800 calls/tick
- [x] At 10 ticks/second → ~58,000 calls/second
- [x] 200 cities + 1,000 units → ~9,000 calls/tick → ~90,000/sec
- [x] Dirty-flag: no change → skip → saves ~1,000 calls/tick for 200 cities
- [x] Dirty-flag: 10 of 200 cities changed → only 10 updated, rest skipped
- [x] Dirty-flag: ally mode toggle → all cities flagged dirty
- [x] Suggested frequency with 1,000 units: longer than 0.1s
- [x] With 200 units: 0.1s stays feasible within budget
- [x] Zero tracked units: only city cost remains

---

## Step 3: Transport Double-Registration Frame Leak

**Problem:** `processDelayedTrackQueue()` in `TransportManager` calls both
`UnitLagManager.trackUnit()` AND `MinimapIconManager.registerIfValid()` for the same unit.
`trackUnit()` calls `registerTrackedUnit()` unconditionally — if the unit was already tracked
by another code path during the 0.1s delay, the old frame is overwritten and leaked.

**Extend:** `src/app/utils/icon-lifecycle-logic.ts`

New pure functions:

| Function | Purpose |
|----------|---------|
| `wouldDoubleRegister(isAlreadyTracked)` | Returns true if calling register would leak a frame |
| `countLeakedFrames(registerCalls, unregisterCalls, currentTracked)` | Detects cumulative leaks |
| `simulateTransportQueueProcessing(queuedUnits)` | Models the delayed queue drain with leak detection |

**Tests added to:** `tests/icon-lifecycle-logic.test.ts`

- [x] `wouldDoubleRegister`: true when unit already tracked
- [x] `wouldDoubleRegister`: false when unit not yet tracked
- [x] Double-register leaks exactly 1 frame per occurrence
- [x] 10 rapid load/unload cycles: accumulates 0 leaks when guarded
- [x] 10 rapid cycles without guard: leaks 10 frames
- [x] `simulateTransportQueueProcessing`: detects leaked frames from overlapping track calls
- [x] Mixed queue: some alive, some dead, some reloaded — only valid units tracked, no leaks
- [x] Queue processes same unit twice in same tick — second call is no-op with guard

---

## Step 4: Redistribution Cascade Cost

**Problem:** Already modeled in `shared-slot-allocation-logic.ts`, but the minimap cost
(untrack/retrack per move) is not yet quantified.

**Extend:** `src/app/utils/shared-slot-allocation-logic.ts`

New pure function:

| Function | Purpose |
|----------|---------|
| `estimateMinimapCostOfRedistribution(plan)` | Each move = 1 untrack + 1 retrack = ~4 frame ops |

**Tests added to:** `tests/shared-slot-allocation-logic.test.ts`

- [x] 7 moves → 28 frame operations (4 per move)
- [x] 110 moves (23→11 scenario) → 440 frame operations
- [x] Zero moves → zero frame operations
- [x] Incremental slot addition: 0 minimap cost

---

## Validation

- [x] All new tests pass (`npm test`)
- [x] Lint clean (`npm run lint`)
- [x] Existing 319 tests unaffected
