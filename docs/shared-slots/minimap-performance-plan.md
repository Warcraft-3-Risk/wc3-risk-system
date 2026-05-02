# Minimap and Shared Slots Performance Execution Plan

## Objective

Reduce FPS drops in high-unit-count games caused by the interaction between shared-slot ownership, unit minimap tracking, and periodic custom minimap frame updates.

The critical path is `MinimapIconManager.updateAllIcons()`, which runs every `0.2` seconds and can touch every city plus every tracked moving unit. In a late 23-player FFA this can mean thousands of units, thousands of WC3 native calls, and repeated Lua table/closure allocation through TypeScript-to-Lua (TSTL) helpers.

This plan prioritizes changes that reduce per-tick allocation and native-call volume while preserving multiplayer determinism, replay POV behavior, fog-of-war behavior, and shared-slot ownership semantics.

## Current Complexity and Transpilation Cost

### Runtime complexity

Current `updateAllIcons()` is:

```text
O(C + U + D)
```

Where:

- `C` is the number of city icons.
- `U` is the number of tracked unit icons.
- `D` is the number of dead or removed tracked units cleaned up that tick.

The complexity is linear, which is acceptable in shape, but the constant factor is high because each visible tracked unit does several WC3 native calls:

- `GetUnitTypeId`
- `GetWidgetLife`
- `IsUnitVisible`
- `GetUnitX`
- `GetUnitY`
- `BlzFrameSetAbsPoint`
- `GetOwningPlayer` through `SharedSlotManager.getOwnerOfUnit`
- `GetAllyColorFilterState`, player option lookups, alliance checks, and maybe `BlzFrameSetTexture`

At `0.2` seconds per tick, the loop runs 5 times per second. A rough budget estimate is:

```text
200 cities + 2,000 tracked units
= roughly 17,000 native-ish calls per tick
= roughly 85,000 native-ish calls per second
```

That is before GC effects, frame pool churn, debug printing, or other periodic systems.

### TSTL cost

The current hot loop uses `Map.forEach()`:

```typescript
this.trackedUnits.forEach((iconFrame, unit) => {
	// hot path
});
```

The bundled Lua library implements `Map.prototype.forEach` by iterating keys through `__TS__Iterator(...)` and invoking the callback for every element. This adds:

- a callback closure created by the surrounding TypeScript method call,
- per-element iterator helper work,
- per-element callback calls,
- Lua table allocations from iterator result objects.

Important correction: replacing `Map.forEach()` with `for (const [unit, frame] of this.trackedUnits)` is not enough for the hottest loop. In this TSTL runtime, `Map.entries()` produces entry/result tables during iteration, so `for...of Map` can still allocate per element. It is still cleaner than callback-style iteration in many places, but the tracked-unit loop should avoid Map iteration entirely.

For the hottest path, prefer dense TypeScript arrays plus a lookup map:

```typescript
private trackedUnitList: unit[] = [];
private trackedFrameList: framehandle[] = [];
private trackedUnitIndex: Map<unit, number> = new Map();
```

Then update with numeric loops:

```typescript
for (let i = 0; i < this.trackedUnitList.length; i++) {
	const unit = this.trackedUnitList[i];
	const frame = this.trackedFrameList[i];
	// hot path
}
```

TSTL compiles numeric array loops much closer to direct Lua table indexing and avoids callback dispatch and Map iterator entry allocation.

## Bottlenecks

### 1. `MinimapIconManager.updateAllIcons()`

Current issues:

- `this.cityIcons.forEach(...)` runs every minimap tick.
- `this.trackedUnits.forEach(...)` runs every minimap tick and scales with unit count.
- `this.unitsToRemove.forEach(...)` runs cleanup through another callback.
- `updateIconPosition()` calls `worldToMinimapCoords()`, which allocates a `{ x, y }` object for every visible tracked unit.
- `updateIconPosition()` recomputes HUD/minimap scale constants for every visible tracked unit.
- `updateUnitIconColor()` recomputes color context for every visible tracked unit.
- `SharedSlotManager.getInstance()` is reached inside unit color resolution.

### 2. Unit registration lifecycle

`MinimapIconManager.registerIfValid()` checks whether a unit is already tracked before registering. `registerTrackedUnit()` does not. Several callers reach `registerTrackedUnit()` through `UnitLagManager.trackUnit()`, so duplicate registration can overwrite the old frame in the map and leak the old frame from the pool.

Existing pure tests already document this risk in:

- `src/app/utils/icon-lifecycle-logic.ts`
- `tests/icon-lifecycle-logic.test.ts`
- `src/app/utils/minimap-frame-pool-logic.ts`
- `tests/minimap-frame-pool-logic.test.ts`

The production code should make registration idempotent, not just document the invariant.

### 3. Transport delayed tracking

`TransportManager.processDelayedTrackQueue()` runs every `0.1` seconds and currently uses `.forEach(...)`. More importantly, it calls both:

- `UnitLagManager.getInstance().trackUnit(unit)`
- `MinimapIconManager.getInstance().registerIfValid(unit)`

That combination is hard to reason about because one path can register shared-slot/transports directly and the other path can register valid spawn units. The final implementation should centralize registration so a unit has one canonical minimap tracking entry point.

### 4. Color and owner recomputation

Most unit icons do not change color every `0.2` seconds. Recomputing color for every visible tracked unit is wasteful when:

- local POV has not changed,
- ally color mode has not changed,
- colorblind/contrast settings have not changed,
- the raw unit owner has not changed,
- shared-slot ownership mappings have not changed,
- the cached texture already matches.

The current `setTextureCached()` prevents redundant `BlzFrameSetTexture`, which is good. The next step is avoiding most of the color-decision work too.

### 5. Broader periodic callback use

The minimap loop is the primary target. After it is fixed, audit other repeated timers and unbounded unit loops. Do not spend time rewriting one-shot setup code before the actual hot paths are measured.

Highest-priority follow-up areas:

- `src/app/managers/transport-manager.ts`
- `src/app/managers/minimap-icon-manager.ts` ally mode correction timer
- unit/color filter loops that can touch all tracked units
- shared-slot redistribution paths that may run during death bursts

## Phase 0: Benchmark Before Changing Behavior

Goal: capture a baseline inside Warcraft III before changing the hot path.

Do not rely only on Vitest or JavaScript runtime timing. The problem includes WC3 native calls, frame handles, Lua GC, and TSTL output.

### Add temporary benchmark hooks

Add debug-only instrumentation to `MinimapIconManager`:

```typescript
interface MinimapTickSample {
	trackedUnits: number;
	cityIcons: number;
	visibleUnits: number;
	deadUnits: number;
	poolSize: number;
	elapsedMs: number;
}
```

Add a temporary public debug method gated by debug settings:

```typescript
public debugRunUpdateAllIconsForBenchmark(): MinimapTickSample {
	const start = os.clock();
	const sample = this.updateAllIconsWithSample();
	sample.elapsedMs = (os.clock() - start) * 1000;
	return sample;
}
```

Do not keep `as any` access to private methods in production code. A temporary debug wrapper is easier to grep and remove.

### Add a chat command

Use `ChatManager` rather than a separate ad hoc chat trigger:

```typescript
ChatManager.getInstance().addCmd(['-benchminimap'], () => {
	runMinimapBenchmark();
});
```

Keep the benchmark command out of release builds or guard it behind a debug flag.

### Benchmark script shape

The benchmark should:

1. Spawn units before the measured phase.
2. Register units before the measured phase.
3. Warm up at least 10 ticks before recording.
4. Record at least 300 samples.
5. Avoid printing inside each measured tick.
6. Report min, average, p95, max, tracked count, visible count, dead cleanup count, pool size, and total frames created.
7. Clean up spawned units and unregister/destroy frames afterward.

Example skeleton:

```typescript
export function runMinimapBenchmark(): void {
	const owner = Player(23);
	const unitType = FourCC('hpea');
	const units: unit[] = [];
	const manager = MinimapIconManager.getInstance();
	const unitCount = 2000;
	const warmupTicks = 10;
	const measuredTicks = 300;
	const samples: number[] = [];

	for (let i = 0; i < unitCount; i++) {
		const u = CreateUnit(owner, unitType, 0, 0, 0);
		UnitAddType(u, UNIT_TYPE.SPAWN);
		manager.registerTrackedUnit(u);
		units.push(u);
	}

	for (let i = 0; i < warmupTicks; i++) {
		manager.debugRunUpdateAllIconsForBenchmark();
	}

	for (let i = 0; i < measuredTicks; i++) {
		const sample = manager.debugRunUpdateAllIconsForBenchmark();
		samples.push(sample.elapsedMs);
	}

	samples.sort((a, b) => a - b);
	const min = samples[0];
	const max = samples[samples.length - 1];
	const p95 = samples[Math.floor(samples.length * 0.95)];
	let total = 0;
	for (let i = 0; i < samples.length; i++) total += samples[i];
	const avg = total / samples.length;

	print(`[MinimapBench] units=${unitCount} min=${min} avg=${avg} p95=${p95} max=${max}`);

	for (let i = 0; i < units.length; i++) {
		manager.unregisterTrackedUnit(units[i]);
		RemoveUnit(units[i]);
	}
}
```

This benchmark intentionally allocates arrays and sorts samples, but only outside the production hot loop.

### Required scenarios

Run the benchmark with:

- 200 cities, 0 tracked units.
- 200 cities, 500 tracked units.
- 200 cities, 1,000 tracked units.
- 200 cities, 2,000 tracked units.
- 200 cities, 3,000 tracked units if the map can tolerate it.
- mostly visible units.
- mostly fogged units.
- a color mode toggle during the run.
- replay POV if practical.
- a transport load/unload cycle benchmark to validate frame pool accounting.

### Baseline output to capture in docs

**Run 1 (Baseline - Map.forEach)**:

```text
Build: Local Dev
Map: Europe
Scenario: 2000 spawned units (hpea) at player 23
Tracked units: ~2000
Cities: ~200
Tick interval: 0.2s
Samples: 300 measured ticks per run
min/avg/p95/max (ms):
  - Run 1: 7.00 / 12.02 / 17.00 / 24.00
  - Run 2: 8.00 / 10.99 / 17.00 / 21.00
  - Run 3: 8.00 / 11.30 / 17.00 / 21.00
  - Run 4: 9.00 / 13.50 / 17.01 / 22.00
Notes: Original TSTL `.forEach()` Map structure. Significant overhead. 17-24ms max is noticeably heavy given the 0.2s interval. Target is < 2ms.
```

**Run 2 (Phase 1 & 2 - Array Tracking)**:

```text
Build: Local Dev
Map: Europe
Scenario: 2000 spawned units (hpea) at player 23
Tracked units: ~2000
Cities: ~200
Tick interval: 0.2s
Samples: 300 measured ticks per run
min/avg/p95/max (ms):
  - Run 1: 7.00 / 8.36 / 10.00 / 22.00
  - Run 2: 7.00 / 8.49 / 10.00 / 13.00
  - Run 3: 6.99 / 8.55 / 9.99 / 11.00
  - Run 4: 6.99 / 8.57 / 9.99 / 15.99
Notes: P95 dropped from ~17ms to ~10ms (roughly 41% speedup). Good progress, but further to go for the < 2ms target.
```

**Run 3 (Phase 3 - Hoisted Invariants & Removed Allocations)**:

```text
Build: Local Dev
Map: Europe
Scenario: 2000 spawned units (hpea) at player 23
Tracked units: ~2000
Cities: ~200
Tick interval: 0.2s
Samples: 300 measured ticks per run
min/avg/p95/max (ms):
  - Run 1: 5.00 / 7.01 / 9.00 / 12.00
  - Run 2: 5.00 / 7.21 / 10.00 / 14.00
  - Run 3: 6.00 / 7.66 / 11.00 / 13.00
  - Run 4: 6.00 / 7.45 / 10.00 / 12.00
Notes: P95 dropped slightly to 9-11ms, Avg dropped from ~8.5ms to ~7.3ms. Incremental win by removing coordinate object allocations and hoisting resolution logic per-tick.
```

**Run 4 (Phase 4 - Separate Static City Work)**:

```text
Build: Local Dev
Map: Europe
Scenario: 2000 spawned units (hpea) at player 23
Tracked units: ~2000
Cities: ~200
Tick interval: 0.2s
Samples: 300 measured ticks per run
min/avg/p95/max (ms):
  - Run 1: 4.00 / 4.61 / 6.00 / 7.00
  - Run 2: 4.00 / 4.74 / 6.00 / 8.00
  - Run 3: 4.00 / 4.64 / 6.00 / 8.00
  - Run 4: 4.00 / 4.57 / 6.00 / 7.00
Notes: P95 dropped from ~10ms to ~6ms, Avg dropped from ~7.3ms to ~4.6ms. Significant reduction in constant factor by caching state for 200 static cities and skipping update work.
```

Do not choose the final optimization threshold until this baseline exists. Initial target: for 2,000 tracked units, p95 should land under roughly `2ms` and max should not drift upward over several minutes. If the baseline proves that is unrealistic on the target client, set the pass/fail threshold from real measurements.

## Phase 1: Make Minimap Tracking Idempotent

Goal: eliminate frame leaks and duplicate work before rewriting iteration.

### Production changes

Target file:

- `src/app/managers/minimap-icon-manager.ts`

Change `registerTrackedUnit(unit)` so it returns early when the unit already has a frame:

```typescript
public registerTrackedUnit(unit: unit): void {
	if (!this.isActive) return;

	if (this.trackedUnitIndex.has(unit)) {
		return;
	}

	// allocate/reuse frame and register once
}
```

If Phase 2 has not happened yet, use `this.trackedUnits.has(unit)` for the guard.

Target file:

- `src/app/game/services/unit-lag-manager.ts`

Keep `UnitLagManager.trackUnit(unit)` as a safe public entry point. It should be okay for callers to call it more than once for the same unit.

Target file:

- `src/app/managers/transport-manager.ts`

Replace delayed queue `.forEach(...)` with a numeric loop. Keep queue reuse instead of assigning a new array:

```typescript
for (let i = 0; i < TransportManager.delayedTrackQueue.length; i++) {
	const unit = TransportManager.delayedTrackQueue[i];
	// checks and tracking
}
TransportManager.delayedTrackQueue.length = 0;
```

Then decide whether transport unload should call one tracking entry point or two. Prefer one canonical method:

```typescript
MinimapIconManager.getInstance().registerIfValid(unit);
```

or:

```typescript
UnitLagManager.getInstance().trackUnit(unit);
```

Do not keep both unless a test explains the reason. If both must remain temporarily, idempotent registration makes this safe.

### Tests

Extend existing tests or add a small pure utility test to prove:

- registering the same unit twice leaves tracked count unchanged,
- registering the same unit twice leaves pool size unchanged,
- unregistering an untracked unit does not increase pool size,
- delayed transport queue processing does not leak frames when a unit is already tracked.

Run:

```bash
npm test -- tests/icon-lifecycle-logic.test.ts tests/minimap-frame-pool-logic.test.ts
```

## Phase 2: Replace Hot Map Iteration With Array-Backed Tracking

Goal: remove per-unit Map iteration allocation and callback overhead from the `0.2` second unit update loop.

### Data structure

Target file:

- `src/app/managers/minimap-icon-manager.ts`

Replace `trackedUnits: Map<unit, framehandle>` as the iterated structure with:

```typescript
private trackedUnitList: unit[] = [];
private trackedFrameList: framehandle[] = [];
private trackedUnitIndex: Map<unit, number> = new Map();
```

Keep the map only for O(1) lookup by unit. Do not iterate it in the hot loop.

### Register

```typescript
private addTrackedUnit(unit: unit, frame: framehandle): void {
	const index = this.trackedUnitList.length;
	this.trackedUnitList.push(unit);
	this.trackedFrameList.push(frame);
	this.trackedUnitIndex.set(unit, index);
}
```

### Unregister with swap-pop

```typescript
private removeTrackedAt(index: number): framehandle | undefined {
	const lastIndex = this.trackedUnitList.length - 1;
	const unit = this.trackedUnitList[index];
	const frame = this.trackedFrameList[index];

	const lastUnit = this.trackedUnitList[lastIndex];
	const lastFrame = this.trackedFrameList[lastIndex];

	this.trackedUnitList[index] = lastUnit;
	this.trackedFrameList[index] = lastFrame;
	this.trackedUnitIndex.set(lastUnit, index);

	this.trackedUnitList.pop();
	this.trackedFrameList.pop();
	this.trackedUnitIndex.delete(unit);
	this.unitLastTexture.delete(unit);

	return frame;
}
```

Guard the single-element case if needed. The swap-pop operation is O(1), but it changes iteration order. That is acceptable for minimap frames because order is not gameplay state. If ordering is later proven visible, use tombstones and compact outside the hot tick instead.

### Update loop

Iterate by index:

```typescript
let i = 0;
while (i < this.trackedUnitList.length) {
	const unit = this.trackedUnitList[i];
	const iconFrame = this.trackedFrameList[i];

	if (GetUnitTypeId(unit) === 0 || GetWidgetLife(unit) <= 0.405) {
		BlzFrameSetVisible(iconFrame, false);
		const frame = this.removeTrackedAt(i);
		if (frame) this.framePool.push(frame);
		continue;
	}

	// normal visible/fogged update
	i++;
}
```

This removes the `unitsToRemove` array from the hot path entirely.

### Cleanup

Update:

- `unregisterTrackedUnit`
- `destroy`
- `reinitialize`
- debug counters
- frame pool tests

`destroy()` is not a hot path, but it must destroy every frame exactly once.

### Tests

Add pure tests for the array-backed lifecycle:

- register appends unit/frame/index consistently,
- remove middle element swap-pops correctly,
- remove last element works,
- remove only element works,
- unregister missing unit is a no-op,
- cleanup while iterating does not skip the swapped-in unit.

## Phase 3: Remove Per-Unit Allocations and Hoist Loop Invariants

Goal: keep the unit loop O(U), but reduce the per-unit constant cost.

### Position math

Do not call `worldToMinimapCoords()` from the visible unit hot path. It allocates an object. Inline scalar math after hoisting constants:

```typescript
const hudScale = this.hudScale;
const uiLeftEdgeX = 0.4 - (0.8 * hudScale) / 2.0;
const baseXOffset = uiLeftEdgeX + 0.009 * hudScale;
const baseYOffset = 0.004 * hudScale;
const widthScale = this.MINIMAP_WIDTH * hudScale;
const heightScale = this.MINIMAP_HEIGHT * hudScale;
const worldMinX = this.worldMinX;
const worldMinY = this.worldMinY;
const invWorldWidth = 1 / this.worldWidth;
const invWorldHeight = 1 / this.worldHeight;
```

Then per visible unit:

```typescript
const normX = (GetUnitX(unit) - worldMinX) * invWorldWidth;
const normY = (GetUnitY(unit) - worldMinY) * invWorldHeight;
BlzFrameSetAbsPoint(iconFrame, FRAMEPOINT_CENTER, baseXOffset + normX * widthScale, baseYOffset + normY * heightScale);
```

Keep `updateIconPosition()` for setup/static icon code, or add a scalar helper that does not allocate.

### Color context

Resolve these once per tick:

```typescript
const localPlayer = GetLocalPlayer();
const effectiveLocal = isReplay() ? getReplayObservedPlayer() : localPlayer;
const isReplayViewer = isReplay();
const playerManager = PlayerManager.getInstance();
const activeLocalPlayer = playerManager.players.get(effectiveLocal);
const localIsColorBlind = activeLocalPlayer ? activeLocalPlayer.options.colorblind : false;
const localIsColorContrast = activeLocalPlayer ? activeLocalPlayer.options.colorContrast : false;
const allyColorMode = localIsColorContrast ? 2 : GetAllyColorFilterState();
const isFFA = SettingsContext.getInstance().isFFA();
const sharedSlotManager = SharedSlotManager.getInstance();
const nameManager = NameManager.getInstance();
```

Pass scalars/managers into a fast color method rather than resolving them for every unit.

Avoid allocating a new context object every tick unless the readability win is worth it. One object per tick is acceptable if it keeps the implementation much safer; zero objects is better for the final hot path.

### Expected Lua shape

Avoid this shape in the hot loop:

```lua
self.trackedUnits:forEach(function(____, iconFrame, unit)
	-- callback body
end)
```

Prefer a shape closer to:

```lua
local i = 0
while i < #trackedUnitList do
	local unit = trackedUnitList[i + 1]
	local iconFrame = trackedFrameList[i + 1]
	-- body
	i = i + 1
end
```

The exact Lua output will differ, but the important properties are:

- no per-unit callback closure dispatch,
- no per-unit Map entry table,
- no `{ x, y }` coordinate object,
- no cleanup array allocation,
- no singleton lookups inside the inner unit loop.

## Phase 4: Separate Static City Work From Moving Unit Work

Goal: stop paying full city color cost every unit tick when city state has not changed.

Cities are static in position. Their frame position only needs to update when:

- the HUD scale changes,
- the city icon/border is created,
- the map is reinitialized.

Color/visibility still matters, but it can be tracked with cached state.

### City icon records

Consider replacing city map iteration with an array of records:

```typescript
interface CityIconRecord {
	city: City;
	iconFrame: framehandle;
	lastVisible: boolean;
	lastOwner: player | undefined;
	lastColorMode: number;
	lastPovPlayer: player | undefined;
}
```

Keep `cityIcons: Map<City, framehandle>` if other code needs direct lookup, but iterate `cityIconRecords` with a numeric loop.

### Dirty conditions

Update city color only when one of these changes:

- fog visibility changed,
- current owner changed while visible,
- last seen owner changed,
- ally color mode changed,
- colorblind/contrast changed,
- replay POV changed,
- `clearSeenCache()` was called.

Even with dirty flags, `IsUnitVisible(city.barrack.unit, effectiveLocal)` may still be needed to detect fog transitions. The win is avoiding color resolution and texture work for unchanged cities, not necessarily eliminating every city native call.

## Phase 5: Add Shared-Slot Ownership Revisioning

Goal: avoid recalculating resolved owner/color for every unit when shared-slot ownership has not changed.

Target file:

- `src/app/game/services/shared-slot-manager.ts`

Add a monotonically increasing revision counter:

```typescript
private ownershipRevision = 0;

public getOwnershipRevision(): number {
	return this.ownershipRevision;
}

private bumpOwnershipRevision(): void {
	this.ownershipRevision++;
}
```

Increment it when shared-slot ownership mappings change:

- `assignSlotToPlayer`
- `tearDownSlot`
- `reset`
- any direct mutation of `slotToPlayer` or `playerToSlots`

Then `MinimapIconManager` can cache unit icon color decisions until:

- raw owner changes,
- shared-slot ownership revision changes,
- ally color mode/local color settings change,
- POV changes,
- replay state changes.

This is safer than assuming `GetOwningPlayer(unit)` tells the whole story, because shared-slot reassignment can change the resolved owner without changing the raw unit owner.

## Phase 6: Consider Adaptive Update Frequency Only After Measurement

Goal: use throttling as a second-stage fallback, not as the first fix.

If Phase 1 through Phase 5 still leave p95 too high, make the minimap update interval adapt to tracked unit count.

Example policy:

```text
0-500 tracked units: 0.20s
501-1500 tracked units: 0.25s
1501-2500 tracked units: 0.30s
2501+ tracked units: 0.40s
```

Risks:

- icons look less smooth,
- transports/fast units may appear slightly delayed,
- user perception may be worse than a smaller but steadier CPU cost.

Do not ship adaptive frequency without visual testing. Stable p95 at `0.2s` is preferable if the previous phases make it possible.

## Phase 7: Broader Hot-Path Audit

After the minimap loop is improved and benchmarked, audit repeated systems for the same allocation patterns.

Prioritize code that is both periodic and unbounded by small constants:

```bash
rg -n "TimerStart|forEach\\(|\\.map\\(|\\.filter\\(|\\.reduce\\(" src/app
```

Classify each hit:

- Hot and unbounded: rewrite first.
- Hot but bounded by player count: rewrite if easy, otherwise leave.
- One-shot setup or debug-only: leave unless touching the file anyway.
- Turn/death burst path: inspect if it can run during mass deaths or redistribution.

Specific follow-up candidates:

- `TransportManager.processDelayedTrackQueue()`
- `MinimapIconManager` ally mode timer `applyFilter`
- `SharedSlotManager.getAvailableSharedSlots()` spread/filter allocations
- `SharedSlotManager.debugPrintSlotCounts()` if debug can be enabled during performance tests
- transport cargo filtering in death/unload paths

Do not apply a blind ban on `.forEach`, `.map`, and `.filter` across all code. The rule is: avoid them in high-frequency or high-cardinality WC3 engine paths.

## Verification Plan

### Unit tests

Run the focused test set after each phase:

```bash
npm test -- tests/icon-lifecycle-logic.test.ts tests/minimap-frame-pool-logic.test.ts tests/minimap-update-loop-logic.test.ts tests/shared-slot-allocation-logic.test.ts
```

Add tests for any new pure helper introduced for:

- array-backed tracked unit storage,
- swap-pop removal,
- ownership revision changes,
- dirty color decisions,
- adaptive frequency policy if implemented.

### Integration tests

Run relevant game simulation tests:

```bash
npm test -- tests/game-simulation/shared-slot-lifecycle.test.ts tests/game-simulation/ally-color-filter-manager.test.ts tests/game-simulation/fog-cycle.test.ts
```

### Build checks

Run at least:

```bash
npm run build:world
```

Then inspect the generated Lua around `MinimapIconManager.updateAllIcons()` and confirm:

- no `trackedUnits:forEach` in the unit hot loop,
- no `__TS__Iterator(self.trackedUnits...)` in the unit hot loop,
- no coordinate object allocation in the unit hot loop,
- no debug print in the measured production path.

### In-client checks

Manually verify in Warcraft III:

- normal city icon colors,
- fogged city last-seen behavior,
- replay POV minimap behavior,
- colorblind and color contrast modes,
- native Alt+A mode 2 suppression,
- shared-slot units show the real owner color,
- transports load/unload without orphaned icons,
- guards do not get moving-unit minimap icons,
- reset/reinitialize does not leak or double-destroy frames.

## Acceptance Criteria

The work is complete when:

- Baseline benchmark numbers are recorded before the optimization.
- Post-change benchmark numbers are recorded with the same scenarios.
- The 2,000 tracked-unit scenario has a materially lower average and p95 tick time.
- Max tick time does not drift upward over a multi-minute run.
- Frame pool accounting remains stable: `tracked + pool = total created`.
- Duplicate registration is harmless.
- `updateAllIcons()` has no per-unit closure, Map entry, coordinate object, or cleanup array allocation.
- Existing minimap, replay, fog, transport, guard, and shared-slot behavior remains visually equivalent.
- Focused tests and world build pass.

## Risk Assessment

### Multiplayer determinism

Minimap frames are local UI state, but the code around them touches real units and shared-slot ownership. Do not put gameplay mutations behind `GetLocalPlayer()` branches. UI frame visibility, texture, and position can be local; unit ownership, alliance state, unit counts, and shared-slot maps must remain synchronized.

### Replay POV

Replay viewers use `getReplayObservedPlayer()` as the effective local player. Caches must include POV/replay state in their invalidation keys, or replay minimap colors can become stale after POV changes.

### Fog of war

City last-seen behavior is intentionally stateful. Dirty flags must not skip the first reveal, fog-to-visible transition, visible-to-fog transition, or `clearSeenCache()` reset.

### Shared-slot reassignment

Resolved owner can change without raw unit owner changing. Unit color caches must observe a `SharedSlotManager` ownership revision or equivalent invalidation.

### Frame pool integrity

Array-backed tracking introduces a new invariant:

```text
trackedUnitList.length === trackedFrameList.length
trackedUnitIndex.size === trackedUnitList.length
```

Every register, unregister, dead cleanup, destroy, and reset path must maintain it.

### Iteration order

Swap-pop removal changes tracked unit iteration order. That should not matter for minimap UI, but it must not be used for gameplay or deterministic ordering.

### Benchmark safety

The benchmark command should be single-player/local debug tooling. Spawning/removing thousands of units and manually calling update loops in multiplayer can create sync and performance noise unrelated to the production fix.

## Suggested Implementation Order

1. Add benchmark hooks and record baseline.
2. Make `registerTrackedUnit()` idempotent and update transport delayed queue looping.
3. Add pure tests for idempotent registration and swap-pop tracker behavior.
4. Convert tracked moving units to array-backed iteration.
5. Inline scalar position math and hoist per-tick color context.
6. Re-run benchmark and inspect generated Lua.
7. Add city dirty-state caching if unit-loop changes are not enough.
8. Add shared-slot ownership revisioning if unit color recomputation remains expensive.
9. Consider adaptive frequency only if measured p95 is still too high.
10. Run focused tests, build `world`, then do in-client visual verification.
