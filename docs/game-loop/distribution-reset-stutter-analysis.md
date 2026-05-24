# Distribution and Reset Stutter Analysis

This analysis reviews the city distribution and reset paths using the algorithm performance review methodology from `.github/skills/algorithm-performance-reviewer`.

The stutter is not primarily a Big-O failure. The distribution and reset loops are small by normal application standards, but they run on Warcraft III's single simulation thread and cross the native API boundary repeatedly. The important question is therefore: how many engine-visible ownership, unit, order, minimap, and fog updates happen in one burst, and how much Lua garbage is produced immediately around that burst?

## 1. Current Complexity & Transpilation Cost

### Distribution

`StandardDistributionService.distribute()` has these main phases:

- City pool construction is `O(C)` over `CityToCountry`, where `C` is the number of cities.
- Assignment pre-calculation is formally `O(C * P)` because `getValidPlayerForCity()` may rotate through up to `P` active players for each selected city. In practice `P` is bounded by Warcraft III player slots, so this behaves close to `O(C)`.
- `GetRandomElementFromArray(this.cities)` is `O(1)` because it uses swap-pop, not `splice()`.
- Allocation storage is `O(A + P)` space, where `A` is assigned cities: `Map<ActivePlayer, City[]>` plus `assignmentQueue`.
- The interleaved assignment queue is `O(A + P * R)`, where `R` is the maximum number of assigned cities for one player. Since `P` is bounded, this is effectively `O(A)`.
- The final ownership application loop is `O(A)` but has the highest constant factor because each assignment calls multiple WC3 natives.

The current batching loop is:

```typescript
for (let i = 0; i < assignmentQueue.length; i += 3) {
	const batch = assignmentQueue.slice(i, i + 3);
	for (const { player, city } of batch) {
		this.changeCityOwner(city, player);
	}
	await Wait.forSeconds(0.2);
}
```

The `slice()` call creates a new Lua table for every batch. The destructured `for...of` also asks TSTL to unpack each assignment object through iterator/destructuring support. With a batch size of 3 this is not algorithmically large, but it creates garbage exactly when the engine is also processing ownership and position changes.

Other distribution allocations are lower priority because they happen before the native burst:

- `Array.from(allocatedCites.keys())`
- `[...playerList]`
- `assignmentQueue.push({ player, city })`

Those still contribute to phase-transition GC pressure, but they are not as suspicious as `slice()` inside the awaited ownership loop.

### Reset

`ResetState.runAsync()` calls:

```typescript
await removeUnits(50, 0.2);
await resetCountries(3, 0.1);
await MinimapIconManager.getInstance().reinitialize(Array.from(CityToCountry.keys()));
await TreeManager.getInstance().reset();
```

`resetCountries()` is `O(K + C)` where `K` is countries and `C` is cities. Its current batching is already the right shape: it yields after every 3 city resets. The hidden cost is that one `City.reset()` is not one cheap operation. It includes ownership changes, rally updates, guard removal/rebuild, ability/type updates, minimap visibility changes, color-filter work, and invulnerability setup.

`Array.from(CityToCountry.keys())` in `ResetState` allocates a city array immediately before minimap reinitialization. At the time of this review, `MinimapIconManager.reinitialize(cities: City[])` does not use the `cities` parameter and instead iterates `this.cityRecords`, so this allocation appears unnecessary.

### TSTL Consideration

Expected transpilation concerns:

- `slice()` produces a new Lua table per distribution batch.
- Spread/`Array.from` calls usually compile to helper calls that allocate Lua tables.
- Destructuring in hot loops creates extra locals and can trigger helper paths depending on the exact TSTL output.
- `Wait.forSeconds()` creates a timer for every yield. That is acceptable for coarse reset/distribution work, but it is not free.

The key point: the Lua allocations are secondary to the WC3 native calls, but GC running during `SetUnitOwner`, `CreateUnit`, `RemoveUnit`, frame updates, or fog/minimap updates makes visible stutters worse.

## 2. Bottlenecks

### Distribution Ownership Burst

`StandardDistributionService.changeCityOwner(city, player)` performs more engine work than the name suggests:

```typescript
city.setOwner(player.getPlayer());

city.guard.reposition();
IssueImmediateOrder(city.guard.unit, 'stop');

SetUnitOwner(city.guard.unit, player.getPlayer(), true);

player.trackedData.units.add(city.guard.unit);

SetUnitInvulnerable(city.guard.unit, false);
SharedSlotManager.getInstance().incrementUnitCount(player.getPlayer());
```

`city.setOwner()` also calls:

- `Barracks.setOwner(player)`, which calls `SetUnitOwner(barracks, SharedSlotManager.getOwner(player), true)`.
- `SetUnitOwner(cop, player, true)` for the circle of power.

So one assigned city currently means up to:

- 3 ownership transfers with color updates enabled.
- 1 guard reposition through `SetUnitPosition`.
- 1 immediate order.
- 1 invulnerability change.
- Shared-slot bookkeeping and tracked-data updates.

With a batch size of 3, a single distribution burst can contain roughly 9 `SetUnitOwner(..., true)` calls plus 3 guard position changes and 3 orders before yielding.

`SetUnitOwner(..., true)` is the most suspicious native call because Warcraft III must update ownership-dependent engine state. The exact engine internals are not visible from TypeScript, but the observed cost is consistent with ownership/color/minimap/fog/alliance invalidation work happening on the main thread.

### Neutral City Post-Pass

After player assignments, distribution scans `RegionToCity` and processes neutral guards:

```typescript
for (const [_, city] of RegionToCity) {
	if (SharedSlotManager.getInstance().getOwnerOfUnit(city.guard.unit) === NEUTRAL_HOSTILE) {
		city.guard.reposition();
		IssueImmediateOrder(city.guard.unit, 'stop');
		SetUnitInvulnerable(city.guard.unit, false);

		neutralProcessed++;
		if (neutralProcessed % 10 === 0) {
			await Wait.forSeconds(0.1);
		}
	}
}
```

This loop is already batched, but it still does repeated singleton lookups and repeated owner resolution. If many cities remain neutral, the burst size of 10 can be visible because each processed guard still touches position/order/invulnerability natives.

### Reset Country Burst

`resetCountries(3, 0.1)` processes 3 `City.reset()` calls before yielding. Each city reset includes:

- `SetUnitOwner(cop, NEUTRAL_HOSTILE, true)`.
- `Barracks.reset()`, which calls `SetUnitOwner(barracks, NEUTRAL_HOSTILE, true)` and `SetUnitRallyUnit`.
- `Guard.reset()`, which removes the existing guard and creates a new neutral guard.
- `Guard.set()`, which updates ability/type state, untracks the guard from `UnitLagManager`, hides native minimap display, and applies ally-color filtering.
- `SetUnitInvulnerable(unit, true)` for the rebuilt guard.

This means reset can be heavier per city than distribution. Batching by city is good, but one city is still a chunky unit of work.

### Minimap Reinitialization

`MinimapIconManager.reinitialize()` is batched every 50 city records and updates frame size, level, visibility-dependent color, and cached textures. It can still contribute to reset stutter after `resetCountries()` finishes, especially on the world map with custom minimap icons enabled.

The `cities` parameter currently appears unused, so the caller-side `Array.from(CityToCountry.keys())` allocation is pure overhead unless the method is changed to consume that list.

## 3. Data Structure Optimization

- Replace assignment `slice()` batching with an index-based loop and a counter. This preserves ordering while removing per-batch tables.
- Avoid destructuring in the ownership loop. Read `assignment.player` and `assignment.city` directly.
- Cache `SharedSlotManager.getInstance()` outside neutral/reset loops that call it repeatedly.
- Consider lowering the neutral post-pass batch size from 10 to 3 to match ownership distribution if profiling shows a second spike after player assignment.
- Keep `assignmentQueue` unless profiling proves it is a problem. It buys a fair interleaving order and its allocation happens before the native ownership burst.
- If assignment-queue allocation becomes visible, use parallel arrays (`assignmentPlayers`, `assignmentCities`) or preallocated objects, but only after preserving the current round-robin ordering in tests.
- Remove or change `MinimapIconManager.reinitialize(cities)` if the parameter remains unused. Either call `reinitialize()` with no argument, or change the method to actually use a caller-provided cached city list.

## 4. Conditional Complexity Reduction

There is no significant branch-complexity issue in the hot paths.

`isCityValidForPlayer()` is a simple country-count check. Replacing it with a strategy table or polymorphic dispatch would add indirection without reducing the observed stutter. The reset path is also mostly procedural and native-bound; deeper abstractions would not help unless they let us split native work into smaller deterministic phases.

The useful simplification is procedural, not architectural: avoid data-transformation pipelines around the native loops and keep the loop state explicit.

## 5. Refactoring Proposal

### Distribution Loop

Replace the `slice()` batch loop with a flat counter. This version preserves the current final wait after the last batch; if that pause is not desired, remove the `i === assignmentQueue.length - 1` branch intentionally and test the phase timing.

```typescript
const assignmentsPerYield = 3;
let assignmentsInBatch = 0;

for (let i = 0; i < assignmentQueue.length; i++) {
	const assignment = assignmentQueue[i];
	this.changeCityOwner(assignment.city, assignment.player);

	assignmentsInBatch++;
	if (assignmentsInBatch >= assignmentsPerYield || i === assignmentQueue.length - 1) {
		assignmentsInBatch = 0;
		await Wait.forSeconds(0.2);
	}
}
```

### Neutral Post-Pass

Cache the shared-slot manager and use a counter reset instead of modulo. The modulo is not the main bottleneck, but the rewritten loop keeps the shape consistent with the distribution loop and makes the batch budget obvious.

```typescript
const sharedSlots = SharedSlotManager.getInstance();
const neutralBatchSize = 5;
let neutralProcessed = 0;

for (const [_, city] of RegionToCity) {
	if (sharedSlots.getOwnerOfUnit(city.guard.unit) !== NEUTRAL_HOSTILE) {
		continue;
	}

	city.guard.reposition();
	IssueImmediateOrder(city.guard.unit, 'stop');
	SetUnitInvulnerable(city.guard.unit, false);

	neutralProcessed++;
	if (neutralProcessed >= neutralBatchSize) {
		neutralProcessed = 0;
		await Wait.forSeconds(0.1);
	}
}
```

### Reset Batching

The existing `resetCountries(3, 0.1)` is already a large improvement over single-frame reset. If stutter remains visible, tune the budget down before splitting `City.reset()` internally:

```typescript
await resetCountries(1, 0.05);
```

If that still stutters, the next step is a phased reset that separates ownership transfer, guard rebuild, and minimap/color-filter work. That is riskier because it can expose partially reset city state between awaits, so it should be gated behind reset-only match state and tested in the WC3 client.

### Expected Lua Shape

Mentally evaluated TSTL before:

```lua
local batch = __TS__ArraySlice(assignmentQueue, i, i + 3)
for ____, assignment in ipairs(batch) do
	local player = assignment.player
	local city = assignment.city
	self:changeCityOwner(city, player)
end
```

After:

```lua
local assignment = assignmentQueue[i + 1]
self:changeCityOwner(assignment.city, assignment.player)
```

The after version still reads the assignment object, but it removes the intermediate batch table and the second loop.

## 6. Benchmark Plan (Warcraft III)

Measure two separate things: Lua allocation overhead and native ownership/reset burst cost. Run these in a local WC3 test map or controlled debug build, not in a live multiplayer match.

### Lua Allocation Benchmark

Use a pure loop with about 10,000 passes so the `slice()` cost is visible without involving WC3 natives:

```typescript
function benchmarkDistributionLoopShape(assignments: { player: ActivePlayer; city: City }[]): void {
	let sink = 0;

	const sliceStart = os.clock();
	for (let pass = 0; pass < 10000; pass++) {
		for (let i = 0; i < assignments.length; i += 3) {
			const batch = assignments.slice(i, i + 3);
			for (const assignment of batch) {
				if (assignment.city) sink++;
			}
		}
	}
	const sliceMs = (os.clock() - sliceStart) * 1000;

	const indexStart = os.clock();
	for (let pass = 0; pass < 10000; pass++) {
		for (let i = 0; i < assignments.length; i++) {
			const assignment = assignments[i];
			if (assignment.city) sink++;
		}
	}
	const indexMs = (os.clock() - indexStart) * 1000;

	print(`distribution loop shape slice=${sliceMs}ms index=${indexMs}ms sink=${sink}`);
}
```

### Native Burst Benchmark

Benchmark native ownership separately with smaller iteration counts. A 10,000-iteration native benchmark can freeze the client and will not represent real gameplay.

```typescript
function benchmarkOwnershipBurst(city: City, playerA: player, playerB: player): void {
	const units = [city.barrack.unit, city.cop, city.guard.unit];
	const iterations = 60;

	const start = os.clock();
	for (let i = 0; i < iterations; i++) {
		const owner = i % 2 === 0 ? playerA : playerB;
		for (let j = 0; j < units.length; j++) {
			SetUnitOwner(units[j], owner, true);
		}
	}
	const elapsedMs = (os.clock() - start) * 1000;

	print(`SetUnitOwner burst: ${iterations * units.length} calls in ${elapsedMs}ms`);
}
```

Track:

- Total milliseconds for the burst.
- Maximum milliseconds for one batch of 3 cities during real distribution.
- Maximum milliseconds for one `resetCountries()` batch.
- Whether spikes exceed 16.7ms for 60 FPS or 33.3ms for 30 FPS.

For real-path instrumentation, wrap each awaited batch and print only max/summary values so debug printing does not become the benchmark.

## 7. Risk Assessment

- Distribution order must remain unchanged. It affects visible city ownership order, shared-slot counts, tracked units, and potentially fog/minimap state.
- Do not change RNG usage while optimizing. The shuffle and city selection sequence must stay deterministic for multiplayer sync.
- Do not change `SetUnitOwner(..., true)` to `false` without visual and gameplay tests. The color flag may be important for player colors, minimap behavior, and ally-color filtering.
- Splitting `City.reset()` across awaits can expose a partially reset city. During reset that may be acceptable, but only if triggers, timers, minimap refresh, and state transitions cannot observe inconsistent guard/barracks/cop state.
- Keep fog ordering aligned with `docs/game-loop/fog-before-distribution-ordering.md`. Ownership changes while fog is disabled can affect cached city colors and last-seen minimap behavior.
- `Wait.forSeconds()` creates timers. The current coarse batches are reasonable, but avoid very tiny intervals unless profiling shows they are needed.
- Vitest can prove pure logic equivalence but cannot prove WC3 frame smoothness. Keep `tests/distribution-logic.test.ts` passing, and add a pure helper test if the assignment ordering is extracted. Validate stutter fixes with WC3 client instrumentation.
