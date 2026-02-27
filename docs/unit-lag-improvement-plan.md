# Unit Lag Improvement Plan: Multi-Client Slot Distribution

## Goal

Improve the client slot allocation system so that **multiple client slots can be assigned to a single player**, and units are distributed across all available slots using a **lowest-unit-count** strategy. When a player is eliminated (while below 11 total players), their freed client slots are redistributed equally among remaining players.

---

## Current State

- Each active player gets **exactly 1 client slot** (1:1 mapping in `playerToClient`)
- Allocation runs **once** on Turn 1 (`hasAllocated` flag in `ClientManager`)
- `getClientOrPlayer(player)` always returns the same single client slot
- Spawned units go to the client slot; trained units stay on the barracks owner (which is the client slot since barracks are owned by `ClientManager.getOwner(player)`)
- When players are eliminated (DEAD/LEFT), their client slots are **not reclaimed**

---

## Execution Plan

### Phase 1: Unit Counting Per Player Slot

**Objective:** Track the number of units owned by each WC3 player slot (both real players and client slots) in real time.

#### Task 1.1: Add unit count tracking to `ClientManager`

**File:** [src/app/game/services/client-manager.ts](src/app/game/services/client-manager.ts)

- Add a `Map<player, number>` field called `slotUnitCounts` to track how many active units each player slot (real player + all their client slots) currently owns.
- Initialize counts to `0` for all allocated slots.
- Add methods:
  - `incrementUnitCount(slot: player): void` — increments the count for a given slot.
  - `decrementUnitCount(slot: player): void` — decrements the count for a given slot (floor at 0).
  - `getUnitCount(slot: player): number` — returns the current count.
  - `getSlotWithLowestUnitCount(player: player): player` — given a real player, returns the player slot (real player handle or one of their client slots) with the **lowest unit count**. This replaces the current `getClientOrPlayer()` behavior.

#### Task 1.2: Increment count on city distribution (guards)

Guards are initially created under `NEUTRAL_HOSTILE` in `Guard.build()`. During city distribution, ownership is transferred to the real player via `SetUnitOwner()` in two places:

**File:** [src/app/game/services/distribution-service/standard-distribution-service.ts](src/app/game/services/distribution-service/standard-distribution-service.ts#L147)

- In `changeCityOwner()`, after `SetUnitOwner(city.guard.unit, player.getPlayer(), true)`:
  - Call `ClientManager.getInstance().incrementUnitCount(player.getPlayer())`.

**File:** [src/app/game/game-mode/capital-game-mode/capitals-distribute-capitals-state.ts](src/app/game/game-mode/capital-game-mode/capitals-distribute-capitals-state.ts#L88)

- In `changeCityOwner()`, after `SetUnitOwner(city.guard.unit, player.getPlayer(), true)`:
  - Call `ClientManager.getInstance().incrementUnitCount(player.getPlayer())`.

**Note:** At distribution time, client slots have not been allocated yet (that happens on Turn 1). So guards are counted against the real player's slot. Once `evaluateAndRedistribute()` runs, it will see these counts and factor them in when distributing client slots.

Additionally, guards can transition between players at runtime via:
- `Guard.replace()` — called from [replace-guard.ts](src/app/triggers/unit_death/replace-guard.ts), [land-city.ts](src/app/city/land-city.ts#L50), [port-city.ts](src/app/city/port-city.ts#L43), and [city.ts](src/app/city/city.ts#L125) (cast handler)
- `Guard.reset()` → removes old guard + creates new one under `NEUTRAL_HOSTILE`

For `replace()`: the old guard is released (decrement old slot) and the new guard is set (no new unit created — it's an existing unit getting the GUARD type). The unit was already counted when it was spawned/trained, so **no additional increment is needed** — just ensure the old DUMMY_GUARD removal triggers a decrement if it was counted.

For `reset()`: the old guard is `RemoveUnit`'d (decrement old slot) and a new one is created under `NEUTRAL_HOSTILE` (no increment — neutral units aren't counted).

#### Task 1.3: Increment count on unit spawn

**File:** [src/app/spawner/spawner.ts](src/app/spawner/spawner.ts)

- In `Spawner.step()` ([line 77-85](src/app/spawner/spawner.ts#L77-L85)), after `CreateUnit(...)`:
  - Call `ClientManager.getInstance().incrementUnitCount(owningSlot)` where `owningSlot` is the slot returned by the new lowest-count method.

#### Task 1.4: Increment count on unit train

**File:** [src/app/triggers/unit-trained-event.ts](src/app/triggers/unit-trained-event.ts)

- In `UnitTrainedEvent()`, after the trained unit is created:
  - Call `ClientManager.getInstance().incrementUnitCount(GetOwningPlayer(trainedUnit))`.

#### Task 1.5: Decrement count on unit death

**File:** [src/app/triggers/unit_death/unit-death-event.ts](src/app/triggers/unit_death/unit-death-event.ts)

- In the death event handler, when a unit dies:
  - Call `ClientManager.getInstance().decrementUnitCount(GetOwningPlayer(dyingUnit))` (using the raw WC3 owner, not the resolved real player, since we're tracking per-slot).

#### Task 1.6: Decrement count on unit removal

- Ensure any other code path that removes units (`RemoveUnit`, transport loading, etc.) also decrements the count. Key locations:
  - [src/app/managers/transport-manager.ts](src/app/managers/transport-manager.ts) — when units are loaded/unloaded from transports.
  - [src/app/spawner/spawner.ts](src/app/spawner/spawner.ts) `reset()` — when spawner is reset and units are cleared.

---

### Phase 2: Spawn Units to Lowest-Count Slot

**Objective:** Replace the current `getClientOrPlayer()` call with a method that picks the slot with the fewest units.

#### Task 2.1: Change `playerToClient` from `Map<player, client>` to `Map<player, client[]>`

**File:** [src/app/game/services/client-manager.ts](src/app/game/services/client-manager.ts)

- Change the mapping so a single real player can have **multiple** client slots.
- Update `clientToPlayer` to remain `Map<client, player>` (many-to-one is fine).
- Update all existing methods that read `playerToClient` to handle arrays:
  - `getClientByPlayer` — return the array or first element depending on usage.
  - `getClientOrPlayer` → rename/replace with `getSlotWithLowestUnitCount(player)`.
  - `isPlayerOrClientOwnerOfUnit` — check against all client slots.
  - `reset()` — clear all arrays.

#### Task 2.2: Update `Spawner.step()` to use lowest-count slot

**File:** [src/app/spawner/spawner.ts](src/app/spawner/spawner.ts#L78)

- Replace:
  ```typescript
  ClientManager.getInstance().getClientOrPlayer(this.getOwner())
  ```
  With:
  ```typescript
  ClientManager.getInstance().getSlotWithLowestUnitCount(this.getOwner())
  ```

#### Task 2.3: Update `UnitTrainedEvent` to reassign trained unit if needed

**File:** [src/app/triggers/unit-trained-event.ts](src/app/triggers/unit-trained-event.ts)

- Trained units are created by the WC3 engine under the barracks' owner. After training, if the barracks owner isn't the optimal slot, call `SetUnitOwner(trainedUnit, optimalSlot, true)` to move it to the lowest-count slot.
- **Important:** The barracks itself is owned by the client slot (set in `Spawner.setOwner()`). We need to decide whether to reassign ownership or leave trained units on the barracks' slot. The simplest approach is to reassign post-train.

---

### Phase 3: General Redistribution Algorithm

**Objective:** Create a single, reusable algorithm that determines when slots can be freed and how to optimally distribute all available slots among active players. This replaces ad-hoc per-event logic with a unified routine.

#### Design: The `evaluateAndRedistribute()` Algorithm

The core idea is a **single entry-point method** that can be called from any event (player elimination, unit death, turn start, etc.) and always produces the correct result. It is idempotent — calling it multiple times with no state change is a no-op.

```
evaluateAndRedistribute(): boolean
│
├── 1. COLLECT: Build the current picture
│   ├── activePlayers[]        ← players with status ALIVE or NOMAD
│   ├── eliminatedPlayers[]    ← players with status DEAD, LEFT, or STFU
│   ├── assignedSlots          ← all slots currently in playerToClient (across all players)
│   └── unassignedSlots[]      ← empty WC3 player slots not assigned to anyone
│
├── 2. FREE: Identify reclaimable slots from eliminated players
│   ├── For each eliminated player:
│   │   ├── Get their client slots from playerToClient
│   │   ├── For each client slot:
│   │   │   ├── IF slotUnitCount[slot] == 0:
│   │   │   │   ├── Tear down alliances with the eliminated player
│   │   │   │   ├── Remove from playerToClient and clientToPlayer
│   │   │   │   └── Add to availablePool[]
│   │   │   └── ELSE:
│   │   │       └── Mark as "pendingFree" (keep in maps, but flag for future check)
│   │   └── Also free the eliminated player's OWN handle if slotUnitCount == 0
│   │       (their real player slot becomes available as a client slot for others)
│   └── availablePool[] now contains all immediately reclaimable slots
│
├── 3. CALCULATE: Determine optimal distribution
│   │
│   │  totalSlots = assignedSlots.count + availablePool.count
│   │  slotsPerPlayer = floor(totalSlots / activePlayers.count)
│   │  remainder = totalSlots % activePlayers.count
│   │
│   │  Target: each player gets slotsPerPlayer slots,
│   │          the first `remainder` players (by ID) get slotsPerPlayer + 1
│   │
│   ├── For each active player, compute:
│   │   ├── currentSlotCount = playerToClient[player].length
│   │   ├── targetSlotCount  = slotsPerPlayer (+ 1 if in remainder group)
│   │   └── delta = targetSlotCount - currentSlotCount
│   │
│   ├── IF all deltas == 0 → no redistribution needed → return false
│   │
│   ├── Players with delta < 0 are "donors" (have excess slots)
│   │   └── Only donate slots where slotUnitCount == 0
│   │       (slots with units CANNOT be moved — skip and accept imbalance)
│   │
│   └── Players with delta > 0 are "receivers"
│
├── 4. EXECUTE: Perform the redistribution
│   ├── Collect donated slots from donors (tear down old alliances)
│   ├── Merge donated slots into availablePool
│   ├── For each receiver (sorted by fewest slots first):
│   │   ├── Assign slots from availablePool up to their delta
│   │   ├── Add to playerToClient[player] and clientToPlayer
│   │   └── Call givePlayerFullControlOfClient(player, slot)
│   └── Any leftover slots in availablePool remain unassigned
│       (can happen when donors couldn't free slots due to living units)
│
└── 5. FINALIZE
    ├── Update scoreboard (toggle off → on + full update)
    └── Return true (redistribution occurred)
```

#### Properties of this algorithm

| Property | Description |
|----------|-------------|
| **Idempotent** | Safe to call repeatedly — if nothing changed, it returns `false` and does nothing |
| **Event-agnostic** | Works for any trigger: player death, player leave, unit death, turn start, manual invocation |
| **Respects unit constraint** | Never moves a slot that still has living units; accepts temporary imbalance instead |
| **Self-healing** | When a "pendingFree" slot later reaches 0 units, the next call to `evaluateAndRedistribute()` will pick it up |
| **Fair distribution** | Uses floor division + remainder to distribute as equally as possible |

#### Task 3.1: Implement `evaluateAndRedistribute()` in `ClientManager`

**File:** [src/app/game/services/client-manager.ts](src/app/game/services/client-manager.ts)

- Implement the algorithm above as a public method.
- Add a `pendingFreeSlots: Set<player>` field to track slots that belong to eliminated players but still have units.
- Add helper methods:
  - `getActivePlayers(): player[]` — returns players with ALIVE or NOMAD status.
  - `getSlotsForPlayer(player): player[]` — returns `[player, ...playerToClient[player]]` (all slots a player can use).
  - `tearDownSlot(slot: player, previousOwner: player): void` — removes alliances and cleans up maps.
  - `assignSlotToPlayer(slot: player, newOwner: player): void` — sets up alliances, adds to maps, syncs name/color.

#### Task 3.2: Hook into all relevant events

The algorithm is called from multiple places — each is a single `evaluateAndRedistribute()` call:

| Event | File | When |
|-------|------|------|
| Turn start | [game-loop-state.ts](src/app/game/game-mode/base-game-mode/game-loop-state.ts) | Replaces current `allocateClientSlot()` call — handles initial + ongoing redistribution |
| Player dead | [game-loop-state.ts](src/app/game/game-mode/base-game-mode/game-loop-state.ts) | `onPlayerDead()` — immediately attempt to free and redistribute |
| Player left | [game-loop-state.ts](src/app/game/game-mode/base-game-mode/game-loop-state.ts) | `onPlayerLeft()` — same |
| Unit death | [unit-death-event.ts](src/app/triggers/unit_death/unit-death-event.ts) | After decrementing unit count, if the dying unit's slot is in `pendingFreeSlots` and count reached 0 → call `evaluateAndRedistribute()` |

#### Task 3.3: Remove `hasAllocated` flag

The `hasAllocated` one-shot guard is no longer needed since `evaluateAndRedistribute()` is idempotent and handles both initial allocation and subsequent redistributions. Remove the flag and the early-return check.

#### Task 3.4: Update `allocateClientSlot()` → `evaluateAndRedistribute()`

Rename or replace the existing method. The initial allocation on Turn 1 is now just the first invocation of the general algorithm (all slots are "available", no eliminated players, every active player is a receiver).

---

### Phase 4: Update Ownership Resolution

**Objective:** Ensure all existing code that resolves ownership still works correctly with multi-client mappings.

#### Task 4.1: Audit `getOwner()` and `getOwnerOfUnit()` 

These methods do reverse lookups (`clientToPlayer`) and should work unchanged since `clientToPlayer` remains a simple `Map<client, player>`. Each client still maps to exactly one real player. **No changes expected.**

#### Task 4.2: Audit `isPlayerOrClientOwnerOfUnit()`

- Currently checks: `clientToPlayer.get(player) == owner || playerToClient.get(player) == owner`
- With multi-client: `playerToClient.get(player)` returns an array → must check `playerToClient.get(player)?.includes(owner)`.

#### Task 4.3: Audit `isAnyClientOwnerOfUnit()`

- Checks `clientToPlayer.has(GetOwningPlayer(unit))` — no change needed since `clientToPlayer` still maps individual clients.

#### Task 4.4: Audit MinimapIconManager

- `MinimapIconManager` uses `ClientManager.getOwnerOfUnit()` for color resolution — no change needed.

#### Task 4.5: Audit UnitLagManager

- `UnitLagManager.trackUnit()` uses `isAnyClientOwnerOfUnit()` — no change needed.
- `IsUnitAlly`/`IsUnitEnemy` static methods use native WC3 checks — no change needed (alliance flags are set per client slot).

---

## Files Affected (Summary)

| File | Changes |
|------|---------|
| [client-manager.ts](src/app/game/services/client-manager.ts) | Core: multi-client mapping, unit counting, slot deallocation/redistribution |
| [spawner.ts](src/app/spawner/spawner.ts) | Use `getSlotWithLowestUnitCount()` instead of `getClientOrPlayer()` |
| [unit-trained-event.ts](src/app/triggers/unit-trained-event.ts) | Reassign trained units to optimal slot, increment count |
| [unit-death-event.ts](src/app/triggers/unit_death/unit-death-event.ts) | Decrement count, check for deferred slot freeing |
| [game-loop-state.ts](src/app/game/game-mode/base-game-mode/game-loop-state.ts) | Hook into elimination events for slot redistribution |
| [transport-manager.ts](src/app/managers/transport-manager.ts) | Decrement/increment counts on load/unload (if units are removed/added) |

---

## Risks and Considerations

1. **Alliance complexity**: Each new client slot requires full alliance setup with the player AND their team allies. `givePlayerFullControlOfClient()` already handles this but will be called more frequently.

2. **Barracks ownership**: Barracks are owned by client slots. When client slots are redistributed, barracks remains on the original slot. Trained units from that barrack will be created under the old slot's owner. The post-train reassignment (Task 2.3) handles this.

3. **Race conditions on unit death**: When an eliminated player's units die, the deferred freeing logic (Task 3.4) must safely handle cases where multiple units die simultaneously.

4. **Scoreboard updates**: Each redistribution event needs a scoreboard toggle (off → on) + full update to prevent display glitches from shared control changes.

5. **Minimap frame pool**: More client slots per player means more units potentially needing custom minimap icons. The current pool of 2,000 frames should be sufficient, but worth monitoring.

6. **Testing**: The `MAX_PLAYERS_FOR_CLIENT_ALLOCATION = 11` threshold and the "below 11 players" condition for redistribution need to be verified with edge cases (e.g., exactly 11 players, player leaves immediately on turn 1, all but 1 player eliminated).

7. **Game mode reset**: The game can reset between rounds (e.g., equalized promode Round 1 → Round 2). The reset flow in [reset-state.ts](src/app/game/game-mode/base-game-mode/reset-state.ts) calls `removeUnits()` first (wipes all units from the map), then `ClientManager.getInstance().reset()`. The existing `reset()` method already clears `playerToClient`, `clientToPlayer`, `availableClients`, and `hasAllocated`. The new fields introduced by this plan must also be cleared:
   - `slotUnitCounts` — must be cleared (all units are already removed by `removeUnits()` so counts are stale)
   - `pendingFreeSlots` — must be cleared (slots pending deferred freeing are irrelevant after a full reset)
   
   Since `removeUnits()` runs **before** `ClientManager.reset()`, counters will not be naturally decremented to zero via death events — they are forcibly wiped. This is correct because the entire game state is being rebuilt from scratch; cities will be redistributed again, client slots will be re-allocated on the next Turn 1, and guard counts will be re-incremented during the new city distribution phase.
   
   **No additional hook is needed** — just ensure `ClientManager.reset()` clears the new fields alongside the existing ones.

---

## Execution Order

1. **Phase 1** (unit counting) — can be implemented and tested independently
2. **Phase 2** (lowest-count spawning) — depends on Phase 1
3. **Phase 3** (general redistribution algorithm) — depends on Phases 1 + 2; replaces the one-shot `allocateClientSlot()` with idempotent `evaluateAndRedistribute()`
4. **Phase 4** (audit) — done alongside Phases 2 + 3
