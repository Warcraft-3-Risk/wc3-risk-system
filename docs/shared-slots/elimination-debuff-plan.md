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

## Progress — What Has Been Done (commit `454dc3d`)

The following was implemented by xate and is already merged:

- [x] Per-unit-type debuff abilities defined in `src/configs/ability-id.ts` (`ELIMINATED_GENERAL`, `ELIMINATED_MARINE`, etc. — 15 ability IDs)
- [x] WC3 map data updated (`war3map.w3a`, `war3map.wts`, `war3mapSkin.w3a`) with the actual ability definitions
- [x] `ELIMINATED_BUFF_MAP` mapping unit type IDs → debuff ability IDs in `on-player-status.ts`
- [x] `applyEliminatedBuff(playerHandle)` function — applies debuff to all non-exempt units after a 60s delay
- [x] `removeEliminatedBuff(unit)` function — strips debuff from a unit
- [x] `hasEliminatedBuff(unit)` function — checks if a unit has the debuff
- [x] `removeEliminatedBuff()` called in `Guard.set()` — correctly strips debuff when a unit becomes a guard
- [x] `applyEliminatedBuff()` wired into `GameLoopState.onPlayerLeft()` and `onPlayerDead()`
- [x] `CAPTAIN` renamed to `MAJOR` across `unit-id.ts`, `tracked-units.ts`, `tooltip-manager.ts`

### Issues with current implementation

> **The debuff was built on top of the old neutralization system instead of replacing it.**

1. **`applyEliminatedBuff()` enumerates `Player(PLAYER_NEUTRAL_AGGRESSIVE)` and uses `cm.getOriginalOwner(u)`** — this assumes units have been transferred to NEUTRAL_HOSTILE first. Our plan is to remove that transfer entirely and keep units on the player's own slot. **This function must be rewritten to enumerate the player's real slot + shared slots instead.**

2. **`neutralizePlayerUnits()` and `evaluateAndRedistribute()` are still called** immediately after `applyEliminatedBuff()` in both `onPlayerLeft()` and `onPlayerDead()`. These should be removed per the plan.

3. **60-second delay is hardcoded** — `applyEliminatedBuff` uses a 60s timer, relying on the fact that units are already NEUTRAL_HOSTILE by then. With the new approach (no NEUTRAL_HOSTILE transfer), the function runs against the player's own slots, so the delay can be kept as a gameplay grace period but the enumeration logic must change.

4. **Missing `ADMIRAL` in `ELIMINATED_BUFF_MAP`** — `ADMIRAL` is defined in `UNIT_ID` and `TRACKED_UNITS` but has no corresponding eliminated buff ability. Admirals will silently skip the debuff.

---

## Removal Checklist

### `SharedSlotManager` — `neutralizePlayerUnits()`

**File:** `src/app/game/services/shared-slot-manager.ts`

- [x] ~~Remove or gut the `neutralizePlayerUnits()` method body~~ — entire method removed
- [x] ~~Remove `NEUTRAL_HOSTILE` ownership transfers (`SetUnitOwner`)~~ — removed with method
- [x] ~~Remove `SetUnitColor` recoloring logic~~ — removed with method
- [x] ~~Remove city-specific neutralization (`city.setOwner(NEUTRAL_HOSTILE)`)~~ — removed with method
- [x] ~~Remove transport stop orders (`IssueImmediateOrder(unit, 'stop')`)~~ — removed with method
- [x] ~~Remove the lazy `require('../../managers/transport-manager')` import inside the method~~ — removed with method

### `SharedSlotManager` — `originalOwnerMap`

**File:** `src/app/game/services/shared-slot-manager.ts`

- [x] ~~Remove field: `originalOwnerMap: Map<unit, player>`~~ — removed
- [x] ~~Remove method: `setOriginalOwner()`~~ — removed
- [x] ~~Remove method: `getOriginalOwner()`~~ — removed
- [x] ~~Remove method: `clearOriginalOwner()`~~ — removed
- [x] ~~Update `getOwnerOfUnit()` — remove the `originalOwnerMap.get(unit)` lookup~~ — now returns `this.getOwner(GetOwningPlayer(unit))` directly
- [x] ~~Remove `this.originalOwnerMap.clear()` from `reset()`~~ — removed

### `unit-death-event.ts` — `originalOwnerMap` cleanup

**File:** `src/app/triggers/unit_death/unit-death-event.ts`

- [x] ~~Remove `SharedSlotManager.getInstance().clearOriginalOwner(dyingUnit)` call~~ — removed
- [x] ~~Remove associated comment~~ — removed

### `UnitLagManager` — `getOriginalOwner()` reference

**File:** `src/app/game/services/unit-lag-manager.ts`

- [x] ~~Remove the `!SharedSlotManager.getInstance().getOriginalOwner(unit)` check from `trackUnit()`~~ — removed
- [x] ~~Remove the associated comment about neutralized units / cargo~~ — updated

### `MinimapIconManager` — `getOriginalOwner()` reference

**File:** `src/app/managers/minimap-icon-manager.ts`

- [x] ~~Remove the `SharedSlotManager.getInstance().getOriginalOwner(city.guard.unit)` lookup in `updateIconColor()`~~ — removed
- [x] ~~Simplify: always use `city.getOwner()`~~ — done

### `GameLoopState` — call sites

**File:** `src/app/game/game-mode/base-game-mode/game-loop-state.ts`

- [x] ~~Remove `neutralizePlayerUnits()` call from `onPlayerLeft()`~~ — removed
- [x] ~~Remove `neutralizePlayerUnits()` call from `onPlayerDead()`~~ — removed
- [x] ~~Remove immediate `evaluateAndRedistribute()` call from `onPlayerLeft()`~~ — removed
- [x] ~~Remove immediate `evaluateAndRedistribute()` call from `onPlayerDead()`~~ — removed

### Cleanup

- [x] ~~Check if `NEUTRAL_HOSTILE` import is still used elsewhere in `SharedSlotManager`; remove if unused~~ — removed
- [x] ~~Check if `TransportManager` import is still needed in `SharedSlotManager`~~ — removed (was lazy-required inside deleted method)
- [x] ~~Remove unused `SettingsContext` import from `SharedSlotManager`~~ — removed

---

## Remaining Addition Checklist

### Rewrite `applyEliminatedBuff()` to work without NEUTRAL_HOSTILE

**File:** `src/app/game/game-mode/utillity/on-player-status.ts`

- [x] ~~Change unit enumeration from `Player(PLAYER_NEUTRAL_AGGRESSIVE)` to iterating the player's real slot + shared slots~~ — now uses `[playerHandle, ...cm.getSharedSlotsByPlayer(playerHandle)]`
- [x] ~~Remove the `cm.getOriginalOwner(u)` check~~ — removed; units are on the player's own slots
- [x] ~~Keep the 60s delay as a gameplay grace period~~ — kept as-is
- [x] ~~Verify exempt unit filters still work~~ — `UNIT_TYPE_DEAD`, `UNIT_TYPE_STRUCTURE`, `UNIT_TYPE.GUARD` filters unchanged and correct

### Add missing `ADMIRAL` debuff

> **Requires WC3 World Editor** — the ability must be created manually in the map editor (cannot be scripted). The code changes below depend on the ability ID assigned by the editor.

**File:** `src/configs/ability-id.ts` + `src/app/game/game-mode/utillity/on-player-status.ts`

- [ ] **(Manual — WC3 Editor)** Create a new `ELIMINATED_ADMIRAL` ability in the map editor, matching the pattern of the other eliminated buffs
- [ ] Add `ELIMINATED_ADMIRAL: FourCC('...')` to `ABILITY_ID` using the ID from the editor
- [ ] Add `[UNIT_ID.ADMIRAL, ABILITY_ID.ELIMINATED_ADMIRAL]` to `ELIMINATED_BUFF_MAP`

### Spawner — add `isEliminated()` guard (REQUIRED)

**File:** `src/app/spawner/spawner.ts`

- [x] ~~Add an `isEliminated()` check to `Spawner.step()`~~ — added after slot state check; uses `PlayerManager.getInstance().players.get(this.getOwner())` to resolve and check `matchPlayer.status.isEliminated()`

### Slot Reclamation

**File:** `src/app/game/services/shared-slot-manager.ts`

- [x] Verify `evaluateAndRedistribute()` on turn start picks up slots freed by debuff deaths — **confirmed**: `pendingFreeSlots` mechanism already handles this
- [x] Verify `unit-death-event.ts` triggers `evaluateAndRedistribute()` when a pending free slot hits 0 units — **confirmed**: works correctly
- [ ] Optionally: debuff manager calls `evaluateAndRedistribute()` when last tracked unit dies (avoids waiting for next turn)

### Income Cutoff

- [x] Verify income is set to 0/1 on elimination — **confirmed**: `onPlayerDeadHandle()` sets income to 1, `onPlayerLeftHandle()` sets income to 0
- [x] Verify `onStartTurn` only gives income to active players — **confirmed**: `.filter((x) => x.status.isActive())` already gates income

---

## Edge Cases

- [ ] **Player forfeits (`-ff`) while still connected** — slot state is still `PLAYER_SLOT_STATE_PLAYING`; spawner MUST use `isEliminated()` guard (not just slot state) to stop spawning
- [ ] **Player leaves with 0 units** — no debuff needed; `evaluateAndRedistribute()` on next turn start frees slots immediately (unit count already 0)
- [ ] **Player leaves with only cities (guards/cops/barracks)** — no debuffable units; cities remain capturable; slots stay occupied until cities are captured by other players
- [ ] **Another player captures a city from eliminated player** — normal city capture via `OwnershipChangeEvent`; if it's the last city, `status.set(NOMAD)` fires but `NomadStrategy` has `isEliminated()` guard and returns early — **safe, no status change**
- [ ] **Eliminated player's unit kills another unit while debuffed** — normal kill credit via `getOwnerOfUnit()` (unit is still owned by the player, no `originalOwnerMap` needed); `onKill`/`onDeath` callbacks fire normally
- [ ] **Transport with cargo — debuff** — debuff should apply to transport; when transport dies, `TransportManager.onDeath()` handles cargo (ejects/kills); cargo units should also be debuffed independently
- [ ] **Unit trained by eliminated player's barracks** — can't happen: `onPlayerDeadHandle` sets income to 1 and player can't queue; even if a unit was mid-training, `Spawner.step()` won't spawn new units after the `isEliminated()` guard is added
- [ ] **Debuffed unit on shared slot dies** — `unit-death-event.ts` decrements `slotUnitCounts` using raw owner (`GetOwningPlayer`), then checks `pendingFreeSlots` — **works correctly** since the unit is still owned by the shared slot (not transferred to NEUTRAL_HOSTILE)
- [ ] **Multiple eliminations in same frame** — `evaluateAndRedistribute()` is idempotent, so multiple calls are safe; all eliminated players' `pendingFreeSlots` are processed correctly
- [ ] **Player eliminated during countdown/pre-game** — `DeadStrategy` has `GlobalGameData.matchState != 'inProgress'` guard; debuff should also guard against non-inProgress state
- [ ] **Team mode (non-FFA)** — old neutralization was FFA-only (`isFFA()` guard inside `neutralizePlayerUnits`); decide if debuff should apply universally or remain FFA-only
- [ ] **STFU status** — `STFU` is `isEliminated() = true`; if debuff is applied on DEAD/LEFT only, STFU players won't get debuffed but their slots won't be reclaimed either (STFU is temporary and reverts)
- [ ] **Guard becomes debuffed unit** — if a guard is replaced/released, the new non-guard unit should receive the debuff if the owning player is eliminated. `Guard.set()` already calls `removeEliminatedBuff()` for the reverse case.

---

## Migration Steps

- [x] 1. ~~Define per-unit-type debuff abilities in WC3 map data and `ability-id.ts`~~ (done in `454dc3d`)
- [x] 2. ~~Implement `ELIMINATED_BUFF_MAP`, `applyEliminatedBuff()`, `removeEliminatedBuff()`, `hasEliminatedBuff()`~~ (done in `454dc3d`)
- [x] 3. ~~Wire `applyEliminatedBuff()` into `GameLoopState.onPlayerLeft()` and `onPlayerDead()`~~ (done in `454dc3d`)
- [x] 4. ~~Call `removeEliminatedBuff()` in `Guard.set()` to strip debuff when a unit becomes a guard~~ (done in `454dc3d`)
- [x] 5. ~~Rewrite `applyEliminatedBuff()` to enumerate the player's own slots instead of `NEUTRAL_HOSTILE` + `getOriginalOwner()`~~
- [ ] 6. Add missing `ADMIRAL` entry to `ELIMINATED_BUFF_MAP` (requires manual WC3 Editor ability creation first)
- [x] 7. ~~Remove `neutralizePlayerUnits()` calls from `GameLoopState.onPlayerLeft()` and `onPlayerDead()`~~
- [x] 8. ~~Remove `evaluateAndRedistribute()` calls from same handlers (slot reclamation is now organic)~~
- [x] 9. ~~Remove `originalOwnerMap` field, methods, and all consumer references (`unit-death-event.ts`, `UnitLagManager`, `MinimapIconManager`, `reset()`)~~
- [x] 10. ~~Simplify `getOwnerOfUnit()` — remove `originalOwnerMap` fallback~~
- [x] 11. ~~Add `isEliminated()` guard to `Spawner.step()` to prevent eliminated players from spawning~~

## Manual User Test (Not performed by AI)

- [ ] 1. User Manual Test: player forfeits → units stop spawning → debuff applied after 60s → units decay → slots reclaimed
- [ ] 2. User Manual Test: player leaves → same flow but `PLAYER_SLOT_STATE_LEFT` also blocks spawning
