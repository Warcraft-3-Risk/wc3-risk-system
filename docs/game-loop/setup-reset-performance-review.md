# Setup and Reset State Performance Review

Scope: `SetupState`, `ResetState`, `removeUnits`, scoreboard setup/teardown, and adjacent reset batching paths. The main Warcraft III risks are native API volume, handle churn, and TypeScript-to-Lua allocation patterns during restarts.

## 1. Current Complexity & Transpilation Cost

### Reset flow

`ResetState.runAsync()` performs these expensive steps in sequence:

- `removeUnits(50, 0.2)`
- `resetCountries()` in country batches
- `MinimapIconManager.reinitialize(Array.from(CityToCountry.keys()))`
- `TreeManager.reset()` in destructable batches
- shared-slot, player-stat, and team resets

The country and tree reset paths are already batched. `removeUnits()` is the weaker path because batching is implemented by repeatedly rebuilding enumeration state instead of by keeping progress through the unit set.

### `removeUnits`

Fast path cost is good: `O(P)` over player slots, where `P = bj_MAX_PLAYERS`, by summing `SharedSlotManager.getUnitCount(Player(i))`. If tracked count is zero, it avoids all `GroupEnumUnitsOfPlayer` calls.

When tracked count is nonzero, the current algorithm is approximately:

```text
O(number_of_batches * players_scanned_per_batch * GroupEnumUnitsOfPlayer cost)
```

With `B = 50` and `R = removable units`, there are `ceil(R / B)` removal batches. Because each batch starts scanning again at `Player(0)`, low player IDs are re-enumerated many times and later player IDs can be starved until earlier slots have fewer than `B` removable units. In a skewed case where player 0 owns thousands of removable units, player 0 is enumerated roughly once per batch until almost empty.

Space per batch is `O(B)` for `const batch: unit[]`, plus one transient `group` handle per scanned player. The bigger cost is native enumeration and repeated filter work, not the small batch array.

TSTL considerations:

- `const batch: unit[] = []` creates a Lua table every outer loop.
- `for (const unit of batch)` is likely acceptable for arrays, but a numeric loop is still the safest low-overhead TSTL shape.
- `debugPrint` template strings inside the player scan are behind `DEBUG_PRINTS.master`; keep them gated because `GetPlayerName` and string construction should not run during performance measurements.
- The current implementation avoids closure-based array methods in `removeUnits`, which is good.

### Scoreboard setup and teardown

`SetupState.runAsync()` calls either `ScoreboardManager.ffaSetup()` or `ScoreboardManager.teamSetup()`, then `obsSetup()`. Those setup methods instantiate new renderers:

- `new PlayerRenderer(players.length)`
- `new TeamRenderer(this.dataModel.teams)`
- `new ObserverRenderer(players.length)`

Each renderer constructor calls `CreateMultiboard()` and then performs `rows * columns` item setup through `MultiboardGetItem`, `MultiboardSetItemWidth`, `MultiboardSetItemValue`, and `MultiboardReleaseItem`.

`GameOverState` calls `ScoreboardManager.destroyBoards()`, but renderer `destroy()` implementations intentionally hide boards instead of calling `DestroyMultiboard()` because replay safety is prioritized. That is the correct replay rule, but the current setup path then drops references and creates new boards on the next setup. Over many restarts, hidden multiboard handles can grow without a reuse boundary.

TSTL considerations:

- Setup uses spread copies such as `[...GlobalGameData.matchPlayers]`, `[...TeamManager.getInstance().getTeams()]`, and `[...PlayerManager.getInstance().observers.keys()]`. These allocate Lua tables. They are setup-time costs, not per-tick costs.
- `ScoreboardManager.iterateRenderers()` uses `Object.values(this.renderers).forEach(...)`, which creates a values table and closure. This matters more because `updatePartial()` runs from the game loop tick.
- `ScoreboardDataModel.refreshValues()` uses `new Map`, `forEach`, and `map` on every partial update. That is outside reset setup, but it is the largest scoreboard-adjacent TSTL allocation pattern found during this review.

### Other reset batching

`TreeManager.reset()` and `removeInvulnerabilityBatched()` call `computeBatches()`, which uses `slice()` to create nested arrays before processing. This is clear and testable, but it changes tree reset from `O(T)` space to `O(T + batch_count)` temporary table space. For a map-size tree array, an index-window loop would be more WC3-friendly.

`resetCountries()` calls `Array.from(StringToCountry.values())` once per reset. That allocation is small relative to country reset native calls, but it could also be avoided if reset pressure remains visible after fixing unit removal.

## 2. Bottlenecks

### P1: repeated native unit enumeration in `removeUnits`

The current outer `while (true)` loop rebuilds `batch` and starts the player loop from zero each time. When `batch.length >= batchSize`, scanning stops for that pass. The next pass restarts at `Player(0)`, creates new groups again, and rechecks all still-existing excluded units and remaining removable units for earlier players.

This produces extra:

- `CreateGroup()` / `DestroyGroup()` churn
- `GroupEnumUnitsOfPlayer()` calls
- `FirstOfGroup()` / `GroupRemoveUnit()` iterations
- `IsUnitType(unit, BUILDING)` and `IsUnitType(unit, GUARD)` calls over units that were already rejected in previous passes

The batching intent is right; the progress model is the issue.

### P1: unbounded scoreboard handle creation across restarts

Replay safety explains why boards are hidden instead of destroyed. The current lifecycle, however, creates new standard and observer multiboards for each setup after dropping references to the hidden boards. In long sessions or repeated promode/random-team rounds, this can become an avoidable handle leak.

The fix should be a replay-safe renderer pool keyed by layout, not `DestroyMultiboard()`.

### P2: scoreboard hot-path allocation patterns

The review target is setup/reset, but the scoreboard code has a nearby per-tick cost:

- `ScoreboardManager.updatePartial()`
- `ScoreboardManager.iterateRenderers()`
- `ScoreboardDataModel.refreshValues()`
- `PlayerRenderer.renderPartial()` and `ObserverRenderer.renderPartial()`

These paths use `Object.values`, `forEach`, `map`, and `new Map` during game-loop updates. In TSTL, those tend to become closure/table allocation paths. They should be treated as a separate follow-up if reset performance is not the only concern.

### P2: tree reset batch array allocation

`computeBatches()` is useful pure logic, but the runtime tree reset does not need the nested arrays. It can process `[start, end)` windows directly and keep the pure helper for unit tests or non-WC3 logic.

## 3. Data Structure Optimization

### Prefer streaming unit removal over a full `unitsToRemove` array

A one-pass `const unitsToRemove: unit[] = []` would remove the repeated native enumeration, but it creates one large Lua table containing every removable unit. That is simpler than the current implementation, but it can still spike memory on very large armies.

Better option: enumerate each player once, keep the current `group` as the cursor, remove units from that group, and yield every `batchSize` removals. This gives:

- one `GroupEnumUnitsOfPlayer()` per player slot
- one live `group` at a time
- no large all-units Lua table
- bounded timer yields during actual `RemoveUnit` work

The main tradeoff is that a group handle remains alive across `await Wait.forSeconds(...)` if a single player's group spans multiple batches. That should be validated in WC3, but it is still preferable to re-enumerating the same player repeatedly.

### Pool scoreboard renderers by deterministic layout key

Do not destroy multiboards. Keep hidden renderers reachable in a pool:

- `standard:ffa:<playerCount>`
- `standard:team:<playerCount>:<teamCount>:<showTeamTotals>`
- `observer:<playerCount>`
- `session:<playerCount>` is already effectively single-created

On setup, hide the active renderer, look up the layout key, create only on cache miss, then `renderFull()` and make the selected renderer visible. This bounds multiboard handle growth to the number of unique layouts used in a session.

### Use index windows for tree reset

For tree reset, use numeric start/end indexes instead of `computeBatches(...).slice(...)` in the WC3 runtime path. Keep `needsReset()` and `computeBatches()` tests if they are valuable, but avoid using `slice` during actual map reset.

## 4. Conditional Complexity Reduction

The `removeUnits` filter:

```ts
!IsUnitType(unit, UNIT_TYPE.BUILDING) && !IsUnitType(unit, UNIT_TYPE.GUARD)
```

is simple and should stay inline in the hot loop. Extracting it into a helper can improve readability, but in TSTL that may add a function call per unit unless inlined by the compiler. If extracted, use it for clarity only after measuring.

For scoreboard setup, the current FFA/team branch is already clear. The useful simplification is not polymorphism; it is a layout key that answers one question: "Can the existing hidden renderer be reused for this setup?"

Avoid lookup-table over-engineering here. The branch count is tiny, and WC3 native calls dominate.

## 5. Refactoring Proposal

### `removeUnits`: streaming per-player cursor

This proposal preserves the public signature and batching behavior while eliminating repeated player re-enumeration.

```ts
export async function removeUnits(batchSize = 50, intervalSeconds = 0.2): Promise<void> {
	let totalUnits = 0;
	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
		totalUnits += SharedSlotManager.getInstance().getUnitCount(Player(i));
	}

	if (totalUnits === 0) {
		if (DEBUG_PRINTS.master) debugPrint('[ResetState] No tracked units - skipping removeUnits', DC.gameMode);
		return;
	}

	let removedCount = 0;
	let removedInBatch = 0;

	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
		const player = Player(i);
		if (DEBUG_PRINTS.master) debugPrint(`Scanning units for player ${GetPlayerName(player)} index ${i}`, DC.gameMode);

		const group = CreateGroup();
		GroupEnumUnitsOfPlayer(group, player, undefined);

		for (let current = FirstOfGroup(group); current !== undefined; current = FirstOfGroup(group)) {
			GroupRemoveUnit(group, current);

			if (IsUnitType(current, UNIT_TYPE.BUILDING) || IsUnitType(current, UNIT_TYPE.GUARD)) {
				continue;
			}

			if (GetUnitTypeId(current) !== 0) {
				UnitLagManager.getInstance().untrackUnit(current);
				RemoveUnit(current);
				removedCount++;
				removedInBatch++;
			}

			if (removedInBatch >= batchSize) {
				removedInBatch = 0;
				await Wait.forSeconds(intervalSeconds);
			}
		}

		GroupClear(group);
		DestroyGroup(group);
	}

	if (DEBUG_PRINTS.master) {
		debugPrint(`[ResetState] Removed ${removedCount} units in batches of ${batchSize} every ${intervalSeconds}s`, DC.gameMode);
	}
}
```

Expected TSTL improvement, conceptually:

```lua
-- current shape
while true do
  local batch = {}
  for i = 0, bj_MAX_PLAYERS - 1 do
    local group = CreateGroup()
    GroupEnumUnitsOfPlayer(group, Player(i), nil)
    -- fill up to B, then restart from player 0 next loop
  end
end

-- proposed shape
for i = 0, bj_MAX_PLAYERS - 1 do
  local group = CreateGroup()
  GroupEnumUnitsOfPlayer(group, Player(i), nil)
  -- consume this group once, yielding every B removals
end
```

If holding a group across `await` proves unsafe in the WC3 client, the fallback is the simpler one-pass `unitsToRemove` array. That still fixes the algorithmic bug, but with higher peak Lua table memory.

### `ScoreboardManager`: replay-safe renderer pool

Sketch only; the real change should include tests around visibility and layout selection.

```ts
type RendererPoolKey = string;

private rendererPool: Map<RendererPoolKey, ScoreboardRenderer> = new Map();

private useStandardRenderer(key: RendererPoolKey, create: () => ScoreboardRenderer): ScoreboardRenderer {
	if (this.renderers.standard) {
		this.renderers.standard.setVisibility(false);
	}

	let renderer = this.rendererPool.get(key);
	if (!renderer) {
		renderer = create();
		this.rendererPool.set(key, renderer);
	}

	this.renderers.standard = renderer;
	renderer.renderFull(this.dataModel);
	renderer.setVisibility(true);
	return renderer;
}

public ffaSetup(players: ActivePlayer[]) {
	this.activePlayers = players;
	this.dataModel.refresh(this.activePlayers, true);
	this.useStandardRenderer(`standard:ffa:${players.length}`, () => new PlayerRenderer(players.length));
}
```

For team setup, the key should include every dimension that changes row layout. At minimum: player count, team count, and whether team totals fit. If team layouts can change more deeply in random teams, prefer a conservative key that includes per-team member counts.

`destroyBoards()` should hide active renderers and clear active pointers, but it should not clear the pool.

### `TreeManager`: index-window batching

```ts
public async reset(batchSize = 300, intervalSeconds = 0.1): Promise<void> {
	for (let start = 0; start < this.treeArray.length; start += batchSize) {
		const end = Math.min(start + batchSize, this.treeArray.length);

		for (let i = start; i < end; i++) {
			const tree = this.treeArray[i];
			const maxLife = GetDestructableMaxLife(tree);
			if (needsReset(GetDestructableLife(tree), maxLife)) {
				DestructableRestoreLife(tree, maxLife, false);
				SetDestructableInvulnerable(tree, true);
			}
		}

		if (end < this.treeArray.length) {
			await Wait.forSeconds(intervalSeconds);
		}
	}
}
```

This removes `slice()` allocations in the runtime path and also caches `GetDestructableMaxLife(tree)` per tree.

## 6. Benchmark Plan (Warcraft III)

Benchmark in a local/dev map with deterministic global code paths only. Do not gate benchmark behavior behind `GetLocalPlayer()` in multiplayer.

### Unit removal benchmark

Create a debug-only command that:

1. Spawns a known count of removable units across several player slots, for example `12,000` footmen split across `Player(0)`, `Player(1)`, and shared slots.
2. Increments `SharedSlotManager` counts the same way production spawns do, otherwise the early exit will skip the test.
3. Runs `await removeUnits(500, 0.0)` for raw throughput and `await removeUnits(50, 0.2)` for player-visible smoothness.
4. Prints elapsed time, removed count, group-enum count, and max batch duration.

Example boilerplate:

```ts
async function benchRemoveUnits(): Promise<void> {
	const start = os.clock();

	await removeUnits(500, 0.0);

	const elapsedMs = (os.clock() - start) * 1000;
	print(`[bench] removeUnits elapsed=${elapsedMs}ms`);
}
```

For tighter comparison, instrument `removeUnits` locally with counters:

```ts
let groupEnums = 0;
let removed = 0;

const start = os.clock();
for (let i = 0; i < 10000; i++) {
	// Pure branch/filter micro-benchmark only. Do not call RemoveUnit here.
}
print(`[bench] 10000 filter iterations took ${(os.clock() - start) * 1000}ms`);
```

Use the macro benchmark for real WC3 behavior; use the 10,000-iteration micro benchmark only to compare TSTL branch shapes or helper-call overhead.

### Scoreboard benchmark

Run repeated setup/game-over cycles in a dev command:

1. Call FFA setup, observer setup, `destroyBoards()`, and setup again for `100` cycles.
2. Count `CreateMultiboard()` calls in the test shim or with a temporary debug wrapper.
3. Expected result after pooling: calls should stabilize at the number of unique layout keys, not grow with cycle count.

### Tree reset benchmark

Measure current `computeBatches()` runtime path vs index-window batching over the existing `treeArray`. Use `os.clock()` around the whole reset and log temporary batch count. The expected win is lower GC pressure rather than dramatic wall-clock improvement.

## 7. Risk Assessment

- `removeUnits` streaming changes when `RemoveUnit()` happens: removal occurs while the player's enumeration group is still alive, rather than after a small batch is collected. Validate that no reset-time triggers assume all removals happen after enumeration.
- Holding a `group` handle across `await Wait.forSeconds()` should be tested in the WC3 client. If it is unstable, use the one-pass `unitsToRemove` fallback.
- `RemoveUnit()` may not fire the same events as unit death. The current code already calls `UnitLagManager.untrackUnit()` directly and later clears `SharedSlotManager`, so keep that behavior unless tests prove counts need explicit decrementing during reset.
- The early exit depends on `SharedSlotManager.slotUnitCounts` being accurate. If a production path creates units without incrementing counts, reset can skip real units. Consider a debug assertion that compares tracked counts with a one-time enumeration in development builds.
- Scoreboard pooling must preserve replay safety. Do not call `DestroyMultiboard()`. Do not create or hide boards conditionally per local player in a way that changes handle creation order across clients.
- Scoreboard layout keys must be conservative. Reusing a board with too few rows or wrong team-total shape risks stale cells or missing rows.
- Replacing array methods in hot scoreboard paths can change sort/order behavior if done hastily. Add tests around `ScoreboardDataModel.refresh()` and `refreshValues()` before optimizing those loops.

Recommended tests:

- Add a pure helper for unit-removal cursor planning if possible, then test that all players are visited once and excluded unit types are not scheduled.
- Extend WC3 shim tests to count `CreateGroup`, `GroupEnumUnitsOfPlayer`, `DestroyGroup`, `CreateMultiboard`, and visibility calls.
- Add a scoreboard manager lifecycle test: setup -> destroyBoards -> setup with same layout should not create a second renderer after pooling.
- Keep existing `tree-reset-logic` tests; add a runtime-facing helper test if index-window batching is extracted.
