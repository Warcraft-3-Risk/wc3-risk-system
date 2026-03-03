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

## Execution Checklist

### Phase 1: Unit Counting Per Player Slot

**Objective:** Track the number of units owned by each WC3 player slot (both real players and client slots) in real time.

- [x] **1.1 — Add unit count tracking to `ClientManager`**
  
  **File:** [src/app/game/services/client-manager.ts](src/app/game/services/client-manager.ts)
  
  - Add `slotUnitCounts: Map<player, number>` field.
  - Initialize counts to `0` for all allocated slots.
  - Implement methods:
    - `incrementUnitCount(slot: player): void`
    - `decrementUnitCount(slot: player): void` (floor at 0)
    - `getUnitCount(slot: player): number`
    - `getSlotWithLowestUnitCount(player: player): player`
  - Clear `slotUnitCounts` in `reset()`.
  
  **Debug logging:**
  ```
  debugPrint(`[SlotCount] Increment slot ${GetPlayerId(slot)}: ${oldCount} → ${newCount}`);
  debugPrint(`[SlotCount] Decrement slot ${GetPlayerId(slot)}: ${oldCount} → ${newCount}`);
  debugPrint(`[SlotCount] Lowest slot for player ${GetPlayerId(player)}: slot ${GetPlayerId(result)} (count: ${count})`);
  ```
  
  **Verify:** After city distribution, print all slot counts. Expect each real player to have a count equal to their number of owned guard units.

---

- [x] **1.2 — Increment count on city distribution (guards)**
  
  Guards are initially created under `NEUTRAL_HOSTILE` in `Guard.build()`. During city distribution, ownership is transferred via `SetUnitOwner()`.
  
  **File:** [src/app/game/services/distribution-service/standard-distribution-service.ts](src/app/game/services/distribution-service/standard-distribution-service.ts#L147)
  - In `changeCityOwner()`, after `SetUnitOwner(city.guard.unit, player.getPlayer(), true)`:
    - Call `ClientManager.getInstance().incrementUnitCount(player.getPlayer())`.
  
  **File:** [src/app/game/game-mode/capital-game-mode/capitals-distribute-capitals-state.ts](src/app/game/game-mode/capital-game-mode/capitals-distribute-capitals-state.ts#L88)
  - In `changeCityOwner()`, after `SetUnitOwner(city.guard.unit, player.getPlayer(), true)`:
    - Call `ClientManager.getInstance().incrementUnitCount(player.getPlayer())`.
  
  **Debug logging:**
  ```
  debugPrint(`[SlotCount] Guard distributed to player ${GetPlayerId(player.getPlayer())}, incrementing count`);
  ```
  
  **Note on guard transitions at runtime:**
  - `Guard.replace()` — reuses an existing unit (already counted), no additional increment needed. Ensure old DUMMY_GUARD removal triggers a decrement if it was counted.
  - `Guard.reset()` — `RemoveUnit` on old guard (decrement old slot), new one created under `NEUTRAL_HOSTILE` (not counted).
  
  **Verify:** After distribution completes, use the debug summary from 1.1 to confirm guard counts match expected city ownership per player.

---

- [x] **1.3 — Increment count on unit spawn**
  
  **File:** [src/app/spawner/spawner.ts](src/app/spawner/spawner.ts#L77-L85)
  
  - In `Spawner.step()`, after `CreateUnit(...)`, call `ClientManager.getInstance().incrementUnitCount(owningSlot)`.
  
  **Debug logging:**
  ```
  debugPrint(`[SlotCount] Spawned unit for player ${GetPlayerId(this.getOwner())} on slot ${GetPlayerId(owningSlot)}`);
  ```
  
  **Verify:** After first spawn turn, print all slot counts. Expect counts to increase by spawn amounts.

---

- [x] **1.4 — Increment count on unit train**
  
  **File:** [src/app/triggers/unit-trained-event.ts](src/app/triggers/unit-trained-event.ts)
  
  - In `UnitTrainedEvent()`, after the trained unit is created:
    - Call `ClientManager.getInstance().incrementUnitCount(GetOwningPlayer(trainedUnit))`.
  
  **Debug logging:**
  ```
  debugPrint(`[SlotCount] Trained unit on slot ${GetPlayerId(GetOwningPlayer(trainedUnit))}`);
  ```
  
  **Verify:** Train a unit from a city. Confirm count on the owning slot increased by 1.

---

- [x] **1.5 — Decrement count on unit death**
  
  **File:** [src/app/triggers/unit_death/unit-death-event.ts](src/app/triggers/unit_death/unit-death-event.ts)
  
  - In the death event handler, call `ClientManager.getInstance().decrementUnitCount(GetOwningPlayer(dyingUnit))` (raw WC3 owner, not resolved real player).
  
  **Debug logging:**
  ```
  debugPrint(`[SlotCount] Unit died on slot ${GetPlayerId(GetOwningPlayer(dyingUnit))}`);
  ```
  
  **Verify:** Kill a unit. Confirm slot count decreased by 1.

---

- [x] **1.6 — Decrement count on unit removal**
  
  Ensure any code path that removes units also decrements the count. Key locations:
  - [src/app/managers/transport-manager.ts](src/app/managers/transport-manager.ts) — load/unload
  - [src/app/spawner/spawner.ts](src/app/spawner/spawner.ts) `reset()` — spawner reset clears units
  
  **Debug logging:**
  ```
  debugPrint(`[SlotCount] Unit removed on slot ${GetPlayerId(GetOwningPlayer(unit))}`);
  ```
  
  **Verify:** Trigger a game reset. Confirm all slot counts are 0 after `ClientManager.reset()` runs.

---

- [x] **1.7 — Add a periodic count summary for debugging**
  
  **File:** [src/app/game/services/client-manager.ts](src/app/game/services/client-manager.ts)
  
  - Add method `debugPrintSlotCounts(): void` that prints all non-zero slot counts.
  - Call this from `onStartTurn()` in [game-loop-state.ts](src/app/game/game-mode/base-game-mode/game-loop-state.ts) so counts are logged every turn.
  
  **Debug logging:**
  ```
  debugPrint(`[SlotCount] === Turn ${turn} Slot Summary ===`);
  debugPrint(`[SlotCount] Slot ${GetPlayerId(slot)} (owner: ${GetPlayerId(realOwner)}): ${count} units`);
  ```
  
  **Verify:** Play through a few turns. Confirm counts make sense — they should increase with spawns and decrease with deaths.

---

### Phase 2: Spawn Units to Lowest-Count Slot

**Objective:** Replace the current `getClientOrPlayer()` call with a method that picks the slot with the fewest units.

- [x] **2.1 — Change `playerToClient` from `Map<player, client>` to `Map<player, client[]>`**
  
  **File:** [src/app/game/services/client-manager.ts](src/app/game/services/client-manager.ts)
  
  - Change the mapping so a single real player can have **multiple** client slots.
  - Update `clientToPlayer` to remain `Map<client, player>` (many-to-one is fine).
  - Update all methods that read `playerToClient`:
    - `getClientByPlayer` — return the array or first element depending on usage.
    - `getClientOrPlayer` → rename/replace with `getSlotWithLowestUnitCount(player)`.
    - `isPlayerOrClientOwnerOfUnit` — check against all client slots (use `.includes()`).
    - `reset()` — clear all arrays.
  
  **Debug logging:**
  ```
  debugPrint(`[ClientManager] Player ${GetPlayerId(player)} now has ${slots.length} client slots: [${slots.map(s => GetPlayerId(s)).join(', ')}]`);
  ```
  
  **Verify:** After initial allocation, print each player's client slot array. Should match existing 1:1 behavior initially.

---

- [x] **2.2 — Update `Spawner.step()` to use lowest-count slot**
  
  **File:** [src/app/spawner/spawner.ts](src/app/spawner/spawner.ts#L78)
  
  - Replace `ClientManager.getInstance().getClientOrPlayer(this.getOwner())` with `ClientManager.getInstance().getSlotWithLowestUnitCount(this.getOwner())`.
  
  **Debug logging:** (already covered by 1.3 and 1.1's `getSlotWithLowestUnitCount` log)
  
  **Verify:** With 1 real player + 1 client slot, spawn 10 units. Expect roughly 5 on each slot (±1). Check via turn summary from 1.7.

---

- [x] **2.3 — Update `UnitTrainedEvent` to reassign trained unit if needed**
  
  **File:** [src/app/triggers/unit-trained-event.ts](src/app/triggers/unit-trained-event.ts)
  
  - After training, check if the barracks owner is the optimal slot. If not, call `SetUnitOwner(trainedUnit, optimalSlot, true)` to move it.
  - Adjust increment count accordingly (decrement old slot, increment new slot).
  
  **Debug logging:**
  ```
  debugPrint(`[SlotCount] Trained unit reassigned from slot ${GetPlayerId(oldSlot)} to slot ${GetPlayerId(newSlot)}`);
  ```
  
  **Verify:** Train a unit when the barracks slot has more units than another slot. Confirm the unit ends up on the lower-count slot.

---

### Phase 3: General Redistribution Algorithm

**Objective:** Create a single, reusable algorithm that determines when slots can be freed and how to optimally distribute all available slots among active players. Replaces ad-hoc per-event logic with a unified routine.

- [x] **3.1 — Implement `evaluateAndRedistribute()` in `ClientManager`**
  
  **File:** [src/app/game/services/client-manager.ts](src/app/game/services/client-manager.ts)
  
  The algorithm (single entry-point, idempotent):
  
  ```
  evaluateAndRedistribute(): boolean
  │
  ├── 1. COLLECT: Build the current picture
  │   ├── activePlayers[]        ← players with status ALIVE or NOMAD
  │   ├── eliminatedPlayers[]    ← players with status DEAD, LEFT, or STFU
  │   ├── assignedSlots          ← all slots currently in playerToClient
  │   └── unassignedSlots[]      ← empty WC3 player slots not assigned to anyone
  │
  ├── 2. FREE: Identify reclaimable slots from eliminated players
  │   ├── For each eliminated player:
  │   │   ├── Get their client slots from playerToClient
  │   │   ├── For each client slot:
  │   │   │   ├── IF slotUnitCount[slot] == 0:
  │   │   │   │   ├── Tear down alliances
  │   │   │   │   ├── Remove from maps
  │   │   │   │   └── Add to availablePool[]
  │   │   │   └── ELSE:
  │   │   │       └── Mark as "pendingFree"
  │   │   └── Also free the eliminated player's OWN handle if count == 0
  │   └── availablePool[] now has all reclaimable slots
  │
  ├── 3. CALCULATE: Determine optimal distribution
  │   │  totalSlots = assignedSlots.count + availablePool.count
  │   │  slotsPerPlayer = floor(totalSlots / activePlayers.count)
  │   │  remainder = totalSlots % activePlayers.count
  │   │
  │   ├── For each active player:
  │   │   ├── currentSlotCount = playerToClient[player].length
  │   │   ├── targetSlotCount  = slotsPerPlayer (+ 1 if in remainder)
  │   │   └── delta = target - current
  │   │
  │   ├── IF all deltas == 0 → return false
  │   ├── delta < 0 → "donors" (only donate slots with 0 units)
  │   └── delta > 0 → "receivers"
  │
  ├── 4. EXECUTE: Perform the redistribution
  │   ├── Collect donated slots, tear down old alliances
  │   ├── Merge into availablePool
  │   ├── Assign to receivers (sorted by fewest slots first)
  │   └── Leftover slots stay unassigned
  │
  └── 5. FINALIZE
      ├── Update scoreboard
      └── Return true
  ```
  
  Fields to add:
  - `pendingFreeSlots: Set<player>` — slots of eliminated players that still have units.
  - Clear `pendingFreeSlots` in `reset()`.
  
  Helper methods:
  - `getActivePlayers(): player[]`
  - `getSlotsForPlayer(player): player[]` — returns `[player, ...playerToClient[player]]`
  - `tearDownSlot(slot, previousOwner): void`
  - `assignSlotToPlayer(slot, newOwner): void`
  
  **Debug logging:**
  ```
  debugPrint(`[Redistribute] === Running evaluateAndRedistribute() ===`);
  debugPrint(`[Redistribute] Active players: ${activePlayers.map(p => GetPlayerId(p)).join(', ')}`);
  debugPrint(`[Redistribute] Eliminated players: ${eliminatedPlayers.map(p => GetPlayerId(p)).join(', ')}`);
  debugPrint(`[Redistribute] Available pool: ${availablePool.length} slots`);
  debugPrint(`[Redistribute] Freed slot ${GetPlayerId(slot)} from eliminated player ${GetPlayerId(elimPlayer)} (unitCount was 0)`);
  debugPrint(`[Redistribute] Slot ${GetPlayerId(slot)} marked pendingFree (unitCount: ${count})`);
  debugPrint(`[Redistribute] Target: ${slotsPerPlayer} per player (+1 for first ${remainder})`);
  debugPrint(`[Redistribute] Player ${GetPlayerId(player)}: current=${current}, target=${target}, delta=${delta}`);
  debugPrint(`[Redistribute] Donor ${GetPlayerId(donor)}: donating slot ${GetPlayerId(slot)}`);
  debugPrint(`[Redistribute] Receiver ${GetPlayerId(receiver)}: assigned slot ${GetPlayerId(slot)}`);
  debugPrint(`[Redistribute] Complete. Leftover unassigned: ${leftover}`);
  debugPrint(`[Redistribute] No changes needed, returning false`);
  ```
  
  **Verify:** 
  - Initial allocation: Call on Turn 1. Expect slots distributed equally.
  - Elimination: Kill a player. Expect their empty slots to be freed and redistributed.
  - Pending free: Kill a player who still has units. Expect slot marked pending. Then kill all their units — expect the next call to free and redistribute it.

---

- [x] **3.2 — Hook into all relevant events**
  
  Replace/add `evaluateAndRedistribute()` calls:
  
  | Event | File | Where |
  |-------|------|-------|
  | Turn start | [game-loop-state.ts](src/app/game/game-mode/base-game-mode/game-loop-state.ts) | `onStartTurn()` — replaces `allocateClientSlot()` |
  | Player dead | [game-loop-state.ts](src/app/game/game-mode/base-game-mode/game-loop-state.ts) | `onPlayerDead()` |
  | Player left | [game-loop-state.ts](src/app/game/game-mode/base-game-mode/game-loop-state.ts) | `onPlayerLeft()` |
  | Unit death | [unit-death-event.ts](src/app/triggers/unit_death/unit-death-event.ts) | After decrement, if slot is in `pendingFreeSlots` and count == 0 |
  
  **Debug logging:**
  ```
  debugPrint(`[Redistribute] Triggered by: ${eventName}`);
  ```
  
  **Verify:** Play a game, eliminate a player. Confirm debug logs show the algorithm running from both the elimination event and (if applicable) subsequent unit deaths.

---

- [x] **3.3 — Remove `hasAllocated` flag**
  
  **File:** [src/app/game/services/client-manager.ts](src/app/game/services/client-manager.ts)
  
  - Remove `hasAllocated` field and all early-return checks that reference it.
  - The algorithm's idempotency makes this guard unnecessary.
  
  **Verify:** Confirm the algorithm still only produces changes when the state actually differs.

---

- [x] **3.4 — Rename `allocateClientSlot()` → `evaluateAndRedistribute()`**
  
  Update all call sites. The initial allocation on Turn 1 is now the first invocation of the general algorithm.
  
  **Verify:** Build and test. No behavioral change — initial allocation should produce the same result as before.

---

### Phase 4: Update Ownership Resolution

**Objective:** Ensure all existing code that resolves ownership still works with multi-client mappings.

- [x] **4.1 — Audit `getOwner()` and `getOwnerOfUnit()`**
  
  Reverse lookups via `clientToPlayer` — still `Map<client, player>`. Each client maps to exactly one real player. **No changes expected.**
  
  **Verify:** Spot-check in debug logs that ownership resolution returns correct real player after redistribution.

---

- [x] **4.2 — Update `isPlayerOrClientOwnerOfUnit()`**
  
  **File:** [src/app/game/services/client-manager.ts](src/app/game/services/client-manager.ts)
  
  - Change `playerToClient.get(player) == owner` → `playerToClient.get(player)?.includes(owner)`.
  
  **Verify:** Confirm city capture and guard replacement still work correctly with multi-client players.

---

- [x] **4.3 — Audit `isAnyClientOwnerOfUnit()`**
  
  Checks `clientToPlayer.has(GetOwningPlayer(unit))` — no change needed.
  
  **Verify:** Confirm UnitLagManager tracking still works.

---

- [x] **4.4 — Audit MinimapIconManager**
  
  Uses `ClientManager.getOwnerOfUnit()` for color resolution — no change needed.
  
  **Verify:** Confirm units on all client slots show the correct player color on the minimap.

---

- [x] **4.5 — Audit UnitLagManager**
  
  - `trackUnit()` uses `isAnyClientOwnerOfUnit()` — no change needed.
  - `IsUnitAlly`/`IsUnitEnemy` use native WC3 checks — no change needed (alliances are set per client slot).

---

### Phase 5: Inter-Slot Alliances

**Objective:** Ensure all client slots belonging to the same player (and their teammates) are fully allied with each other so units on different slots don't fight.

- [x] **5.1 — Ally sibling slots on assignment**

  **File:** [src/app/game/services/client-manager.ts](src/app/game/services/client-manager.ts)

  - In `givePlayerFullControlOfClient()`, after setting up player↔client and teammate↔client alliances:
    - Ally the new slot with all OTHER existing client slots of the same player.
    - Ally the new slot with all client slots of each teammate.

  **Verify:** Assign 2+ slots to a player. Confirm units on slot A don't attack units on slot B.

---

- [x] **5.2 — Un-ally sibling slots on teardown**

  **File:** [src/app/game/services/client-manager.ts](src/app/game/services/client-manager.ts)

  - In `tearDownSlot()`, mirror the alliance setup:
    - Un-ally the removed slot from all OTHER existing client slots of the same player.
    - Un-ally the removed slot from all client slots of each teammate.

  **Verify:** Tear down a slot. Confirm it no longer has alliances with the player's remaining slots.

---

- [x] **5.3 — Ensure `reset()` clears inter-slot alliances**

  The existing `reset()` method already iterates over all `bj_MAX_PLAYERS × bj_MAX_PLAYERS` pairs and disables advanced control for every combination. This covers all inter-slot alliances. **No additional change needed.**

  **Verify:** Trigger a game reset. Confirm no lingering alliances between previously-allied slots.

---

- [x] **5.4 — Full alliance wipe before slot reassignment**

  **File:** [src/app/game/services/client-manager.ts](src/app/game/services/client-manager.ts)

  - In `assignSlotToPlayer()`, before setting up new alliances:
    - Iterate over all `bj_MAX_PLAYERS` player indices and call `enableAdvancedControl(slot, Player(i), false)` and `enableAdvancedControl(Player(i), slot, false)`.
    - This is a defensive/nuclear wipe that guarantees no stale alliances leak through from any source (previous owner, dissolved teams, etc.) before the slot is given to a new player.

  **Verify:** Eliminate a player, confirm their freed slots have no lingering alliances when assigned to a different player.

---

## Files Affected (Summary)

| File | Changes |
|------|---------|
| [client-manager.ts](src/app/game/services/client-manager.ts) | Core: multi-client mapping, unit counting, slot deallocation/redistribution, `reset()` |
| [standard-distribution-service.ts](src/app/game/services/distribution-service/standard-distribution-service.ts) | Increment guard count on city distribution |
| [capitals-distribute-capitals-state.ts](src/app/game/game-mode/capital-game-mode/capitals-distribute-capitals-state.ts) | Increment guard count on capital distribution |
| [spawner.ts](src/app/spawner/spawner.ts) | Use `getSlotWithLowestUnitCount()` instead of `getClientOrPlayer()` |
| [unit-trained-event.ts](src/app/triggers/unit-trained-event.ts) | Reassign trained units to optimal slot, increment count |
| [unit-death-event.ts](src/app/triggers/unit_death/unit-death-event.ts) | Decrement count, check for deferred slot freeing |
| [game-loop-state.ts](src/app/game/game-mode/base-game-mode/game-loop-state.ts) | Hook into elimination events, replace `allocateClientSlot()` |
| [transport-manager.ts](src/app/managers/transport-manager.ts) | Decrement/increment counts on load/unload |

---

## Risks and Considerations

1. **Alliance complexity**: Each new client slot requires full alliance setup with the player AND their team allies. `givePlayerFullControlOfClient()` already handles this but will be called more frequently.

2. **Barracks ownership**: Barracks are owned by client slots. When client slots are redistributed, barracks remains on the original slot. Trained units from that barrack will be created under the old slot's owner. The post-train reassignment (Task 2.3) handles this.

3. **Race conditions on unit death**: When an eliminated player's units die, the deferred freeing logic must safely handle cases where multiple units die simultaneously.

4. **Scoreboard updates**: Each redistribution event needs a scoreboard toggle (off → on) + full update to prevent display glitches from shared control changes.

5. **Minimap frame pool**: More client slots per player means more units potentially needing custom minimap icons. The current pool of 2,000 frames should be sufficient, but worth monitoring.

6. **Testing**: The `MAX_PLAYERS_FOR_CLIENT_ALLOCATION = 11` threshold and the "below 11 players" condition for redistribution need to be verified with edge cases (e.g., exactly 11 players, player leaves immediately on turn 1, all but 1 player eliminated).

7. **Game mode reset**: The game can reset between rounds (e.g., equalized promode Round 1 → Round 2). The reset flow in [reset-state.ts](src/app/game/game-mode/base-game-mode/reset-state.ts) calls `removeUnits()` first (wipes all units from the map), then `ClientManager.getInstance().reset()`. The existing `reset()` method already clears `playerToClient`, `clientToPlayer`, `availableClients`, and `hasAllocated`. The new fields must also be cleared:
   - `slotUnitCounts` — must be cleared (all units already removed by `removeUnits()`)
   - `pendingFreeSlots` — must be cleared (irrelevant after full reset)
   
   Since `removeUnits()` runs **before** `ClientManager.reset()`, counters will not be naturally decremented to zero via death events — they are forcibly wiped. This is correct because the entire game state is rebuilt from scratch.
   
   **No additional hook is needed** — just ensure `ClientManager.reset()` clears the new fields alongside the existing ones.

---

### Phase 6: Custom Unit Hover Tooltips (Alternative to SetPlayerColor / SetPlayerName)

**Objective:** Show the owning player's colored name when hovering a unit — without using `SetPlayerColor` or `SetPlayerName`, which corrupt the WC3 end-game match result screen (players appear with wrong colors and names).

**Approach:** The WC3 native hover info box (uber tooltip) is replaced with a custom Frame API overlay. A matching visual backdrop is added behind the chat input box so the two areas have a consistent look.

---

- [ ] **6.1 — Set blank tooltip textures in the Editor Game Interface**

  In the World Editor, open **Advanced → Game Interface** and set the following two fields to `UI\Widgets\EscMenu\Human\blank-background.blp`:

  - **Image - Tooltip Background**
  - **Image - Tooltip Border**

  This makes the native WC3 uber tooltip invisible, so our custom overlay is the only visible element.

  **Why:** The native uber tooltip renders on top of any custom frame; blanking its textures removes the double-render without disabling the frame itself.

  **Verify:** Launch the map and hover a unit. The default yellow-bordered tooltip box should no longer appear. Only the custom overlay from `TooltipManager` should be visible.

---

- [ ] **6.2 — Add a backdrop behind the uber tooltip**

  **File:** [src/app/managers/tooltip-manager.ts](src/app/managers/tooltip-manager.ts)

  In `init()`, after obtaining `gameUI`:

  ```typescript
  const uberTooltip = BlzGetOriginFrame(ORIGIN_FRAME_UBERTOOLTIP, 0);
  const uberTooltipBox = BlzCreateSimpleFrame('SimpleTasToolTipBox', uberTooltip, 0);
  BlzFrameSetAllPoints(uberTooltipBox, uberTooltip);
  BlzFrameSetLevel(uberTooltipBox, 0);
  ```

  `SimpleTasToolTipBox` is defined in `frames.fdf` and renders the standard WC3 tooltip backdrop texture. Parenting it to `uberTooltip` and anchoring it to all points means it fills and follows the native uber tooltip area exactly.

  **Verify:** Hover a unit. The tooltip background should use the custom `SimpleTasToolTipBox` texture.

---

- [ ] **6.3 — Implement the custom hover tooltip**

  **File:** [src/app/managers/tooltip-manager.ts](src/app/managers/tooltip-manager.ts)

  - Create `TasToolTipBox` (backdrop) and `TasTooltipText` (text) frames parented to `gameUI`.
  - On a `0.02s` repeating timer, read `BlzGetMouseFocusUnit()` and:
    - If the focused unit changed, call `updateTooltip()`.
    - If visible, reposition the text above the unit using `World2Screen()`.
  - `updateTooltip()` resolves ownership via `ClientManager.getOwnerOfUnit()` and shows the player's `NameManager.getDisplayName()` (which includes their color code), or the unit's name for neutral units.
  - Own units (and client-slot-owned units) are suppressed — no tooltip shown for friendly units.

  **Why this approach instead of SetPlayerColor / SetPlayerName:**
  - `SetPlayerColor` and `SetPlayerName` affect the WC3 match result screen shown after the game ends: players appear with incorrect colors and names in the lobby summary, which is confusing and breaks the post-game experience.
  - The Frame API overlay is purely visual and local — it never modifies WC3's internal player data.

  **Verify:** Hover an enemy unit. The colored player name should appear above the unit. Hover a friendly unit — no tooltip. Hover a neutral/creep — unit name shown.

---

- [ ] **6.4 — Add a backdrop behind the chat input box**

  **File:** [src/app/managers/chat-ui-manager.ts](src/app/managers/chat-ui-manager.ts)

  The chat input frame is not present in `ORIGIN_FRAME_GAME_UI` at game start — it is added later. Use a deferred timer and find it by structural fingerprint instead of a fixed index (which shifts whenever custom prio(0) frames are inserted before it):

  ```
  Fingerprint:
    frame      → 2 children
      [1]      → 4 children
        [1][0] → 5 children
  ```

  Once found, parent a `TasToolTipBox` behind it:

  ```typescript
  const timer = CreateTimer();
  TimerStart(timer, 5, false, () => {
      this.chatInput = this.findChatInput(gameUI);
      if (this.chatInput) {
          this.chatInputBox = BlzCreateFrame('TasToolTipBox', this.chatInput, 0, 0);
          BlzFrameSetLevel(this.chatInputBox, -2);
          BlzFrameSetAllPoints(this.chatInputBox, this.chatInput);
      }
  });
  ```

  **Why deferred:** Searching at game start risks matching a different frame that shares the same child-count structure (e.g. the minimap parent at GameUI index [5]), which causes the minimap to disappear.

  **Verify:** Press Enter in-game. The chat input area should have a consistent backdrop matching the tooltip style. The minimap must remain visible.

---

1. **Phase 1** (unit counting) — can be implemented and tested independently. Use `debugPrintSlotCounts()` each turn to verify.
2. **Phase 2** (lowest-count spawning) — depends on Phase 1. Verify unit distribution across slots.
3. **Phase 3** (general redistribution) — depends on Phases 1 + 2. Verify with elimination scenarios.
4. **Phase 4** (audit) — done alongside Phases 2 + 3. Mostly verification, minimal code changes.
