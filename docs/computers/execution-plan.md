# Computer Player AI — First Draft Execution Plan

> Incremental, testable implementation plan. Each step builds on the previous
> one and can be verified in-game before moving to the next. Every step includes
> `debugPrint` statements (using the `DC.bot` category) so you can visually
> confirm each increment works. Enable bot debug output by setting `bot: true`
> in `DEBUG_PRINTS` in `game-settings.ts`.
>
> **Scope:** Land-only FFA bot for the Europe map. No naval transport, no
> alliances, no leaver takeover. Bots respect fog of war.

---

## Phase 0 — Scaffolding & Slot Registration

### Step 0.1 — Create `ComputerPlayer` class (empty shell)

- [x] Create `src/app/player/types/computer-player.ts`
- [x] Extend `ActivePlayer` (same base as `HumanPlayer`)
- [x] Implement the abstract `onKill` / `onDeath` methods with minimal logic
      (track kills/deaths in `trackedData` like `HumanPlayer`, but skip bounty,
      announcements, and combat timestamps — bots don't need UI feedback)
- [x] Add a `debugPrint('ComputerPlayer created for slot ' + GetPlayerId(player), DC.bot)`
      in the constructor

**Test:** Build compiles with no errors. The class exists but is not instantiated
anywhere yet.

```typescript
// src/app/player/types/computer-player.ts
import { ActivePlayer } from './active-player';
import { debugPrint } from '../../utils/debug-print';
import { DC } from 'src/configs/game-settings';

export class ComputerPlayer extends ActivePlayer {
	constructor(player: player) {
		super(player);
		debugPrint(`[Bot] ComputerPlayer created for slot ${GetPlayerId(player)}`, DC.bot);
	}

	onKill(victim: player, unit: unit, isPlayerCombat: boolean): void {
		if (!this.status.isAlive() && !this.status.isNomad()) return;
		if (victim === this.getPlayer()) return; // deny
		if (IsPlayerAlly(victim, this.getPlayer())) return;

		const val = GetUnitPointValue(unit);
		const kdData = this.trackedData.killsDeaths;
		kdData.get(this.getPlayer()).killValue += val;
		kdData.get(victim).killValue += val;
		kdData.get(this.getPlayer()).kills++;
		kdData.get(victim).kills++;

		this.giveGold(val); // simple: gold = kill value
	}

	onDeath(killer: player, unit: unit, isPlayerCombat: boolean): void {
		this.trackedData.units.delete(unit);
		if (!this.status.isAlive() && !this.status.isNomad()) return;
		if (killer === this.getPlayer()) return;
		if (IsPlayerAlly(killer, this.getPlayer())) return;

		const val = GetUnitPointValue(unit);
		const kdData = this.trackedData.killsDeaths;
		kdData.get(killer).deathValue += val;
		kdData.get(this.getPlayer()).deathValue += val;
		kdData.get(killer).deaths++;
		kdData.get(this.getPlayer()).deaths++;
	}
}
```

---

### Step 0.2 — Register computer slots in `PlayerManager`

- [x] Modify `PlayerManager` constructor: when
      `GetPlayerController(player) == MAP_CONTROL_COMPUTER`, create a
      `ComputerPlayer` instead of `HumanPlayer`
- [x] Store the controller type accurately:
      `this._playerControllerHandle.set(player, MAP_CONTROL_COMPUTER)`
- [x] Add `debugPrint` on registration:
      `debugPrint('[Bot] Registered computer player slot ' + i, DC.bot)`
- [x] Add a helper method `isComputerPlayer(player: player): boolean` that
      checks the controller map
- [x] Skip UI button creation (health, value, label, rating) for computer
      players — they have no local screen

**Test:** In the WC3 map editor, set 1–2 slots to "Computer" in the player
properties. Build and launch. Verify in debug output:

```
DEBUG: [Bot] ComputerPlayer created for slot 1
DEBUG: [Bot] Registered computer player slot 1
```

Confirm the game doesn't crash and human players still work normally.

---

### Step 0.3 — Exclude computer slots from client redistribution

- [x] In `ClientManager`, check if a slot belongs to a computer player before
      including it in the redistribution pool
- [x] Use `PlayerManager.getInstance().isComputerPlayer(player)` as the guard
- [x] Add `debugPrint('[Bot] Excluding computer slot ' + GetPlayerId(player) + ' from client redistribution', DC.bot)`
- [x] Verify `getPlayersThatLeftWithNoUnitsOrCities()` also skips computer slots
      (it already filters on `PLAYER_SLOT_STATE_LEFT`, so computer slots that are
      active should naturally be excluded, but add explicit check to be safe)

**Test:** Launch with 1 human + 1 computer. Confirm debug output shows the
computer slot excluded from redistribution. Confirm the human player's
multi-client slots are unaffected.

---

### Step 0.4 — Verify bot survives the full game state machine

- [x] Confirm bot slot passes through all game states without crashing:
      `ResetState` → `SetupState` → `CityDistributeState` → `VisionState` →
      `CountdownState` → `EnableControlsState` → `GameLoopState`
- [x] The bot should receive cities from `CityDistributeState`, get income from
      `IncomeManager.giveIncome()`, and appear on the scoreboard
- [x] Add `debugPrint('[Bot] Slot ' + GetPlayerId(player) + ' has ' + trackedData.cities.cities.length + ' cities', DC.bot)`
      after city distribution (e.g., listen for an event, or add a one-shot timer
      check in `GameLoopState.onStartTurn` for turn 0)

**Test:** Launch with 2 humans + 2 computers on the Europe map. Let it reach
the game loop. Confirm:

1. Bots appear on scoreboard with cities
2. Bots receive income each turn
3. No crashes or desyncs
4. Debug output shows city counts for bot slots

---

## Phase 1 — BotManager & Think Loop

### Step 1.1 — Create `BotManager` singleton

- [x] Create `src/app/managers/bot-manager.ts`
- [x] Singleton pattern (matching existing managers)
- [x] `private bots: ComputerPlayer[]` — list of registered bots
- [x] `registerBot(bot: ComputerPlayer)` — add to list
- [x] `getBots(): ComputerPlayer[]` — return list
- [x] `debugPrint('[BotManager] Initialized with ' + bots.length + ' bots', DC.bot)`
      after all bots are registered

**Test:** Build compiles. BotManager is instantiated but has no tick yet.

---

### Step 1.2 — Wire up the think loop timer

- [x] In `BotManager`, add a `start()` method that creates a WC3 timer
      ticking every 1 second (matching `TICK_DURATION_IN_SECONDS`)
- [x] Track per-bot think counters: `Map<ComputerPlayer, number>`
- [x] Each bot gets an initial offset to stagger them (bot 0 starts at 0,
      bot 1 starts at 1, etc.)
- [x] Think interval: 2 seconds (configurable constant `BOT_THINK_INTERVAL`)
- [x] On each timer tick, decrement counters. When a bot's counter reaches 0,
      call `bot.think()` and reset counter
- [x] Add `think()` method to `ComputerPlayer` — for now it only prints:
      `debugPrint('[Bot] Slot ' + GetPlayerId(player) + ' THINK — cities: ' + cities + ', gold: ' + gold, DC.bot)`

```typescript
// BotManager.start() — core loop
private thinkCounters: Map<ComputerPlayer, number> = new Map();
private static readonly THINK_INTERVAL = 2;

public start(): void {
  // Stagger
  this.bots.forEach((bot, index) => {
    this.thinkCounters.set(bot, index % BotManager.THINK_INTERVAL);
  });

  const botTimer = CreateTimer();
  TimerStart(botTimer, TICK_DURATION_IN_SECONDS, true, () => {
    if (GlobalGameData.matchState !== 'inProgress') return;

    for (const [bot, counter] of this.thinkCounters) {
      if (!bot.status.isAlive() && !bot.status.isNomad()) continue;

      if (counter <= 0) {
        bot.think();
        this.thinkCounters.set(bot, BotManager.THINK_INTERVAL);
      } else {
        this.thinkCounters.set(bot, counter - 1);
      }
    }
  });

  debugPrint(`[BotManager] Think loop started. ${this.bots.length} bots, interval=${BotManager.THINK_INTERVAL}s`, DC.bot);
}
```

- [x] Call `BotManager.getInstance().start()` from `GameLoopState.onEnterState()`
      (after the match timer is set up)

**Test:** Launch with 2 bots. Watch debug output — should see think messages
every 2 seconds, staggered:

```
t=0: [Bot] Slot 2 THINK — cities: 5, gold: 20
t=1: [Bot] Slot 3 THINK — cities: 4, gold: 16
t=2: [Bot] Slot 2 THINK — cities: 5, gold: 24
t=3: [Bot] Slot 3 THINK — cities: 4, gold: 20
```

Confirm no desync in multiplayer (both clients show same messages).

---

## Phase 2 — Adjacency Data

### Step 2.1 — Define the adjacency data structure

- [x] Create `src/configs/adjacency/adjacency-types.ts` with the type:

  ```typescript
  export type AdjacencyMap = Record<string, { land: string[] }>;
  ```

  Each key is a country name, and the value is an object with a `land` array
  of adjacent country names. Using `{ land: string[] }` instead of a plain
  array matches the analysis and allows adding `sea: string[]` later when
  naval transport is implemented.

- [x] Create `src/configs/adjacency/europe-adjacency.ts` with the full Europe
      adjacency map (81 countries — based on real geography + the land bridge
      exceptions documented in the technical analysis)

**Test:** Build compiles. Import the map in a test or in `BotManager.start()`
and print: `debugPrint('[Adjacency] Europe map loaded: ' + Object.keys(map).length + ' countries', DC.bot)`

---

### Step 2.2 — Build the `AdjacencyGraph` runtime class

- [x] Create `src/app/bot/adjacency-graph.ts`
- [x] Constructor takes an `AdjacencyMap` (or `null` if no data for this map)
- [x] Methods:
  - `getNeighbors(country: string): string[]` — returns adjacent country names
    (empty array if country not in map)
  - `areAdjacent(a: string, b: string): boolean`
  - `hasData(): boolean` — returns false if no adjacency data was provided
- [x] `debugPrint('[AdjacencyGraph] Loaded with ' + countryCount + ' countries', DC.bot)` on construction
- [x] Validate symmetry on construction: if A→B exists, B→A must also exist.
      Log warnings for mismatches:
      `debugPrint('[AdjacencyGraph] WARNING: asymmetric adjacency: ' + a + ' → ' + b, DC.bot)`

**Test:** AdjacencyGraph is constructed in BotManager.start(). Debug output
confirms country count and no asymmetry warnings.

---

### Step 2.3 — Wire adjacency to the right map

- [x] Detect which map is currently being played (from build config or map
      name detection — check how terrain configs are selected)
- [x] Load the correct adjacency data (europe for Europe map, or `null` for
      maps without adjacency data yet)
- [x] Store as `BotManager.adjacencyGraph`
- [x] `debugPrint('[BotManager] Adjacency data loaded: ' + (graph.hasData() ? 'yes' : 'NO — bots will play suboptimally'), DC.bot)`

**Test:** Build for Europe → shows adjacency loaded. Build for World/Asia →
shows "NO — bots will play suboptimally".

---

## Phase 3 — Economy: Training Units

### Step 3.1 — Bot trains units at owned barracks

- [x] In `ComputerPlayer.think()`, add an `economyStep()` method
- [x] `economyStep()`:
  1. Read gold: `GetPlayerState(this.getPlayer(), PLAYER_STATE_RESOURCE_GOLD)`
  2. Iterate `this.trackedData.cities.cities` (owned cities)
  3. For each city, get the barracks unit handle
  4. Check if bot has enough gold for one unit:
     `GetUnitPointValue(barracks)` or use a known cost constant
  5. Issue train order: `IssueImmediateOrderById(barracks.unit, trainOrderId)`
  6. Cap at **1 train order per barracks per think** to avoid overqueuing
  7. Cap at a **global max trains per think** (`BOT_MAX_TRAINS_PER_THINK = 5`)
- [x] `debugPrint('[Bot] Slot ' + id + ' economy: gold=' + gold + ', trained=' + trainCount + '/' + maxTrain, DC.bot)`

**Test:** Launch with 1 bot. Watch debug output showing train counts. Visually
confirm units appearing at bot-owned cities over time. Confirm bot's gold
decreases as it trains.

---

### Step 3.2 — Respect fog of war in economy decisions

- [x] Bots should only train at cities they own (already ensured by iterating
      `trackedData.cities.cities`)
- [x] Verify that bot-trained units are correctly tracked in
      `trackedData.units` (the existing unit-train trigger should handle this)
- [x] `debugPrint('[Bot] Slot ' + id + ' unit count: ' + this.trackedData.units.size, DC.bot)`

**Test:** Let the bot accumulate units for several turns. Confirm unit count
in debug output increases. Confirm units have the correct player color on the
map.

---

## Phase 4 — Territory Awareness

### Step 4.1 — Build `BotTerritoryTracker`

- [x] Create `src/app/bot/territory-tracker.ts`
- [x] Stores per-bot connectivity info: which owned countries are connected
      by land through owned territory
- [x] The "mainland" (largest connected group) also serves as the bot's
      strategic expansion center — equivalent to the HQ selection concept from
      the Stand Alone analysis (Section 11). No separate HQ algorithm is needed;
      the bot naturally expands from its densest cluster.
- [x] `update(ownedCountries: Country[], adjacencyGraph: AdjacencyGraph)`:
  - BFS/DFS from each owned country, only following land adjacencies through
    owned countries
  - Groups connected countries into "landmasses" (sets)
  - Identifies the "mainland" as the largest connected group
- [x] `getMainland(): Set<string>` — largest connected group of owned countries
- [x] `getLandmasses(): Set<string>[]` — all connected groups
- [x] `isLandReachable(from: string, to: string): boolean` — are both in the
      same landmass?
- [x] If `adjacencyGraph.hasData()` is false, treat all owned countries as one
      single landmass (graceful degradation)
- [x] `debugPrint('[Territory] Slot ' + id + ': ' + landmasses.length + ' landmasses, mainland=' + mainlandSize + ' countries', DC.bot)`

**Test:** Add `BotTerritoryTracker` to `ComputerPlayer`. Call
`tracker.update()` at the start of each think. Watch debug output showing
landmass counts. Manually verify against the map that the groupings look
correct (e.g., if bot owns Germany and Poland, they should be in the same
landmass).

---

### Step 4.2 — Identify border countries and interior countries

- [x] Add `getBorderCountries(): string[]` — countries the bot owns that are
      adjacent to at least one country it does NOT own
- [x] Add `getInteriorCountries(): string[]` — countries the bot owns where
      ALL adjacent countries are also owned by the bot
- [x] These are derived from the adjacency graph + ownership data
- [x] `debugPrint('[Territory] Slot ' + id + ': borders=' + borders.length + ', interior=' + interior.length, DC.bot)`

**Test:** Watch debug output. Confirm that as the bot (passively via spawners)
captures more territory, border/interior counts change logically.

---

## Phase 5 — Threat Assessment & Target Selection

### Step 5.1 — Global stats: who is the biggest player?

- [x] In `BotManager`, add `updateGlobalStats()` called once per think loop
      tick (before any bot thinks)
- [x] Compute: for each active player, count cities owned
- [x] Track `largestPlayer`, `largestCityCount`, `totalActivePlayers`
- [x] Also compute per-player relative strength:
      `strength[p] = cityCount / totalCities`
- [x] `debugPrint('[Stats] Largest: slot ' + id + ' with ' + count + ' cities (' + pct + '%)', DC.bot)`

**Test:** Watch debug output. Confirm the largest player is correctly
identified and updates as the game progresses.

---

### Step 5.2 — Score enemy border targets

- [x] In `ComputerPlayer`, add `selectTarget()` method
- [x] For each border country the bot owns, look at adjacent countries it does
      NOT own
- [x] Score each potential target:
  - **Prefer weaker neighbors:** targets owned by players with fewer total
    cities score higher
  - **Prefer completing a country group:** if capturing a target would give
    the bot all cities in a country, score higher (continent bonus motivation)
  - **Prefer targets with fewer defending units** (if visible via fog of war)
  - **Avoid attacking the strongest player** unless no other option
- [x] Select the top-scoring target as the current campaign target
- [x] `debugPrint('[Bot] Slot ' + id + ' target: ' + targetCountry + ' (score=' + score + ', owner=slot ' + ownerId + ')', DC.bot)`
- [x] If no adjacency data, pick a random enemy neighbor from any border
      region (fallback)

**Test:** Watch debug output. Confirm the bot picks a sensible target each
think cycle. Verify the target changes when the situation changes (e.g., after
capturing a country).

---

## Phase 6 — Issuing Attack Orders

### Step 6.1 — Find idle units near staging countries

- [x] In `ComputerPlayer`, add `findIdleUnits(nearCountry: Country): unit[]`
- [x] Iterate `trackedData.units`, check each unit's position
- [x] A unit is "near" a country if it's within range of the country's barracks
      or spawner coordinates
- [x] A unit is "idle" if `GetUnitCurrentOrder(unit) == 0` (no current order)
      or if it has 0 movement left (standing still)
- [x] `debugPrint('[Bot] Slot ' + id + ': found ' + idle.length + ' idle units near ' + country.getName(), DC.bot)`

**Test:** Let the bot train units for a few turns without moving them. Confirm
debug output shows idle units accumulating near owned cities.

---

### Step 6.2 — Issue attack-move orders to target

- [x] In `ComputerPlayer`, add `attackStep()` method called from `think()`
- [x] If the bot has a current target (from Step 5.2):
  1. Find idle units in border countries adjacent to the target
  2. Get the target city's barracks position as the destination:
     `GetUnitX(targetCity.barrack.unit)`, `GetUnitY(targetCity.barrack.unit)`
  3. Issue `IssuePointOrder(unit, 'attack', destX, destY)` for each idle unit
  4. Cap at `BOT_MAX_ORDERS_PER_THINK = 20` to avoid lag spikes
  5. Track which units have been ordered this think (don't re-order next think)
- [x] `debugPrint('[Bot] Slot ' + id + ': attacking ' + target + ' with ' + count + ' units', DC.bot)`

**Test:** Watch the bot's units start moving toward enemy territory. Visually
confirm on the map that units attack-move toward the target city. Confirm
guard replacement happens automatically when they arrive (existing trigger).

---

### Step 6.3 — Order batching across ticks

- [x] If more than `BOT_MAX_ORDERS_PER_THINK` units need orders, queue the
      remainder for the next think cycle
- [x] Maintain a `pendingOrders: { unit: unit, x: number, y: number }[]` queue
- [x] At the start of each think, drain up to `BOT_MAX_ORDERS_PER_THINK` from
      the queue before computing new orders
- [x] `debugPrint('[Bot] Slot ' + id + ': ' + pending.length + ' orders queued for next think', DC.bot)`

**Test:** Give the bot many cities (via map editor) so it has lots of units.
Confirm orders are spread across multiple think ticks instead of issuing 100+
orders in one frame.

---

## Phase 7 — Reinforcement & Defense

### Step 7.1 — Move interior units toward the border

- [x] In `ComputerPlayer`, add `reinforceStep()` called from `think()`
- [x] Find idle units in interior countries (no enemy-adjacent borders)
- [x] Move them toward the nearest border country (using adjacency graph to
      find the closest border, then target that country's barracks position)
- [x] Cap at `BOT_MAX_REINFORCE_ORDERS_PER_THINK = 10`
- [x] `debugPrint('[Bot] Slot ' + id + ': reinforcing border, moving ' + count + ' units from interior', DC.bot)`

**Test:** Give the bot a large connected territory. Confirm units in the
center gradually move outward toward the borders. Interior empties over time.

---

### Step 7.2 — Concentrate units toward the active campaign target

- [x] When the bot has a campaign target, not just any border — reinforce
      specifically toward the staging country (the owned country adjacent to the
      target)
- [x] Prefer moving units from non-threatened borders first
- [x] `debugPrint('[Bot] Slot ' + id + ': concentrating ' + count + ' units toward ' + staging + ' for campaign vs ' + target, DC.bot)`

**Test:** Watch the bot build up a staging force near its target before
attacking, rather than spreading units evenly.

---

## Phase 8 — Campaign Lifecycle

### Step 8.1 — Commit to a campaign target

- [x] Add campaign state to `ComputerPlayer`:
  ```typescript
  private campaignTarget: Country | null = null;
  private campaignTicks: number = 0;
  private readonly CAMPAIGN_STALL_THRESHOLD = 10; // think cycles
  ```
- [x] In `selectTarget()`, don't switch targets every think — commit to one
      target until:
  - (a) It's captured (reset campaign), or
  - (b) No progress for `CAMPAIGN_STALL_THRESHOLD` thinks (abandon + pick new)
- [x] Track progress: if the bot's unit count near the target decreases (or
      remains 0) for too many ticks, it's stalled
- [x] `debugPrint('[Bot] Slot ' + id + ': campaign vs ' + target + ' — tick ' + ticks + '/' + threshold, DC.bot)`
- [x] `debugPrint('[Bot] Slot ' + id + ': campaign STALLED, picking new target', DC.bot)`

**Test:** Watch the bot commit to one target for multiple think cycles. If
it's struggling (enemy is stronger), confirm it eventually abandons and picks
a new target.

---

### Step 8.2 — Post-capture: advance or consolidate

- [x] When the bot captures a city (detected via city count change in
      `trackedData`), decide:
  - If the target country now fully belongs to the bot: campaign complete → pick new target
  - If the target country has more cities: continue pushing
  - If the bot is severely weakened (lost >50% of staging units): consolidate
    (stop attacking, train up)
- [x] `debugPrint('[Bot] Slot ' + id + ': captured city in ' + country + ', continuing push', DC.bot)`
- [x] `debugPrint('[Bot] Slot ' + id + ': campaign complete! ' + country + ' fully captured', DC.bot)`

**Test:** Watch the bot capture a multi-city country city by city. After full
capture, confirm it picks a new adjacent target.

---

## Phase 9 — Think Cycle Integration

### Step 9.1 — Assemble the full think cycle

- [x] Wire all steps together in `ComputerPlayer.think()`:

  ```typescript
  think(): void {
    if (!this.status.isAlive() && !this.status.isNomad()) return;

    const gold = GetPlayerState(this.getPlayer(), PLAYER_STATE_RESOURCE_GOLD);
    const cities = this.trackedData.cities.cities.length;
    const units = this.trackedData.units.size;

    debugPrint(`[Bot] Slot ${GetPlayerId(this.getPlayer())} THINK — cities=${cities}, units=${units}, gold=${gold}`, DC.bot);

    // 1. Update territory awareness
    this.territoryTracker.update(this.getOwnedCountries(), adjacencyGraph);

    // 2. Economy — train units
    this.economyStep();

    // 3. Select/update campaign target
    this.selectTarget();

    // 4. Issue attack orders
    this.attackStep();

    // 5. Reinforce toward border/target
    this.reinforceStep();
  }
  ```

- [x] Ensure each sub-step has its own `debugPrint` output (already done in
      prior steps)

**Test:** Full end-to-end. Launch with 2 humans and 2 bots on Europe. Let it
run for 5–10 turns. Watch debug output for the full sequence each think.
Visually confirm:

1. Bots train units
2. Bots pick targets
3. Units move toward targets
4. Bots capture cities
5. Bots switch targets after capture

---

## Phase 10 — Fog of War Compliance

### Step 10.1 — Filter target scoring by visibility

- [ ] When scoring potential targets, check if the bot can see the target
      country: `IsUnitVisible(targetCity.barrack.unit, botPlayer)`
- [ ] If a potential target is in fog, the bot can still select it (it knows
      the country exists from the adjacency graph) but cannot assess its defense
      strength — use a default/pessimistic estimate
- [ ] `debugPrint('[Bot] Slot ' + id + ': target ' + country + ' is in fog, using default threat estimate', DC.bot)`

**Test:** Enable night fog. Confirm bots still function but cannot see inside
fogged territories. Their debug output should show fog-based estimates for
invisible targets.

---

### Step 10.2 — Don't count invisible enemy units

- [ ] When computing "units near target country" for threat assessment, only
      count units the bot can see:
      `IsUnitVisible(enemyUnit, this.getPlayer())`
- [ ] This makes the bot occasionally walk into stronger defenses than
      expected — that's acceptable and realistic

**Test:** Confirm bots sometimes underestimate defense (can see in debug output
when estimated vs actual defending units differ after combat).

---

## Phase 11 — Polish & Stability

### Step 11.1 — Bot elimination handling

- [ ] When a bot loses all cities and units, its `status` transitions to
      `DEAD` through the existing game systems
- [ ] Verify `BotManager` stops calling `think()` for dead bots (the
      `isAlive()` / `isNomad()` check at the start of think handles this)
- [ ] Verify dead bot slots don't corrupt the client redistribution system
- [ ] `debugPrint('[Bot] Slot ' + id + ' eliminated — stopping think loop', DC.bot)`

**Test:** Give one bot very few starting cities. Let a human or other bot
eliminate it. Confirm clean elimination with no crashes.

---

### Step 11.2 — Bot nomad behavior

- [ ] When the bot loses all cities but still has units (nomad state), it
      should try to capture any nearby enemy city to re-establish
- [ ] In `think()`, detect nomad state and switch to "survival mode":
  - Pick the nearest enemy city as target
  - Send all remaining units to attack it
- [ ] `debugPrint('[Bot] Slot ' + id + ' is NOMAD — survival mode, targeting nearest city', DC.bot)`

**Test:** Reduce a bot to 0 cities (via manual kill in debug or letting enemy
overrun). Confirm nomad units try to capture a city.

---

### Step 11.3 — Multiplayer desync testing

- [ ] Test with 2+ human clients connected (LAN or Battle.net)
- [ ] Verify all bot logic is deterministic — no desyncs
- [ ] Ensure no `GetLocalPlayer()` branches exist in bot code
- [ ] Ensure only sync-safe WC3 natives are used (`GetRandomInt`,
      `IssuePointOrder`, etc.)
- [ ] `debugPrint` itself is safe (it's visual-only text display, same across
      all clients)

**Test:** Play a full game with 2 humans + 2 bots in multiplayer. Run for
10+ turns. No desyncs should occur.

---

### Step 11.4 — Scoreboard labeling

- [ ] In `ScoreboardManager` (or wherever player names are rendered), check
      if the player is a computer player and append/prepend a "[Computer]" tag
      to their display name
- [ ] `debugPrint('[Bot] Scoreboard label set for slot ' + id, DC.bot)`

**Test:** Launch with bots. Confirm the scoreboard shows "[Computer]" next to
bot player names, clearly distinguishing them from humans.

---

### Step 11.5 — Performance validation

- [ ] With 4 bots active, monitor for lag spikes during think ticks
- [ ] If lag is observable, reduce `BOT_MAX_ORDERS_PER_THINK` and
      `BOT_MAX_TRAINS_PER_THINK`
- [ ] Add timing instrumentation:
  ```typescript
  const start = os.clock();
  bot.think();
  const elapsed = os.clock() - start;
  debugPrint(`[Bot] Slot ${id} think took ${elapsed * 1000}ms`, DC.bot);
  ```
- [ ] Target: each think cycle under 10ms

**Test:** Run 4 bots for 20+ turns. Confirm no noticeable lag in gameplay.
Debug output shows think times under budget.

---

## Phase 12 — Configuration Constants

### Step 12.1 — Centralize bot tuning values

- [ ] Create `src/configs/bot-settings.ts` with all bot-related constants:
  ```typescript
  export const BOT_THINK_INTERVAL = 2; // seconds between thinks
  export const BOT_MAX_TRAINS_PER_THINK = 5; // max unit trains per think
  export const BOT_MAX_ORDERS_PER_THINK = 20; // max move/attack orders per think
  export const BOT_MAX_REINFORCE_ORDERS = 10; // max reinforce orders per think
  export const BOT_CAMPAIGN_STALL_THRESHOLD = 10; // thinks before abandoning a stalled campaign
  ```
- [ ] Import these constants everywhere instead of hardcoding values

**Test:** Change a constant (e.g., set think interval to 5s). Rebuild.
Confirm behavior matches the new value.

---

---

> **Note on Mode Setup UI:** The analysis (Section 14) calls for mode setup
> states that let the host select how many computer players to add. For this
> first draft, we configure bot slots **manually in the WC3 map editor** by
> setting player slot types to "Computer." A proper in-game mode selection UI
> is deferred to a later iteration.

---

## Summary: Phase Dependency Graph

```
Phase 0 (Scaffolding)
  └─→ Phase 1 (Think Loop)
        ├─→ Phase 2 (Adjacency Data)
        │     └─→ Phase 4 (Territory Awareness)
        │           └─→ Phase 5 (Target Selection)
        │                 └─→ Phase 6 (Attack Orders)
        │                       └─→ Phase 8 (Campaign Lifecycle)
        ├─→ Phase 3 (Economy)
        └─→ Phase 7 (Reinforcement) ← depends on Phase 4 + 5
              └─→ Phase 9 (Integration)
                    └─→ Phase 10 (Fog of War)
                          └─→ Phase 11 (Polish)
                                └─→ Phase 12 (Config)
```

Each phase is independently testable. At the end of each phase, the bot is
in a runnable state — it just does more things as you progress through the
phases.
