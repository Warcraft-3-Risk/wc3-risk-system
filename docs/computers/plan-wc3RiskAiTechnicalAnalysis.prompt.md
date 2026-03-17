# Implementing Computer Players in WC3 Risk — Technical Analysis

> Compares the Stand Alone bot architecture (Unreal Engine 5.6 / C++ / ECS) with
> our WC3 Risk system (Warcraft III / TypeScript-to-Lua) and identifies the
> concrete technical challenges, engine limitations, and proposed solutions for
> bringing computer players to our game.

---

## 1. Engine Comparison at a Glance

| Capability     | Unreal Engine (Stand Alone)                    | Warcraft III (Our Game)                                                            |
| -------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| Language       | C++                                            | TypeScript → Lua (transpiled)                                                      |
| Tick model     | Per-frame tick (~60–120 Hz)                    | Timer callbacks (1s base)                                                          |
| Networking     | Dedicated server / P2P with authority          | Deterministic lockstep (all clients must agree)                                    |
| Player model   | Dynamic controller spawning                    | Fixed 24 player slots (`Player(0)` – `Player(23)`); slot 23 reserved for observers |
| Data access    | ECS component storage (direct array iteration) | Object-handle queries + Lua tracking tables                                        |
| Pathfinding    | Flowfield grid with land/naval cost layers     | WC3 built-in pathing (no programmatic access to navmesh)                           |
| Unit orders    | C++ intention system → ECS executes            | `IssuePointOrder()` / `IssueImmediateOrderById()` natives                          |
| Random numbers | `FMath::FRandRange` (replicated)               | `GetRandomReal()` / `GetRandomInt()` (sync-safe in game context)                   |
| Memory budget  | Gigabytes                                      | ~16,000 Lua locals; practical unit ceiling ~2,000                                  |

---

## 2. Critical Challenge: Player Slot Architecture

### The Problem

Stand Alone can spawn `ABotPlayerController` objects dynamically — one per
computer player, each with its own team ID. WC3 has a **fixed pool of 24 player
slots**, and there is no API to create new ones at runtime.

### Our Situation

We already use a **multi-client system** (`ClientManager`) that lets one human
control multiple WC3 player slots. When a human player is eliminated, their
slots are freed and redistributed. This means:

- Player slots are a **shared, finite resource**.
- **Slot 23 is reserved for observers** — so we can have at most 23 actual
  players and computers (indices 0–22).
- Every slot given to a bot is one fewer slot available for human multi-client
  distribution (which reduces unit lag for humans).
- Bots need **at least one dedicated slot each** to own cities and units.

### Interaction with the Unit-Lag Shared Player Slot Mechanic

The existing unit-lag system only allocates **empty, dead, and leaver** slots.
It already treats active human and computer slots as active and non-eliminated,
so they are never candidates for redistribution. **No special changes are needed
to the multi-client pool logic to accommodate computer players.** The bot slots
simply stay active and the unit-lag system ignores them naturally.

### Proposed Solution

**Reserve bot slots at map setup time.** Before the game starts (during mode
selection), determine how many computer players are requested and reserve that
many slots from the pool. These slots are excluded from the multi-client
redistribution algorithm.

```
Total slots: 24 (indices 0–23)
Slot 23: reserved for observers
Minus neutral slots: ~2 (NEUTRAL_HOSTILE, NEUTRAL_PASSIVE)
Available: ~21

Example: 4 humans + 2 bots
  → Humans get slots 0–3 (+ multi-client extras from pool)
  → Bots get slots 4–5 (reserved, not redistributed)
  → Remaining slots → multi-client pool for humans
```

**Key constraint:** Each additional bot reduces the multi-client pool by 1 slot,
slightly increasing unit lag for humans. We should cap bots at a reasonable
number (e.g., max 4–6 computer players).

### What Needs to Change

- `ClientManager.getAvailableClientSlots()` must **exclude reserved bot slots**.
- `PlayerManager` needs a concept of "bot player" vs "human player."
- Map setup (`.w3i` file) may need pre-configured slot states, or we set them
  in Lua during init.

---

## 3. Critical Challenge: Deterministic Lockstep Sync

### The Problem

WC3 multiplayer uses **deterministic lockstep** — every client runs the exact
same game logic and must produce identical results. If any client diverges, the
game desyncs and everyone disconnects.

Stand Alone doesn't have this constraint because it uses server-authoritative
networking — the bot runs on the host and sends commands.

### What This Means for Bots

**All bot logic must be deterministic across all clients.** Every player's
machine runs the bot AI simultaneously, and they must all make the same
decisions and issue the same orders.

Specifically:

| Operation                                         | Safe?         | Notes                                        |
| ------------------------------------------------- | ------------- | -------------------------------------------- |
| `GetRandomReal()` / `GetRandomInt()`              | **Yes**       | WC3 syncs the RNG seed across clients        |
| `IssuePointOrder()` / `IssueImmediateOrderById()` | **Yes**       | Queued through the sync system               |
| `SetPlayerState()` (gold)                         | **Yes**       | Deterministic state change                   |
| `SetUnitOwner()`                                  | **Yes**       | Already used throughout our code             |
| Reading unit positions (`GetUnitX/Y`)             | **Yes**       | Deterministic in game context                |
| `BlzSendSyncData()`                               | **No**        | Observers cannot use it; not needed for bots |
| Local file I/O                                    | **No**        | Non-deterministic; debug only                |
| `GetLocalPlayer()` conditional logic              | **Dangerous** | Only for visual-only changes (UI, sound)     |

### Proposed Solution

- Bot think logic runs on **every client simultaneously** (same as all other
  game logic).
- Use only WC3's built-in `GetRandomReal()` / `GetRandomInt()` for any
  randomness in bot decisions — this is already sync-safe.
- Never branch on `GetLocalPlayer()` inside bot logic.
- Test in multiplayer early and often to catch desyncs.

---

## 4. Critical Challenge: No Adjacency Graph

### The Problem

Stand Alone has a full `FTerrainCache` — a flat grid with per-cell land/naval
costs, world-to-cell coordinate conversion, and deep-water/land-blocked queries.
This lets bots reason about whether two territories are connected by land or
separated by water.

**We have none of this.** Our territory data is defined purely as coordinate
lists in TypeScript configs (`src/configs/terrains/world.ts`). There is no
adjacency information — no record of which countries border which.

WC3's built-in pathfinding is opaque: you can order a unit to move somewhere,
but you can't query the navmesh to check if a path exists.

### Why This Matters

The Stand Alone bot's **entire strategic model** depends on knowing:

1. Which territories are adjacent by land (for staging invasions).
2. Which territories are separated by water (requiring naval transport).
3. Whether a captured territory connects to the bot's mainland or is isolated.

Without this data, the bot cannot distinguish "expand by land" from "launch a
naval invasion" — the core of its decision-making.

### Decision: Static Adjacency Graph (Option A)

We are going with **Option A — manually defined adjacency per map.** It's a
small, well-bounded task and gives us full control.

#### Design: Separate, Expandable Adjacency Data

Adjacency data is defined as a **separate data file per map** that developers
can add to and expand over time. If adjacency data is missing for a map (or
incomplete), the AI will simply play suboptimally — it won't crash or break.
This is an acceptable trade-off that lets us ship a working bot before all maps
have complete adjacency data.

```typescript
// src/configs/adjacency/europe-adjacency.ts
export const EuropeAdjacency: Record<string, { land: string[] }> = {
	France: {
		land: ['Spain', 'Belgium', 'Germany', 'Switzerland', 'Italy'],
	},
	UK: {
		land: ['Normandy'], // Land bridge
	},
	// ...
};
```

If a map has no adjacency file, the bot falls back to a naive strategy (e.g.,
attack any enemy territory it owns units near, without strategic pathfinding).

#### Europe Map: Known Adjacency Exceptions

The Europe map adjacency should be based on real-world geography with the
following **non-obvious land bridge connections** that exist in our map:

| Connection                   | Type        |
| ---------------------------- | ----------- |
| UK ↔ Normandy               | Land bridge |
| Sicily ↔ Southern Italy     | Land bridge |
| Northern Ireland ↔ Scotland | Land bridge |
| Sweden ↔ Denmark            | Land bridge |
| Spain ↔ Morocco             | Land bridge |
| Sardegna ↔ Corse ↔ Italy   | Land bridge |

And one **notable non-connection:**

| Non-connection   | Note                                     |
| ---------------- | ---------------------------------------- |
| Libya ↔ Tunisia | **Not connected** despite real proximity |

---

## 5. Challenge: Unit Training / Purchasing

### Stand Alone

Reads gold from ECS `GoldSystem`, then spawns units at fortresses with per-think
caps (`BotMaxSpawnsPerThink`). The bot directly creates entities in ECS.

### Our System

Units are trained at **barracks buildings** (one per city). Training is triggered
via `IssueImmediateOrderById(barracksUnit, unitTypeId)` — the standard WC3
mechanism. The bot must:

1. Check if it has enough gold: `GetPlayerState(botPlayer, PLAYER_STATE_RESOURCE_GOLD)`.
2. Know the cost of each unit type (hardcoded or read from `BlzGetUnitIntegerField`).
3. Issue a train order to each barracks it owns: `IssueImmediateOrderById(barracks, UNIT_ID.RIFLEMEN)`.
4. Respect a per-think cap to avoid flooding the map with units.

### Key Differences from Stand Alone

| Concern        | Stand Alone                   | WC3 Risk                                             |
| -------------- | ----------------------------- | ---------------------------------------------------- |
| Unit creation  | Direct ECS entity creation    | `IssueImmediateOrderById()` on barracks              |
| Gold check     | `CurrentGold()` from ECS      | `GetPlayerState(player, PLAYER_STATE_RESOURCE_GOLD)` |
| Training queue | Instant (ECS spawn)           | WC3 has a build queue with training time             |
| Per-think cap  | `BotMaxSpawnsPerThink` config | We must implement our own cap                        |
| Which barracks | All owned fortresses          | Must iterate `City[]` owned by bot                   |

### Training Time Issue

WC3 barracks have a **build time** — units don't appear instantly. If the bot
issues 10 train orders at once, they queue up. This means:

- The bot can't get an accurate count of "units being trained" easily.
- Overqueuing wastes gold (gold is deducted immediately).
- We need a **queue budget** per barracks, not just a global spawn cap.

**Proposed approach:** Track orders issued per barracks this think cycle. Limit
to 1–2 train orders per barracks per think. This naturally rate-limits production
without needing to query the build queue.

---

## 6. Challenge: Naval Transport _(Deferred — Not in First Draft)_

> **Status:** Low priority. Transport is a critical aspect of the full
> implementation, but it is explicitly excluded from the first draft. The bot
> will initially operate as a land-only AI. Naval transport support will be
> added in a later iteration.

### Stand Alone

Has a dedicated `ENavalInvasionState` pipeline with states (`SpawningTransport`,
`Loading`, `InTransit`, `Unloading`), claimed transport/escort IDs, and explicit
harbor-to-harbor routing.

### Our System

Transport is **player-initiated** — a human clicks the Transport Patrol ability
to set a route. The `TransportManager` then runs a state machine per transport
(`LOADING` → `MOVING` → `UNLOADING` → `RETURNING`).

For bots, we need to **programmatically activate transport routes.**

### What the Bot Must Do

1. **Build transports:** Issue train order at port barracks:
   `IssueImmediateOrderById(portBarracks, UNIT_ID.TRANSPORT_SHIP)`.
2. **Set patrol route:** The existing `TransportManager` activates via a spell
   cast trigger. The bot can't "cast" the ability — we need to either:
   - (a) Add a programmatic API to `TransportManager` that accepts origin/destination
     coordinates and sets up the patrol without a spell cast, or
   - (b) Use `IssuePointOrder(transport, 'patrol', destX, destY)` if the
     transport patrol can be triggered that way.
3. **Load units:** Move land units near the transport (within 450 range) and
   rely on the existing autoload system.
4. **Unload at destination:** The patrol state machine handles this automatically.

### Proposed API Addition

```typescript
// TransportManager addition
public startBotPatrol(transport: unit, originX: number, originY: number,
                      destX: number, destY: number): void {
  // Same logic as spell-cast handler, but called programmatically
}
```

This avoids hacking the spell-cast trigger and keeps the bot's transport logic
clean.

---

## 7. Challenge: No Per-Frame Tick

### Stand Alone

`UBotManagerSubsystem` ticks **every frame** but only fires `BotThink()` on a
jittered ~2s interval. This gives sub-frame timing precision for staggering bots.

### Our System

Our base timer granularity is **1 second** (`TimedEventManager` ticks at 1s).
We can create additional WC3 timers with sub-second intervals, but:

- More timers = more overhead.
- Sub-second precision isn't needed for strategic AI.
- The 1s TimedEventManager is the established pattern.

### Proposed Approach

Use the **existing `TimedEventManager`** with a 2–3 second duration per bot
think event. We will **not go below 1-second timer intervals** for bot ticks,
and we will **not use jitter.** Simple round-second staggering is sufficient:

```
Bot 0: fires at t=0, t=2, t=4, ...
Bot 1: fires at t=1, t=3, t=5, ...
Bot 2: fires at t=2, t=4, t=6, ...
```

Since `TimedEventManager` fires callbacks every 1 second, we can track
per-bot timers internally:

```typescript
// Inside BotManager
private botThinkCounters: Map<ActivePlayer, number> = new Map();
private readonly THINK_INTERVAL = 2;  // 2 ticks = 2 seconds

onTick() {
  for (const [bot, counter] of this.botThinkCounters) {
    if (counter <= 0) {
      bot.think();
      this.botThinkCounters.set(bot, this.THINK_INTERVAL);
    } else {
      this.botThinkCounters.set(bot, counter - 1);
    }
  }
}
```

Each bot is registered with a different initial offset (e.g., bot 0 starts at 0,
bot 1 starts at 1) to ensure they don't all think on the same tick.

---

## 8. Challenge: Territory Connectivity Tracking

### Stand Alone

Maintains per-bot strategic state: `FortressLandmass` mapping, `MainlandName`,
connected-territory merging, and landmass-aware expansion.

### Our Challenge

We have no equivalent. Our `Country` tracks ownership and `Region` tracks
country grouping, but there's no concept of "connected territory" or
"mainland vs. island holdings." The bot needs to know:

- Which of its territories form a single connected block.
- Whether a target country is reachable by land or only by sea.
- When two previously-separate holdings merge.

### Proposed Design

Build a **connectivity tracker** per bot using the adjacency graph from
Section 4:

```typescript
class BotTerritoryTracker {
  private landmasses: Map<string, Set<string>> = new Map();
  // landmassId → set of country names

  updateConnectivity(ownedCountries: string[], adjacency: AdjacencyGraph) {
    // BFS/DFS from each owned country using only land adjacencies
    // Group connected countries into landmasses
    // Detect merges and splits
  }

  isLandReachable(from: string, to: string): boolean { ... }
  getMainland(): Set<string> { ... }  // Largest connected group
}
```

This runs once per think cycle (every 2–3 seconds) and touches only the
adjacency data + ownership list — no unit iteration, very cheap.

---

## 9. Challenge: Asset Discovery (Finding What the Bot Owns)

### Stand Alone

`FindMyAssets()` iterates ECS `FortressStorage` and `MovementStorage` to rebuild
the bot's ownership snapshot every think cycle.

### Our System

We already track ownership in Lua tables:

| What            | Where                                                | How to Query                |
| --------------- | ---------------------------------------------------- | --------------------------- |
| Cities owned    | `ActivePlayer.trackedData.cities`                    | Direct array                |
| Countries owned | `ActivePlayer.trackedData.countries`                 | Map of Country → city count |
| Units owned     | `ActivePlayer.trackedData.units`                     | Set of unit handles         |
| Gold            | `GetPlayerState(player, PLAYER_STATE_RESOURCE_GOLD)` | WC3 native                  |
| Income          | `ActivePlayer.trackedData.income.income`             | Direct property             |

**This is already solved.** The bot can read its ownership state directly from
the `ActivePlayer` instance — no ECS-style iteration needed.

The one gap is **unit enumeration by location.** If the bot needs to find "idle
units near country X," it must iterate its unit set and check positions. This is
O(n) per query. For a bot with ~200 units, this is fine at 2s intervals.

---

## 10. Challenge: Issuing Attack / Move Commands

### Stand Alone

Bot issues "intentions" — attack group assignments and movement targets — and
the ECS systems execute them.

### Our System

The bot must issue **explicit WC3 unit orders:**

```typescript
// Move unit to a location
IssuePointOrder(unit, 'move', x, y);

// Attack-move to a location (engages enemies along the way)
IssuePointOrder(unit, 'attack', x, y);

// Smart order (attack if enemy, move if empty)
IssuePointOrder(unit, 'smart', x, y);
```

### Concerns

1. **Order flooding:** Issuing hundreds of orders in one think tick could cause
   a brief lag spike. Solution: batch orders across multiple ticks (e.g., 20
   orders per tick maximum).

2. **Order interruption:** If the player (or another bot tick) issues a new
   order, the old one is cancelled. We need the bot to not re-issue orders to
   units that are already executing the right command.

3. **Guard replacement:** When a bot unit enters a city region, the existing
   `EnterRegionEvent` handles guard replacement automatically. The bot doesn't
   need to manage this — just send units to the target city's location.

4. **Where to send units:** Target coordinates should be the **barracks position
   of the target city** (center of the region). This is available from
   `city.barrack.unit` → `GetUnitX/Y`.

---

## 11. Challenge: HQ Selection

### Stand Alone

Uses centroid calculation, quadrant bucketing, shuffled visit order, and
max-separation assignment with a 7000-unit distance threshold.

### Our Simplification

We don't need the full quadrant-separation algorithm because:

- Our maps have well-defined continents/regions.
- Country sizes are already known from config data.
- We can leverage the `Region` hierarchy (continents) to spread bots.

**Proposed HQ selection:**

1. Collect countries owned by the bot.
2. Filter to countries with 2–4 cities (same as Stand Alone).
3. Prefer countries in **different regions** from other bots' HQs.
4. If multiple candidates in the same region, pick the one **furthest
   from existing bot HQs** (simple distance calculation from spawner coords).
5. Fallback: any owned country.

This is simpler than the quadrant algorithm but achieves the same goal:
spread bots across the map.

---

## 12. Challenge: Threat Assessment

### Stand Alone

`UpdateGlobalStats()` scans all fortresses once per cycle and tracks the largest
team (most fortress count).

### Our Equivalent

Trivial to implement. We already have `ActivePlayer.trackedData.cities` (array
of owned cities) for every player. Once per think cycle:

```typescript
function computeGlobalStats(): { largestPlayer: ActivePlayer; largestSize: number } {
	let largest = null;
	let maxCities = 0;
	for (const player of PlayerManager.getInstance().getActivePlayers()) {
		const count = player.trackedData.cities.length;
		if (count > maxCities) {
			maxCities = count;
			largest = player;
		}
	}
	return { largestPlayer: largest, largestSize: maxCities };
}
```

No ECS iteration needed — our tracking data is already maintained by the
ownership-change event cascade.

---

## 13. Performance Budget

### Estimated Work Per Bot Think Cycle

| Operation                           | Cost                                             | Frequency      |
| ----------------------------------- | ------------------------------------------------ | -------------- |
| Read owned cities/countries         | O(1) lookups                                     | Every cycle    |
| Update territory connectivity (BFS) | O(countries) ~40–60 nodes                        | Every cycle    |
| Enumerate owned units               | O(units) ~100–300                                | Every cycle    |
| Score invasion candidates           | O(countries × adjacency) ~200                    | Every cycle    |
| Issue train orders                  | O(owned barracks) ~5–15                          | Every cycle    |
| Issue move/attack orders            | O(idle units) ~50–100                            | Every cycle    |
| **Total per bot**                   | **~500–700 table lookups + ~30–50 native calls** | **Every 2–3s** |

For 4 bots thinking at staggered 2s intervals, this means roughly **1 bot think
per 0.5 seconds**, each doing ~500–700 operations. This is well within the Lua
VM's capacity for a single tick.

---

## 14. Summary: What Needs to Be Built

### New Components

| Component                            | Purpose                                                     | Complexity       |
| ------------------------------------ | ----------------------------------------------------------- | ---------------- |
| **BotManager**                       | Register bots, staggered timer scheduling, global stats     | Low              |
| **BotPlayer** (extends ActivePlayer) | Per-bot brain with think cycle                              | High             |
| **AdjacencyGraph**                   | Static land connections per map (separate, expandable data) | Low (data entry) |
| **TerritoryTracker**                 | Connected-territory model per bot                           | Medium           |
| **InvasionPlanner**                  | Target scoring, campaign commitment, stall detection        | High             |
| **BotEconomy**                       | Train orders with per-barracks budget                       | Low              |
| ~~**BotNavalManager**~~              | ~~Programmatic transport route creation~~ _(Deferred)_      | ~~Medium~~       |
| **BotOrderBatcher**                  | Rate-limit orders to avoid lag spikes                       | Low              |

### Modifications to Existing Code

| File                   | Change                                                      |
| ---------------------- | ----------------------------------------------------------- |
| `ClientManager`        | Exclude reserved bot slots from redistribution              |
| `PlayerManager`        | Support bot player type; skip bot slots in human logic      |
| ~~`TransportManager`~~ | ~~Add programmatic patrol API for bots~~ _(Deferred)_       |
| `GameLoopState`        | Hook bot manager into the game loop (or use separate timer) |
| Terrain configs        | Add separate adjacency data files per map (expandable)      |
| Mode setup states      | Allow selecting number of computer players                  |

### What We Get for Free

- City ownership tracking (already event-driven).
- Income and gold distribution (already per-player).
- Guard replacement (already trigger-driven).
- Unit death cleanup (already handled).
- Victory condition checks (already includes all players).
- Spawner system (already per-country).

---

## 15. Open Technical Questions

1. **Bot slot visibility:** Should bot player slots be visible in the scoreboard
   and diplomacy panel? We may need UI changes to label them as "[Computer]."

2. **Difficulty scaling:** Stand Alone uses game-mode tuning values
   (`BotMaxSpawnsPerThink`, `BotMaxAttackGroupsPerThink`). We need to define
   difficulty presets — how many trains per think, how aggressive the target
   scoring, how quickly to abandon stalled invasions.

3. **~~Alliance behavior:~~** ✅ **Decided: FFA only.** Bots do not respect
   alliances or truces. They treat every other player as an enemy. Diplomacy
   support may be added in a future iteration, but is out of scope for now.

4. **~~Fog of war:~~** ✅ **Decided: Bots respect fog of war.** Bots will only
   act on information visible to their player slot, not omniscient game state.
   This means the bot must query only units/territories it has vision of. This
   is more challenging than perfect information but more fair to human players.

5. **~~Leaver replacement:~~** ✅ **Decided: No.** Bots will **not** take over
   for a human who leaves. Leaver slots are handled by the existing unit-lag
   system. A bot is always a fresh computer player from game start.
