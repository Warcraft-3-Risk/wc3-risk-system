# Stand Alone — BotManagerSubsystem Implementation Details

> **Source files:** > `StandAlone/Source/RTS_Map/SubSystem/BotManagerSubsystem.h` > `StandAlone/Source/RTS_Map/SubSystem/BotManagerSubsystem.cpp`

This document breaks down the actual C++ implementation of the Bot Manager — the
global coordinator that schedules all computer players, assigns starting HQs, and
provides shared intelligence (terrain cache, global stats).

---

## Class: `UBotManagerSubsystem`

Extends `UTickableWorldSubsystem` — meaning it ticks every frame via Unreal's
world subsystem framework. Despite ticking every frame, **bot thinking only fires
on a jittered interval**, not per-frame.

---

## Data Structures

### `FGlobalPlayerStats`

Computed once per think cycle and shared with all bots so they don't each
independently scan fortress ownership.

```cpp
struct FGlobalPlayerStats
{
    TMap<int32, int32> TeamFortressCounts;  // TeamID → fortress count
    int32 LargestTeamID;                    // Who owns the most
    int32 LargestTeamSize;                  // How many they own
};
```

Purpose: lets bots know which player is the largest threat without each bot
independently iterating fortress storage.

### `FTerrainCache`

A flattened grid representing the map's terrain for pathfinding and land/water
queries.

| Field                 | Type                | Purpose                                          |
| --------------------- | ------------------- | ------------------------------------------------ |
| `LandCosts`           | `TArray<uint8>`     | Per-cell land traversal cost (255 = impassable)  |
| `NavalCosts`          | `TArray<uint8>`     | Per-cell naval traversal cost (255 = impassable) |
| `GridPositions`       | `TArray<FIntPoint>` | Grid coordinate for each cell                    |
| `XAmount` / `YAmount` | `int32`             | Grid dimensions                                  |
| `CellSize`            | `float`             | World-space size of each cell                    |
| `Origin`              | `FVector`           | World-space origin of the grid                   |

#### Key methods

- **`WorldToCellIndex(Vec2)`** — Converts a world position to a cell index using
  fixed-point floor division. Clamps to grid bounds.
- **`IsDeepWater(CellIdx)`** — Returns `true` if land cost is 255 (impassable
  by land) **and** naval cost is not 255 (passable by sea). This is the test for
  "water that ships can cross but land units cannot."
- **`IsLandBlocked(CellIdx)`** — Returns `true` if land cost is 255. Used to
  determine if land units can reach a location.
- **`GridToIndex(gx, gy)`** — Converts grid coordinates to a flat array index.
  Returns `INDEX_NONE` if out of bounds.

**Layout:** Column-major — `index = gx * YAmount + gy`.

---

## Member Variables

| Variable                       | Type                                           | Default   | Purpose                                                          |
| ------------------------------ | ---------------------------------------------- | --------- | ---------------------------------------------------------------- |
| `RegisteredBots`               | `TArray<TWeakObjectPtr<ABotPlayerController>>` | —         | All registered bot controllers (weak refs to handle destruction) |
| `ThinkIntervalSeconds`         | `float`                                        | `2.0`     | Base interval between bot think cycles                           |
| `TimeSinceLastThink`           | `float`                                        | `0.0`     | Accumulator, incremented each tick                               |
| `BotNextThinkTimes`            | `TMap<BotPtr, float>`                          | —         | Per-bot next-think timestamp (includes jitter)                   |
| `bHQsAssigned`                 | `bool`                                         | `false`   | Whether initial HQ assignment has been done                      |
| `bBotsReady`                   | `bool`                                         | `false`   | Whether all bots have been registered and are ready              |
| `bGlobalStatsUpdatedThisCycle` | `bool`                                         | `false`   | Prevents re-computing stats mid-cycle                            |
| `GlobalStats`                  | `FGlobalPlayerStats`                           | —         | Cached global fortress ownership counts                          |
| `TerrainCache`                 | `FTerrainCache`                                | —         | Shared terrain intelligence pushed to all bots                   |
| `CachedChatManager`            | `AChatManager*`                                | `nullptr` | Cached ref for bot diplomacy messages                            |

---

## Core Methods

### `RegisterBot(ABotPlayerController*)`

Called when a bot controller enters the game.

1. Adds the bot to `RegisteredBots` (de-duplicated).
2. Generates a **random jitter** in range `[-10%, +10%]` of the think interval.
   - At the default 2.0s interval, jitter is ±0.2s.
   - This staggers bot thinking so they don't all fire on the same frame.
3. Stores the jitter as the bot's initial `NextThinkTime`.
4. If the terrain cache is already built, immediately pushes it to the new bot.

### `UnregisterBot(ABotPlayerController*)`

Removes the bot from `RegisteredBots`. Clean and simple.

### `SetThinkInterval(float Seconds)`

Clamps the interval to a minimum of **0.1 seconds** and logs the change. This is
how difficulty or performance tuning can adjust how often bots think.

---

## Tick Loop

`Tick(float DeltaTime)` runs every frame. Here is the exact control flow:

```
Tick(DeltaTime)
│
├─ if no registered bots → return
├─ if bots not ready → return
│
├─ if HQs not assigned yet:
│   └─ if ECS fortresses are initialized → AssignInitialHQs()
│
├─ if match state ≠ InProgress → return (hard gate)
│
├─ TimeSinceLastThink += DeltaTime
│
├─ if global stats not updated this cycle:
│   └─ UpdateGlobalStats()
│
├─ for each registered bot:
│   ├─ skip if bot pointer is stale
│   ├─ skip if NextThinkTime hasn't arrived yet
│   ├─ call Bot→BotThink()
│   └─ reschedule: NextThinkTime = now + interval + new random jitter
│
└─ if any bot thought this tick:
    └─ reset bGlobalStatsUpdatedThisCycle (so stats refresh next cycle)
```

**Key observations:**

- HQ assignment is allowed **before** the match starts (as soon as fortresses
  exist), but actual bot thinking is gated behind `InProgress` match state.
- Global stats are computed **once** per think cycle, before any bot fires.
- Each bot gets its own jittered schedule — they don't all think at once.
- After a bot thinks, its next think time is set to `now + interval ± jitter`,
  with a fresh random jitter each time.

---

## HQ Assignment Algorithm

`AssignInitialHQs()` is one of the most complex methods. Here is the full algorithm:

### Prerequisites

- `bHQsAssigned` must be false
- `bBotsReady` must be true
- ECS subsystem and manager must exist

### Step 1: Collect valid bots

Iterates `RegisteredBots`, filters out stale weak pointers.

### Step 2: Count fortress per country

Iterates the full ECS `FortressStorage`, counts how many fortresses each country
has. This is used to filter candidate HQ countries by size.

### Step 3: Build candidate list

For each bot, iterates all fortresses looking for ones that:

- Are **owned by that bot's team**
- Are in a country with **2–4 fortresses** (small countries only)

Each match becomes a candidate: `{Bot, FortressID, Position, CountryName}`.

### Step 4: Compute centroid

Averages the position of **all** candidates to get a map center reference point.

### Step 5: Bucket into quadrants

Splits candidates into 4 quadrants relative to the centroid:

| Quadrant | Condition                  |
| -------- | -------------------------- |
| Q0 (NW)  | X < centroid, Y < centroid |
| Q1 (NE)  | X ≥ centroid, Y < centroid |
| Q2 (SW)  | X < centroid, Y ≥ centroid |
| Q3 (SE)  | X ≥ centroid, Y ≥ centroid |

### Step 6: Shuffle quadrant order

The visit order of quadrants is **randomly shuffled** each game, so the same map
doesn't always assign HQs to the same corners.

### Step 7: Round-robin assignment

Cycles through quadrants, assigning one HQ per pass. For each quadrant:

1. Find the unassigned candidate that **maximizes minimum distance** to all
   already-assigned HQs.
2. A **minimum distance threshold** of 7000 world units is used — candidates
   passing this threshold are preferred, but if none pass it in a quadrant, the
   best available is still chosen.
3. For the very first assignment (no prior HQs), the candidate **furthest from
   the centroid** is picked — placing the first HQ near a map edge.
4. If a quadrant has no valid candidates, it increments an empty-quadrant
   counter. After 4 empty quadrants in a row, the loop breaks.

### Step 8: Fallback

Any bot that still has no HQ after the round-robin gets assigned **the first
fortress it owns** (any country, any size).

### Result

Bots end up with HQs that are:

- In small, defensible countries (2–4 forts)
- Spread across different quadrants of the map
- Maximally separated from each other
- Randomly varied between games

---

## Terrain Cache Initialization

`InitializeTerrainCache()` is called externally (from the ECS flowfield system)
once the map is loaded.

1. Stores grid dimensions, cell size, and origin.
2. Allocates flat arrays for land costs, naval costs, and grid positions.
3. Copies data from the `CellClass` array (the ECS flowfield representation).
4. **Immediately pushes** the cache to all currently registered bots.

Bots that register later receive it during `RegisterBot()`.

---

## Global Stats Update

`UpdateGlobalStats()` iterates all fortresses once and builds:

- A map of team ID → fortress count
- Tracks which team is the largest (most fortresses)

Skips unclaimed fortresses (team ID 255).

This data is used by bots in their `CheckLargePlayerThreats()` step — they read
`GetGlobalStats()` instead of each independently scanning fortress storage.

---

## Chat Manager Access

`GetChatManager()` lazily finds and caches the `AChatManager` through the first
player controller. This enables bots to participate in diplomacy/chat.

---

## Reset

`Reset()` clears everything:

- Registered bots
- Think schedules
- Timing accumulators
- HQ assignment flags
- Cached chat manager

Called during host migration or game reset scenarios.

---

## Key Design Patterns for Our WC3 Implementation

| Pattern                     | Stand Alone Approach                                                     | WC3 Risk Equivalent                                                                       |
| --------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **Tick → Think separation** | Ticks every frame, but only fires `BotThink()` on a 2s jittered interval | Use a WC3 periodic timer (e.g. `TimerStart` at ~2s) with random offset per bot            |
| **Jittered scheduling**     | ±10% random offset recalculated each cycle                               | Add `GetRandomReal(−0.2, 0.2)` to the timer period                                        |
| **Global stats cache**      | Computed once per cycle, shared read-only                                | Compute fortress counts once at the start of the think round, store in a global Lua table |
| **Terrain cache**           | Flat grid with land/naval costs                                          | We already have adjacency graphs and harbor connections in map JSON — no grid needed      |
| **HQ selection**            | Small country (2–4 forts), quadrant-spread, max-separation               | Select from our region graph; prioritize small continents; spread across map quadrants    |
| **Weak references**         | `TWeakObjectPtr` to handle bot destruction                               | Store bot player IDs; check `GetPlayerSlotState()` before acting                          |
| **Match-state gating**      | No bot commands until `InProgress`                                       | Gate bot timer start behind our game-state check                                          |

---

## Numbers Worth Noting

| Constant               | Value                 | Context                                   |
| ---------------------- | --------------------- | ----------------------------------------- |
| Default think interval | **2.0 seconds**       | Coarse strategic decisions, not per-frame |
| Jitter range           | **±10%** of interval  | Prevents synchronized bot spikes          |
| Minimum think interval | **0.1 seconds**       | Hard floor via `SetThinkInterval`         |
| HQ country size filter | **2–4 fortresses**    | Only small countries are HQ candidates    |
| HQ min separation      | **7000 world units²** | Preferred distance between bot HQs        |
| Unclaimed team ID      | **255**               | Skipped in global stats                   |
