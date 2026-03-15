# Neutralize Leaver Units — Execution Plan

## Goal

When a player is eliminated (DEAD or LEFT) **in FFA mode**, **immediately transfer all their units and buildings to `NEUTRAL_HOSTILE`** so that their player slot (and all client slots) hit 0 unit count and can be reclaimed by `evaluateAndRedistribute()` in the same frame.

Units must **retain their original player color** on-screen and on the minimap.

**Scope:** This feature only applies to FFA games (`SettingsContext.getInstance().isFFA()`). In team modes, the existing behavior (slots freed organically as units die) is retained.

---

## Current Behavior

- When a player dies, `onPlayerDeadHandle()` kills their transports, sets status to DEAD, sets income to 1.
- When a player leaves, `onPlayerLeftHandle()` sets status to LEFT, sets income to 0.
- In both cases, `evaluateAndRedistribute()` is called afterward, but the leaver's slots may still have units — these go into `pendingFreeSlots` and are only reclaimable once units die organically.
- This means the leaver's slots are **locked** until all their units are killed in combat, starving remaining players of available client slots.

---

## Design

### FFA-Only Guard

All neutralization logic is gated behind:

```typescript
if (!SettingsContext.getInstance().isFFA()) return;
```

In team modes, the existing `pendingFreeSlots` mechanism continues to handle slot reclamation as units die naturally.

### Core Mechanism

For every unit/building on the leaver's real player handle + all their client slots:

```typescript
SetUnitOwner(unit, NEUTRAL_HOSTILE, false);   // ownership → neutral, color stays
SetUnitColor(unit, GetPlayerColor(originalRealPlayer));  // safety recolor
```

- `SetUnitOwner(unit, player, false)` — the `false` parameter tells WC3 **not** to change the unit's tint color to the new owner's color. The unit keeps its original visual appearance.
- `SetUnitColor` — belt-and-suspenders recolor in case any WC3 engine quirk resets the tint.

### Minimap Color Resolution

The `MinimapIconManager` periodic update (every 0.2s) calls `updateUnitIconColor()`, which resolves color via `ClientManager.getOwnerOfUnit()`. After transfer to `NEUTRAL_HOSTILE`:

- `GetOwningPlayer(unit)` → `NEUTRAL_HOSTILE`
- `ClientManager.getOwnerOfUnit()` → falls back to `NEUTRAL_HOSTILE` (not in `clientToPlayer`)
- **Wrong color** — would render as neutral/grey

**Fix:** Add an `originalOwnerMap: Map<unit, player>` in `ClientManager` that records the real player before transfer. Color-resolution methods consult this map first.

### Spawner Behavior

Spawners (`Spawner.step()`) already guard against `NEUTRAL_HOSTILE`:

```typescript
if (this.getOwner() == NEUTRAL_HOSTILE) return;
```

Since `Spawner.getOwner()` calls `ClientManager.getOwnerOfUnit(this._unit)` on the barracks unit, and the barracks will be transferred to `NEUTRAL_HOSTILE`, spawning stops automatically. **No special spawner handling needed.**

### Training Queue

WC3 engine automatically clears the training queue when `SetUnitOwner` is called. **No special handling needed.**

### Transport Ships

In FFA, the existing transport-killing code in `onPlayerDeadHandle()` is unnecessary — `neutralizePlayerUnits()` transfers all units (including transports) to `NEUTRAL_HOSTILE`. In team modes, the transport-killing code is still needed.

### Cities / Guards / Barracks

When `SetUnitOwner` is called on the cop (control point) unit, the `OwnershipChangeEvent` trigger fires (since the cop has `UNIT_TYPE.CITY`). This trigger already handles:
- Removing the city from the previous owner's `trackedData.cities`
- Country/region income recalculation
- Setting the player to NOMAD status if they lose all cities

The city's `owner` field is set by the trigger via `city.getOwner()` (reads from the cop), so we need to ensure the city's internal `owner` field is also updated. **Use `city.setOwner(NEUTRAL_HOSTILE)` instead of raw `SetUnitOwner` on the cop** — this updates:
- `city.owner` → `NEUTRAL_HOSTILE`
- `barracks.setOwner(NEUTRAL_HOSTILE)` → calls `SetUnitOwner(barrack, NEUTRAL_HOSTILE, true)` (color change is fine for barracks since they're buildings)
- `SetUnitOwner(cop, NEUTRAL_HOSTILE, true)` → triggers `OwnershipChangeEvent`

For **guard units**: transfer with `SetUnitOwner(guard, NEUTRAL_HOSTILE, false)` + `SetUnitColor` to retain color, since guards are visible on the map.

---

## Execution Checklist

- [ ] **1 — Add `originalOwnerMap` to `ClientManager`**

  **File:** [src/app/game/services/client-manager.ts](src/app/game/services/client-manager.ts)

  - Add field: `private originalOwnerMap: Map<unit, player> = new Map<unit, player>();`
  - Add methods:
    - `setOriginalOwner(unit: unit, realPlayer: player): void` — stores the mapping
    - `getOriginalOwner(unit: unit): player | undefined` — returns the stored original owner
    - `clearOriginalOwner(unit: unit): void` — removes the entry
  - Update `getOwnerOfUnit(unit)` to consult `originalOwnerMap` first:
    ```typescript
    public getOwnerOfUnit(unit: unit): player {
        const original = this.originalOwnerMap.get(unit);
        if (original) return original;
        return this.getOwner(GetOwningPlayer(unit));
    }
    ```
  - Clear `originalOwnerMap` in `reset()`.

  **Debug logging:**
  ```
  debugPrint(`[Neutralize] Stored original owner for unit: player ${GetPlayerId(realPlayer)}`);
  ```

  **Verify:** After implementation, confirm `getOwnerOfUnit()` returns the original player for neutralized units.

---

- [ ] **2 — Implement `neutralizePlayerUnits()` in `ClientManager`**

  **File:** [src/app/game/services/client-manager.ts](src/app/game/services/client-manager.ts)

  New method:

  ```typescript
  public neutralizePlayerUnits(realPlayer: player): void
  ```

  Logic:
  1. **FFA guard**: `if (!SettingsContext.getInstance().isFFA()) return;`
  2. Collect all slots: `[realPlayer, ...getClientSlotsByPlayer(realPlayer)]`
  3. For each slot, enumerate all units via `GroupEnumUnitsOfPlayer(group, slot, null)` — collect into array first, do **not** modify ownership inside `ForGroup`.
  4. For each unit:
     a. Store in `originalOwnerMap`: `this.setOriginalOwner(unit, realPlayer)`
     b. If the unit has `UNIT_TYPE.CITY` (cop): **skip** — cities are handled separately in step 5
     c. `SetUnitOwner(unit, NEUTRAL_HOSTILE, false)`
     d. `SetUnitColor(unit, GetPlayerColor(realPlayer))`
     e. `this.decrementUnitCount(slot)`
     f. Do **not** increment count on `NEUTRAL_HOSTILE` (neutral doesn't participate in slot system)
  5. Handle cities: Get all cities from `player.trackedData.cities.cities` (copy the array first since it mutates during iteration). For each city:
     a. Store original owner for the guard unit: `this.setOriginalOwner(city.guard.unit, realPlayer)`
     b. Call `city.setOwner(NEUTRAL_HOSTILE)` — this resets the barracks, cop, and triggers `OwnershipChangeEvent`
     c. `SetUnitColor(city.guard.unit, GetPlayerColor(realPlayer))` — retain guard color
     d. Decrement unit counts for guard, barracks, and cop on their respective slots
  6. After all units transferred, remove client slot mappings:
     a. For each client slot: `this.clientToPlayer.delete(slot)`
     b. `this.playerToClient.delete(realPlayer)`
     c. Remove from `pendingFreeSlots` if present
  7. All slot unit counts should now be 0 — the slots are immediately reclaimable.

  **Note on iteration order:** Cities should be handled **first** (or separately) because `city.setOwner()` calls `SetUnitOwner` on the cop and barracks, which will change their `GetOwningPlayer`. If we enumerate units only once upfront, we avoid issues with ownership changing mid-iteration.

  **Debug logging:**
  ```
  debugPrint(`[Neutralize] Skipping — not FFA mode`);
  debugPrint(`[Neutralize] Neutralizing all units for player ${GetPlayerId(realPlayer)}`);
  debugPrint(`[Neutralize] Processing ${slots.length} slots: [${slots.map(s => GetPlayerId(s)).join(', ')}]`);
  debugPrint(`[Neutralize] Transferred unit ${GetUnitName(unit)} from slot ${GetPlayerId(slot)} to NEUTRAL_HOSTILE`);
  debugPrint(`[Neutralize] Reset city (cop owner changed via city.setOwner)`);
  debugPrint(`[Neutralize] Cleared ${clientSlots.length} client slot mappings for player ${GetPlayerId(realPlayer)}`);
  debugPrint(`[Neutralize] Complete. All slots should now have 0 units.`);
  ```

  **Verify:** Eliminate a player in FFA. Confirm:
  - All unit counts for their slots drop to 0
  - Units visually retain original player color
  - Cities revert to neutral
  - Spawners stop producing units

---

- [ ] **3 — Clean up `originalOwnerMap` on unit death**

  **File:** [src/app/triggers/unit_death/unit-death-event.ts](src/app/triggers/unit_death/unit-death-event.ts)

  After the existing `ClientManager.getInstance().decrementUnitCount(rawDyingUnitOwner)` call, add:

  ```typescript
  ClientManager.getInstance().clearOriginalOwner(dyingUnit);
  ```

  This prevents the map from growing unboundedly. Dead units are cleaned up.

  **Verify:** Kill a neutralized unit. Confirm the `originalOwnerMap` entry is removed.

---

- [ ] **4 — Hook `neutralizePlayerUnits()` into elimination events**

  **File:** [src/app/game/game-mode/base-game-mode/game-loop-state.ts](src/app/game/game-mode/base-game-mode/game-loop-state.ts)

  In `onPlayerLeft()` — call `neutralizePlayerUnits()` **before** `evaluateAndRedistribute()`. The FFA guard is inside `neutralizePlayerUnits()` itself, so the call site doesn't need a conditional:

  ```typescript
  onPlayerLeft(player: ActivePlayer): void {
      super.onPlayerLeft(player);
      debugPrint(`[Redistribute] Triggered by: player left (${GetPlayerName(player.getPlayer())})`);
      ClientManager.getInstance().neutralizePlayerUnits(player.getPlayer());
      ClientManager.getInstance().evaluateAndRedistribute();
      // ... victory check
  }
  ```

  In `onPlayerDead()` — same pattern:

  ```typescript
  onPlayerDead(player: ActivePlayer, forfeit?: boolean): void {
      super.onPlayerDead(player, forfeit);
      debugPrint(`[Redistribute] Triggered by: player dead (${GetPlayerName(player.getPlayer())})`);
      ClientManager.getInstance().neutralizePlayerUnits(player.getPlayer());
      ClientManager.getInstance().evaluateAndRedistribute();
      // ... victory check
  }
  ```

  **Behavior:**
  - **FFA:** `neutralizePlayerUnits()` transfers all units → slots freed → `evaluateAndRedistribute()` reclaims them immediately.
  - **Team modes:** `neutralizePlayerUnits()` returns early (FFA guard) → `evaluateAndRedistribute()` uses the existing `pendingFreeSlots` mechanism.

  **Verify:** In FFA, player leaves → slots immediately freed. In team mode, player leaves → slots freed organically as units die.

---

- [ ] **5 — Guard transport-killing code behind non-FFA check in `onPlayerDeadHandle()`**

  **File:** [src/app/game/game-mode/utillity/on-player-status.ts](src/app/game/game-mode/utillity/on-player-status.ts)

  Wrap the transport-killing block (lines ~33–53) in a `!isFFA()` check so it only runs in team modes. In FFA, `neutralizePlayerUnits()` already handles all units (including transports):

  ```typescript
  if (!SettingsContext.getInstance().isFFA()) {
      // Kill remaining transport ships on all player slots (real player + client slots)
      const transportsToKill: unit[] = [];
      // ... existing code ...
  }
  ```

  **Verify:** In FFA, player dies → no transport-killing log appears → transports are transferred to neutral. In team mode, transports are still killed as before.

---

- [ ] **6 — Verify `pendingFreeSlots` cleanup in `evaluateAndRedistribute()`**

  **File:** [src/app/game/services/client-manager.ts](src/app/game/services/client-manager.ts)

  The existing `evaluateAndRedistribute()` logic checks `pendingFreeSlots` and waits for unit counts to hit 0. Since `neutralizePlayerUnits()` runs **before** `evaluateAndRedistribute()`, the eliminated player's slots will already be at 0 count and removed from `pendingFreeSlots`.

  **No code change expected** — verification only. The key sequence is:
  1. `neutralizePlayerUnits()` → all counts drop to 0, client mappings cleared
  2. `evaluateAndRedistribute()` → finds empty unassigned slots → distributes them

  **Verify:** Step through debug logs. Confirm `evaluateAndRedistribute()` sees the freed slots in its available pool.

---

## Edge Cases

| Case | Behavior | Notes |
|------|----------|-------|
| Non-FFA mode | `neutralizePlayerUnits()` returns immediately (FFA guard) | Existing `pendingFreeSlots` behavior preserved |
| Player dies with 0 units/cities | `neutralizePlayerUnits()` is a no-op (no units to iterate) | Safe — `evaluateAndRedistribute()` frees the empty slots as before |
| Player leaves during distribution (pre-Turn 1) | Status set to LEFT but no client slots allocated yet | Safe — `neutralizePlayerUnits()` finds no client slots, transfers only units on real player handle |
| Guard replacement on neutralized city | Guard dies → `HandleGuardDeath` runs → new guard created under `NEUTRAL_HOSTILE` | Works correctly — city owner is already `NEUTRAL_HOSTILE` |
| OwnershipChangeEvent fires for cop transfer | Trigger checks `city.getOwner()` — which returns `NEUTRAL_HOSTILE` after `city.setOwner()` | The trigger's `owner = PlayerManager.getInstance().players.get(city.getOwner())` will return `undefined` for `NEUTRAL_HOSTILE`, which is handled (existing null checks) |
| Unit death of neutralized unit | `getOwnerOfUnit()` returns original player via `originalOwnerMap` → kill/death tracking still attributes correctly | `dyingUnitOwner` lookup via `PlayerManager.players.get()` still works since the player handle is the original real player |
| Minimap icon color for neutralized units | `updateUnitIconColor()` calls `getOwnerOfUnit()` → returns original player from `originalOwnerMap` → correct color | No change needed in `MinimapIconManager` |
| Ally color filter mode (red/green minimap) | `updateUnitIconColor()` checks `IsPlayerAlly(owner, localPlayer)` using the **original owner** from `originalOwnerMap` — original owner is now DEAD/LEFT, alliances may have been torn down by `tearDownSlot()` | Need to verify: if alliances are torn down, the neutralized units will appear as enemies (red) on the minimap in ally-color mode. This may be the desired behavior. |
| Game reset between rounds | `ClientManager.reset()` clears all maps | Must also clear `originalOwnerMap` — added in Task 1 |
| `SPAWNER_UNITS` map entries | Keyed by unit handle → `spawner.onDeath()` still fires when neutralized spawn units die | `onDeath()` calls `ClientManager.getOwner(player)` with the killing player — separate from the dying unit's original owner. Should work. The `spawnMap` manipulation uses `getOwner(player)` of the *killing* player, not the dying unit. Verify this path. |

---

## Files Affected (Summary)

| File | Changes |
|------|---------|
| [client-manager.ts](src/app/game/services/client-manager.ts) | Add `originalOwnerMap`, `setOriginalOwner()`, `getOriginalOwner()`, `clearOriginalOwner()`, `neutralizePlayerUnits()`. Update `getOwnerOfUnit()` and `reset()`. |
| [unit-death-event.ts](src/app/triggers/unit_death/unit-death-event.ts) | Add `clearOriginalOwner(dyingUnit)` after decrement |
| [game-loop-state.ts](src/app/game/game-mode/base-game-mode/game-loop-state.ts) | Call `neutralizePlayerUnits()` before `evaluateAndRedistribute()` in `onPlayerDead()` and `onPlayerLeft()` |
| [on-player-status.ts](src/app/game/game-mode/utillity/on-player-status.ts) | Wrap transport-killing code in `!isFFA()` guard |

---

## Risks

1. **`OwnershipChangeEvent` side effects**: When `city.setOwner(NEUTRAL_HOSTILE)` fires the ownership change trigger, it recalculates income, country ownership, and potentially sets the player to NOMAD status. Since the player is already DEAD/LEFT, the NOMAD transition should be guarded by the existing `isEliminated()` check — but this needs verification.

2. **`spawnMap` cleanup**: When neutralized spawn units die, `SPAWNER_UNITS.get(dyingUnit).onDeath()` will try to splice the unit from `spawnMap` using the *dying unit's resolved owner*. After neutralization, `getOwnerOfUnit()` returns the original player (via `originalOwnerMap`), so `spawnMap.get(originalPlayer)` should still contain the unit. This should work but needs testing.

3. **Unit death handler attribution**: `dyingUnitOwner` is resolved via `getOwnerOfUnit()`, which now returns the original player. The `onDeath()` and `onKill()` callbacks on `GamePlayer` will fire for the original player — meaning kill/death statistics still get attributed. This is probably desired but worth confirming.

4. **Concurrent group iteration**: `GroupEnumUnitsOfPlayer` + `ForGroup` inside `neutralizePlayerUnits()` calls `SetUnitOwner` which changes the owning player mid-iteration. Must collect units into an array first, then iterate the array — do **not** modify ownership inside `ForGroup`.
