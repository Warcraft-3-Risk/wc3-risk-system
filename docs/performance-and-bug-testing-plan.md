# Performance & Bug Testing Plan

This document covers testing strategies for three known bugs involving FPS drops,
orphaned minimap icons at ports, and guard-priority issues with shared slots. It also
documents a new investigation into the **shared-slot allocation lag spike**.

---

## Performance Overview of Recent Changes

| Area | Before | After | Impact |
|------|--------|-------|--------|
| Test framework | 0 tests (broken `npm test` pointed at game launcher) | 258 tests across 13 files (Vitest) | Enables regression testing |
| CI | None | Format, lint, strict null checks, tests on every PR | Catches regressions pre-merge |
| Pure logic modules | 0 extracted | 7 modules: victory, income, distribution, guard-priority, icon-lifecycle, scoreboard-sort, rating-calculator | Testable without WC3 engine |
| Error boundaries | Uncaught exceptions in event handlers crashed game | try/catch per handler in EventEmitter | Fault isolation |
| Config validation | None (silent failures) | Build-time JSON schema validation | Early detection of misconfigs |
| Scoreboard sorting | Inline in `scoreboard-data-model.ts` | Extracted to `scoreboard-sort-logic.ts` (27 tests) | Verifiable sort order |
| Guard priority | Inline in `unit-comparisons.ts` | Extracted to `guard-priority-logic.ts` (28 tests) | Verifiable guard selection |
| Icon lifecycle | Inline in `minimap-icon-manager.ts` / `transport-manager.ts` | Extracted to `icon-lifecycle-logic.ts` (26 tests) | Verifiable tracking validity |

---

## Bug 1: FPS Drops Late Game

### Status: Tested via scoreboard sort logic + allocation stress tests

**Scoreboard sorting** is already extracted and tested with 27 tests in
`scoreboard-sort-logic.test.ts`, including a 24-player stress test.

### New Focus: Shared Slot Allocation Lag Spike

**Symptom:** When a 23-player game drops to ≤11 active players, the end-of-turn
triggers `evaluateAndRedistribute()`. The resulting `redistributeExistingUnits()`
call processes potentially hundreds of units across multiple shared slots, calling
`untrackUnit → SetUnitOwner → trackUnit` per unit. This causes a noticeable lag spike.

**What we can test:**

| Test | Description | Purpose |
|------|-------------|---------|
| Slot calculation correctness | Given N active + M eliminated players, verify slot distribution | Ensure algorithm is correct |
| Unit distribution math | Given K units across S slots, verify even spread calculation | Prevent off-by-one errors |
| Ownership change count | Count how many `SetUnitOwner` calls occur for given inputs | Quantify the cost — optimize to skip no-ops |
| No-op optimization | Units already on the correct slot should NOT be re-assigned | Reduce wasted API calls |
| Large-scale simulation | 23→11 player transition with 200+ units | Stress test the algorithm |

### Extracted Pure Logic: `shared-slot-allocation-logic.ts`

```typescript
interface SlotState { slotId: number; unitCount: number; }
interface UnitPlacement { unitId: number; currentSlotId: number; }
interface RedistributionPlan { unitId: number; fromSlotId: number; toSlotId: number; }

function calculateSlotDistribution(totalSlots: number, activePlayers: number): number
function planUnitRedistribution(units: UnitPlacement[], targetSlots: SlotState[]): RedistributionPlan[]
function countOwnershipChanges(plan: RedistributionPlan[]): number
```

### Potential Optimizations (discovered via tests)

1. **Skip no-op transfers**: If a unit is already on its target slot, skip it
2. **Batch transfers**: Group units by target slot to reduce iteration
3. **Defer tracking**: Untrack all → batch SetUnitOwner → retrack all (instead of per-unit)

---

## Bug 2: Minimap Icons Left at Ports

### Status: Core lifecycle tested (26 tests), extending with transport edge cases

The `icon-lifecycle-logic.ts` already tests:
- `shouldTrackUnit()` — 6 tests covering alive/dead/guard/spawn filtering
- `shouldRetrack()` — 6 tests covering delayed queue safety checks  
- `isUnitDead()` — 6 tests covering death threshold detection
- `expectedPoolSize()` — 8 tests covering frame pool accounting

### New Tests for Transport/Port Edge Cases

| Test | Description | Bug Scenario |
|------|-------------|--------------|
| Rapid load → immediate unload | Unit loads and unloads before delayed queue fires | Icon could be registered twice |
| Unit dies while loaded | Transport destroyed with cargo, unit dies in delay queue | Orphaned icon if not checked |
| Multiple transports at same port | Two transports unload simultaneously | Queue ordering matters |
| Unit transfers between transports | Unit leaves transport A, enters transport B before queue fires | Should NOT retrack |
| Transport destroyed at port | Transport dies while units are in delayed queue | Units may die simultaneously |
| Guard promotion during delay | Unit unloads from transport, becomes guard before re-track | Should skip registration |
| Pool exhaustion during batch unload | Large transport unloads many units when pool is nearly empty | Pool expansion triggers |

### Root Cause Hypothesis

The 0.1s delay between unload event and re-registration creates a window where:
1. Unit unloads at `T₀`
2. Icon frame returned to pool
3. Another unit may grab that same pool frame before re-track fires
4. At `T₀ + 0.1s`, the original unit tries to register — gets a NEW frame
5. If the unit then immediately loads back into a transport, the new frame becomes orphaned

The `shouldRetrack()` safety checks cover most cases, but the **pool frame reuse** during
the delay window is the untested scenario.

---

## Bug 3: Guard Priority Ignores Shared Slots

### Status: Core logic tested (28 tests), extending with cross-owner scenarios

The `guard-priority-logic.ts` already tests:
- `compareByValue()` — 12 tests including shared-slot scenario
- `compareByHealth()` — 6 tests
- `selectBestGuard()` — 10 tests including shared-slot simulation

### The Actual Bug

In `unit-comparisons.ts:19`, the production code does:
```typescript
const playerSettings = PlayerManager.getInstance().players.get(
    SharedSlotManager.getInstance().getOwnerOfUnit(compareUnit)
).options;
```

This looks up **the compare unit's owner's settings** — not the **city owner's settings**.
When units from multiple shared slots compete for guard, each comparison may use different
settings, leading to inconsistent guard selection.

### New Tests for Cross-Owner Guard Selection

| Test | Description | Expected Result |
|------|-------------|-----------------|
| Mixed-owner group, city owner prefers cheap | 3 units from 3 different slots, city owner wants `value=false` | Cheapest unit selected as guard |
| Mixed-owner group, city owner prefers expensive | Same 3 units, city owner wants `value=true` | Most expensive unit selected |
| Tank on shared slot, infantry on main slot | Tank (high value) on slot B, infantry (low value) on slot A | Depends on city owner setting, NOT unit owner |
| All units same owner, different slots | Units spread across 3 shared slots, same logical owner | Should behave identically to single-slot |
| Settings consistency check | All candidates compared with identical settings | Verify no settings lookup varies per candidate |

### Proposed Fix

Pass `cityOwnerSettings` explicitly to the comparison function:

```typescript
// Before (buggy):
guardChoice = CompareUnitByValue(GetEnumUnit(), guardChoice);

// After (fixed):
const citySettings = PlayerManager.getInstance().players.get(city.getOwner()).options;
guardChoice = CompareUnitByValue(GetEnumUnit(), guardChoice, citySettings);
```

The pure `selectBestGuard()` already demonstrates this pattern — it accepts settings
as a parameter rather than looking them up per unit.

---

## Implementation Checklist

- [x] Create markdown plan (this document)
- [x] Extract `shared-slot-allocation-logic.ts` with pure redistribution math
- [x] Write allocation performance tests (slot distribution + unit placement + change counting)
- [x] Extend `icon-lifecycle-logic.test.ts` with transport edge cases
- [x] Extend `guard-priority-logic.test.ts` with cross-owner shared slot scenarios
- [x] Run full test suite
- [x] Run lint
