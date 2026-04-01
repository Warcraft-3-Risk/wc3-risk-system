# Elimination Debuff — Execution Checklist

## Summary

Replace the current "neutralize player units" approach (instant transfer to `NEUTRAL_HOSTILE`) with a **gradual elimination debuff**. When a player is eliminated (via leaving or `-ff`), their units remain under their original player slot and slowly die off from a damage-over-time debuff. Only once **all** units have been killed does the player slot become available for shared slot redistribution.

### Exempt units (no debuff applied)

- **Guard** (`UNIT_TYPE.GUARD` / `UNIT_TYPE_SAPPER`) — remain as static city defenders
- **Cop** (`UNIT_TYPE.CITY` / `UNIT_TYPE_TOWNHALL`) — defines city ownership, persists until captured
- **City buildings** (`UNIT_TYPE.BUILDING` / `UNIT_TYPE_STRUCTURE`) — barracks etc., persist until captured

Cities with their guards/cops/barracks remain on the map as capturable objectives for other players.

### Elimination triggers

- **Player leaves** → `onPlayerLeft()` in `GameLoopState`
- **Player forfeits (`-ff`)** → `onPlayerForfeit()` emits `EVENT_ON_PLAYER_DEAD` → `onPlayerDead()` in `GameLoopState`

Both paths should apply the debuff.

---

## Removal Checklist

### `SharedSlotManager` — `neutralizePlayerUnits()`

**File:** `src/app/game/services/shared-slot-manager.ts` (Lines ~113–216)

- [ ] Remove or gut the `neutralizePlayerUnits()` method body
- [ ] Remove `NEUTRAL_HOSTILE` ownership transfers (`SetUnitOwner`)
- [ ] Remove `SetUnitColor` recoloring logic
- [ ] Remove city-specific neutralization (`city.setOwner(NEUTRAL_HOSTILE)`)
- [ ] Remove transport stop orders (`IssueImmediateOrder(unit, 'stop')`)
- [ ] Remove the lazy `require('../../managers/transport-manager')` import inside the method

### `SharedSlotManager` — `originalOwnerMap`

**File:** `src/app/game/services/shared-slot-manager.ts`

- [ ] Remove field: `originalOwnerMap: Map<unit, player>` (Line ~43)
- [ ] Remove method: `setOriginalOwner()` (Line ~623)
- [ ] Remove method: `getOriginalOwner()` (Line ~628)
- [ ] Remove method: `clearOriginalOwner()` (Line ~632)
- [ ] Update `getOwnerOfUnit()` (Line ~737) — remove the `originalOwnerMap.get(unit)` lookup; just return `this.getOwner(GetOwningPlayer(unit))`
- [ ] Remove `this.originalOwnerMap.clear()` from `reset()` (Line ~803)

### `unit-death-event.ts` — `originalOwnerMap` cleanup

**File:** `src/app/triggers/unit_death/unit-death-event.ts` (Lines ~37–38)

- [ ] Remove `SharedSlotManager.getInstance().clearOriginalOwner(dyingUnit)` call
- [ ] Remove associated comment `// Clean up originalOwnerMap entry for neutralized units`

### `UnitLagManager` — `getOriginalOwner()` reference

**File:** `src/app/game/services/unit-lag-manager.ts` (Lines ~36–41)

- [ ] Remove the `!SharedSlotManager.getInstance().getOriginalOwner(unit)` check from `trackUnit()`
- [ ] Remove the associated comment about neutralized units / cargo

### `MinimapIconManager` — `getOriginalOwner()` reference

**File:** `src/app/managers/minimap-icon-manager.ts` (Line ~415)

- [ ] Remove the `SharedSlotManager.getInstance().getOriginalOwner(city.guard.unit)` lookup in `updateIconColor()`
- [ ] Simplify: always use `city.getOwner()` since ownership is no longer transferred to NEUTRAL_HOSTILE

### `GameLoopState` — call sites

**File:** `src/app/game/game-mode/base-game-mode/game-loop-state.ts`

- [ ] Remove `neutralizePlayerUnits()` call from `onPlayerLeft()` (Line ~363)
- [ ] Remove `neutralizePlayerUnits()` call from `onPlayerDead()` (Line ~385)
- [ ] Remove immediate `evaluateAndRedistribute()` call from `onPlayerLeft()` (Line ~364)
- [ ] Remove immediate `evaluateAndRedistribute()` call from `onPlayerDead()` (Line ~386)

### Cleanup

- [ ] Check if `NEUTRAL_HOSTILE` import is still used elsewhere in `SharedSlotManager`; remove if unused
- [ ] Check if `TransportManager` import is still needed in `SharedSlotManager` after removing `neutralizePlayerUnits()`

---

## Addition Checklist

### Elimination Debuff System (new class)

> **Note:** The DoT implementation will be provided in a future commit by another developer.

- [ ] Create `EliminationDebuffManager` class (e.g., `src/app/managers/elimination-debuff-manager.ts`)
- [ ] Track debuffed players and their non-exempt units
- [ ] Iterate all units across real player + shared slots on elimination
- [ ] Skip exempt units: `IsUnitType(unit, UNIT_TYPE.GUARD)`, `IsUnitType(unit, UNIT_TYPE.CITY)`, `IsUnitType(unit, UNIT_TYPE.BUILDING)`
- [ ] Apply periodic damage effect to non-exempt units (visible visual effect)
- [ ] On unit death, remove from tracking
- [ ] When no tracked units remain, signal slots ready for reclamation

### Spawner — add `isEliminated()` guard (REQUIRED)

**File:** `src/app/spawner/spawner.ts` (Line ~67)

> **This is a critical fix.** The old system transferred barracks to `NEUTRAL_HOSTILE`, so the `if (this.getOwner() == NEUTRAL_HOSTILE) return` guard in `Spawner.step()` stopped spawning. With the new system, barracks stay owned by the eliminated player. The `GetPlayerSlotState()` check only catches LEFT players (slot state = `PLAYER_SLOT_STATE_LEFT`). **Forfeited players who are still connected have slot state `PLAYER_SLOT_STATE_PLAYING`**, so spawning would continue indefinitely.

- [ ] Add an `isEliminated()` check to `Spawner.step()` — resolve the real owner and check their player status:
  ```typescript
  const owner = this.getOwner();
  if (owner == NEUTRAL_HOSTILE) return;
  const matchPlayer = PlayerManager.getInstance().players.get(owner);
  if (matchPlayer && matchPlayer.status.isEliminated()) return;
  ```

### Slot Reclamation

**File:** `src/app/game/services/shared-slot-manager.ts`

- [ ] Verify `evaluateAndRedistribute()` on turn start picks up slots freed by debuff deaths — **confirmed**: `pendingFreeSlots` mechanism already handles this; eliminated player handles are added to `pendingFreeSlots` when `getUnitCount > 0`
- [ ] Verify `unit-death-event.ts` triggers `evaluateAndRedistribute()` when a pending free slot hits 0 units — **confirmed**: Lines ~41–43 already do this
- [ ] Optionally: debuff manager calls `evaluateAndRedistribute()` when last tracked unit dies (avoids waiting for next turn)

### Income Cutoff

- [ ] Verify income is set to 0/1 on elimination — **confirmed**: `onPlayerDeadHandle()` sets income to 1, `onPlayerLeftHandle()` sets income to 0
- [ ] Verify `onStartTurn` only gives income to active players — **confirmed**: `.filter((x) => x.status.isActive())` already gates income

### `GameLoopState` Integration

**File:** `src/app/game/game-mode/base-game-mode/game-loop-state.ts`

- [ ] Add `EliminationDebuffManager.getInstance().applyDebuff(player)` call in `onPlayerLeft()`
- [ ] Add `EliminationDebuffManager.getInstance().applyDebuff(player)` call in `onPlayerDead()`

---

## Edge Cases

- [ ] **Player forfeits (`-ff`) while still connected** — slot state is still `PLAYER_SLOT_STATE_PLAYING`; spawner MUST use `isEliminated()` guard (not just slot state) to stop spawning
- [ ] **Player leaves with 0 units** — no debuff needed; `evaluateAndRedistribute()` on next turn start frees slots immediately (unit count already 0)
- [ ] **Player leaves with only cities (guards/cops/barracks)** — no debuffable units; cities remain capturable; slots stay occupied until cities are captured by other players
- [ ] **Another player captures a city from eliminated player** — normal city capture via `OwnershipChangeEvent`; if it's the last city, `status.set(NOMAD)` fires but `NomadStrategy` has `isEliminated()` guard and returns early — **safe, no status change**
- [ ] **Eliminated player's unit kills another unit while debuffed** — normal kill credit via `getOwnerOfUnit()` (unit is still owned by the player, no `originalOwnerMap` needed); `onKill`/`onDeath` callbacks fire normally
- [ ] **Transport with cargo — debuff** — debuff should apply to transport; when transport dies, `TransportManager.onDeath()` handles cargo (ejects/kills); cargo units will also should be debuffed independently
- [ ] **Unit trained by eliminated player's barracks** — can't happen: `onPlayerDeadHandle` sets income to 1 and player can't queue; even if a unit was mid-training, `Spawner.step()` won't spawn new units after the `isEliminated()` guard is added
- [ ] **Debuffed unit on shared slot dies** — `unit-death-event.ts` decrements `slotUnitCounts` using raw owner (`GetOwningPlayer`), then checks `pendingFreeSlots` — **works correctly** since the unit is still owned by the shared slot (not transferred to NEUTRAL_HOSTILE)
- [ ] **Multiple eliminations in same frame** — `evaluateAndRedistribute()` is idempotent, so multiple calls are safe; all eliminated players' `pendingFreeSlots` are processed correctly
- [ ] **Player eliminated during countdown/pre-game** — `DeadStrategy` has `GlobalGameData.matchState != 'inProgress'` guard; debuff should also guard against non-inProgress state
- [ ] **Team mode (non-FFA)** — old neutralization was FFA-only (`isFFA()` guard inside `neutralizePlayerUnits`); decide if debuff should apply universally or remain FFA-only
- [ ] **STFU status** — `STFU` is `isEliminated() = true`; if debuff is applied on DEAD/LEFT only, STFU players won't get debuffed but their slots won't be reclaimed either (STFU is temporary and reverts)

---

## Migration Steps

- [ ] 1. Remove `neutralizePlayerUnits()` calls from `GameLoopState.onPlayerLeft()` and `onPlayerDead()`
- [ ] 2. Remove `evaluateAndRedistribute()` calls from same handlers (slot reclamation is now organic)
- [ ] 3. Remove `originalOwnerMap` field, methods, and all consumer references (`unit-death-event.ts`, `UnitLagManager`, `MinimapIconManager`, `reset()`)
- [ ] 4. Simplify `getOwnerOfUnit()` — remove `originalOwnerMap` fallback
- [ ] 5. Add `isEliminated()` guard to `Spawner.step()` to prevent eliminated players from spawning
- [ ] 6. Stub out `EliminationDebuffManager` with the interface but no DoT logic yet (placeholder)
- [ ] 7. Wire `applyDebuff()` calls into `GameLoopState.onPlayerLeft()` and `onPlayerDead()`
- [ ] 8. Future commit (other dev): implement actual damage-over-time tick in `EliminationDebuffManager`
- [ ] 9. Test: player forfeits → units stop spawning → debuff applied → units decay → slots reclaimed
- [ ] 10. Test: player leaves → same flow but `PLAYER_SLOT_STATE_LEFT` also blocks spawning
