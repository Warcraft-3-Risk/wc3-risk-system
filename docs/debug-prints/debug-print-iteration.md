
---

## All debugPrint Call Sites

Complete reference of every `debugPrint(` call site in the codebase.

### land-city.ts
- [x] Line 74 — `'Not a capital then swap'` — DC.city
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 81 — `'If same owner then swap'` — DC.city
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 91 — `"If enemy team then don't swap"` — DC.city
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 105 — `'You can not swap the guard of an allied capital!'` — DC.city
  - [x] `if (DEBUG_PRINTS.master)` guard added

### guard.ts
- [x] Line 89 — `[SharedSlots] Unit removed on slot ${id}` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added

### game-loop-state.ts
- [x] Line 94 — `'Error in Timer ' + error` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 128 — `'first turn, turning off fog'` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 143 — `'Phase is dusk (0), turning on fog'` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 150 — `'Phase is night (1), turning on fog'` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 157 — `'Phase is dawn (2), turning off fog'` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 164 — `'Phase is day (3), turning off fog'` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 173 — `[Redistribute] Triggered by: turn start (turn ${turn})` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 175 — `GameLoopState: Slot redistribution on turn start: ${changed}` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 177 — `[SharedSlots] === Turn ${turn} Slot Summary ===` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 216 — `GameLoopState.onEndTurn() - Refreshing rating stats UI` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 360 — `[Redistribute] Triggered by: player left (${name})` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 382 — `[Redistribute] Triggered by: player dead (${name})` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added

### reset-state.ts
- [x] Line 74 — `e as string` (error catch) — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added

### capitals-distribute-capitals-state.ts
- [x] Line 18 — `'Distributing Capitals'` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 22 — `Player ${player} has chosen a capital: ${city}` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 28 — `Player ${player} has chosen a capital in ${country}` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 39 — `countryName` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 43 — `Countries with capitals: ${list}` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 55 — `All selectable cities count: ${count}` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 60 — `Selectable countries without capitals: ${list}` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 62 — `Players with capitals: ${list}` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 72 — `Player ${player} has been randomly assigned a capital in ${country}` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 93 — `[SharedSlots] Guard distributed to player ${id}, incrementing count` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added

### capitals-distribute-state.ts
- [x] Line 14 — `'5. Distributing Capitals'` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added

### capitals-game-loop-state.ts
- [x] Line 53 — `'onSwapGuard'` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added

### capitals-selection-state.ts
- [x] Line 24 — `'1. Capitals Selection'` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 25 — `'this.stateData is ' + this.stateData` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 30 — `'2. Capitals Selection'` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 34 — `'3. Capitals Selection'` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 44 — `'6. Capitals Selection'` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 73 — `'No players are eliminated, skipping capital reset.'` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 82 — `Player ${name} is eliminated.` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 88 — `Player ${name} has left the game during capital selection.` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added

### base-mode.ts
- [x] Line 28 — `Restarting ${gameMode}, state length: ${length}` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 35 — `${this.currentState.constructor.name}` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added

### w3c-mode.ts
- [x] Line 54 — `[W3CMode] onPlayerLeft` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 60 — `[W3CMode] onEnterState)` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 66 — `[W3CMode] onPlayerForfeit` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added

### promode-game-loop-state.ts
- [x] Line 22 — `Checking city count for participant ${name}: ${count} vs opponents: ${count}` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 44 — `Setting status of ${name} to DEAD due to city count.` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 51 — `Setting status of ${name} to DEAD due to city count.` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 56 — `Participant ${name} is losing in city count.` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added

### remove-units.ts
- [x] Line 9 — `Removing units for player ${name} index ${i}` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added

### w3c-game-over-state.ts
- [x] Line 63 — `${name} has won the best of 2 series.` — DC.gameMode
  - [x] `if (DEBUG_PRINTS.master)` guard added

### shared-slot-manager.ts
- [x] Line 57 — `[SharedSlots] Increment slot ${id}: ${old} → ${new}` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 64 — `[SharedSlots] Decrement slot ${id}: ${old} → ${new}` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 89 — `[SharedSlots] Lowest slot for player ${id}: slot ${id} (count: ${count})` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 97 — `[SharedSlots] === Slot Summary ===` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 101 — `[SharedSlots] Slot ${id} (owner: ${id}): ${count} units` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 117 — `[Neutralize] Skipping — not FFA mode` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 121 — `[Neutralize] Neutralizing all units for player ${id}` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 124 — `[Neutralize] Processing ${count} slots: [${list}]` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 149 — `[Neutralize] Reset city (cop owner changed via city.setOwner)` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 170 — `[Neutralize] Found transport ${name} on slot ${id}, checking cargo` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 172 — `[Neutralize] Found transport ${name} with ${count} cargo units` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 174 — `[Neutralize] Adding cargo unit ${name} inside transport ${name} to transfer list` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 190 — `[Neutralize] Transferred unit ${name} from slot ${id} to NEUTRAL_HOSTILE` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 201 — `[Neutralize] Cleared ${count} shared slot mappings for player ${id}` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 203 — `[Neutralize] Complete. All slots should now have 0 units.` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 214 — `[Redistribute] Shared slot allocation disabled, skipping` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 218 — `[Redistribute] === Running evaluateAndRedistribute() ===` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 233 — `[Redistribute] Active players: ${list}` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 234 — `[Redistribute] Eliminated players: ${list}` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 237 — `[Redistribute] No active players, returning false` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 242 — `[Redistribute] Too many active players (${count}), skipping` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 255 — `[Redistribute] Freed slot ${id} from eliminated player ${id} (unitCount was 0)` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 265 — `[Redistribute] Slot ${id} marked pendingFree (unitCount: ${count})` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 284 — `[Redistribute] Freed eliminated player handle ${id} (unitCount was 0)` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 312 — `[Redistribute] Available pool: ${count} slots` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 324 — `[Redistribute] No slots available at all, returning false` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 330 — `[Redistribute] Target: ${count} per player (${count} leftover unassigned)` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 348 — `[Redistribute] Player ${id}: current=${count}, target=${count}, delta=${delta}` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 372 — `[Redistribute] No changes needed, returning false` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 380 — `[Redistribute] Donor ${id}: donating slot ${id}` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 412 — `[Redistribute] Receiver ${id}: assigned slot ${id}` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 420 — `[Redistribute] Receiver ${id}: assigned slot ${id}` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 424 — `[Redistribute] Complete. Leftover unassigned: ${count}` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 440 — `[Redistribute] Tearing down slot ${id} (prev owner: ${id})` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 448 — `[Redistribute] Un-allying sibling slots ${id} ↔ ${id}` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 468 — `[Redistribute] Un-allying cross-team slots ${id} ↔ ${id}` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 483 — `[Redistribute] Assigning slot ${id} to player ${id}` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 492 — `[Redistribute] Wiped all alliances for slot ${id} before reassignment` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 502 — `[SharedSlotManager] Player ${id} now has ${count} shared slots: [${list}]` — DC.clientManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 544 — `[Redistribute] Spreading ${count} units for player ${id} across ${count} slots` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 580 — `[Redistribute] Finished spreading units for player ${id}` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 586 — `[Neutralize] Stored original owner for unit: player ${id}` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 610 — `SharedSlotManager: Found ${count} empty player slots` — DC.clientManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 612 — `SharedSlotManager: Found ${count} players that have left with no units or cities` — DC.clientManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 627 — `SharedSlotManager: Invalid player or slot in givePlayerFullControlOfSlot` — DC.clientManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 631 — `SharedSlotManager: Giving player ${name} full control of slot ${id}` — DC.clientManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 642 — `SharedSlotManager: Allying sibling slots ${id} ↔ ${id}` — DC.clientManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 662 — `SharedSlotManager: Allying cross-team slots ${id} ↔ ${id}` — DC.clientManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 733 — `SharedSlotManager: Resetting all player colors and names to default` — DC.clientManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 758 — `SharedSlotManager: Reset complete` — DC.clientManager
  - [x] `if (DEBUG_PRINTS.master)` guard added

### unit-lag-manager.ts
- [x] Line 53 — `UnitLagManager: Tracking ${name} via MinimapIconManager.` — DC.unitLag
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 58 — `UnitLagManager: Untracking ${name}.` — DC.unitLag
  - [x] `if (DEBUG_PRINTS.master)` guard added

### win-tracker.ts
- [x] Line 60 — `Played matches: ${count}` — DC.winTracker
  - [x] `if (DEBUG_PRINTS.master)` guard added

### standard-distribution-service.ts
- [x] Line 151 — `[SharedSlots] Guard distributed to player ${id}, incrementing count` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added

### minimap-icon-manager.ts
- [x] Line 66 — `MinimapIconManager: Initialized for terrain: ${MAP_TYPE}` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 67 — `MinimapIconManager: Active: ${isActive}` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 94 — `World bounds: ${minX}, ${minY} to ${maxX}, ${maxY}` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 95 — `World size: ${width}x${height}` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 96 — `Minimap frame handle: ${found/null}` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 109 — `MinimapIconManager: Creating icons for ${count} cities` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 115 — `MinimapIconManager: Created ${count} icons` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 138 — `MinimapIconManager: Expanded pool by ${count}. Total size: ${total}` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 140 — `MinimapIconManager: Error expanding pool - ${e}` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 203 — `MinimapIconManager: Pool exhausted, expanding by 200` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 209 — `MinimapIconManager: Failed to create/recycle frame for unit` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 232 — `MinimapIconManager: Count of tracked units: ${count}, Pool size: ${size}` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 234 — `MinimapIconManager: Error registering unit - ${e}` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 257 — `MinimapIconManager: Failed to create frame for city` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 283 — `MinimapIconManager: Error creating icon - ${e}` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 319 — `MinimapIconManager: Icon #${count} normalized: ${x}, ${y}` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 320 — `MinimapIconManager: Icon #${count} absolute: ${x}, ${y}` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 569 — `MinimapIconManager: Adding double-ring border for capital city` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 574 — `MinimapIconManager: Failed to create outer border frame for capital` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 596 — `MinimapIconManager: Failed to create inner border frame for capital` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 635 — `MinimapIconManager: Capital double-ring border created successfully` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 637 — `MinimapIconManager: Error adding capital border - ${e}` — DC.minimap
  - [x] `if (DEBUG_PRINTS.master)` guard added

### transport-manager.ts
- [x] Line 370 — `Unit Unloaded Event Triggered for unit: ${name}` — DC.transport
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 453 — `Transport Patrol Casted` — DC.transport
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 466 — `Transport Patrol Valid` — DC.transport
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 469 — `Transport Patrol Already Enabled - Stopping Previous Patrol` — DC.transport
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 473 — `Transport Patrol Starting` — DC.transport
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 484 — `Patrol Origin: (${x}, ${y})` — DC.transport
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 485 — `Patrol Destination: (${x}, ${y})` — DC.transport
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 491 — `Registering Patrol Timed Event` — DC.transport
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 493 — `Transport Patrol Tick` — DC.transport
  - [x] `if (DEBUG_PRINTS.master)` guard added

### unit-kill-tracker.ts
- [x] Line 58 — `[TRACKER] Killing unit is null, returning 0` — DC.killTracker
  - [x] `if (DEBUG_PRINTS.master)` guard added

### victory-manager.ts
- [x] Line 95 — `No opponents remain!` — DC.victory
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 106 — `${name} has met the city count victory condition!` — DC.victory
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 151 — `Adding win for team ${number}` — DC.victory
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 153 — `Win added for team member with highest income` — DC.victory
  - [x] `if (DEBUG_PRINTS.master)` guard added

### w3c-draw-manager.ts
- [x] Line 36 — `[DrawManager] Player already voted for draw.` — DC.drawManager
  - [x] `if (DEBUG_PRINTS.master)` guard added

### player-manager.ts
- [x] Line 150 — `Player ${id} has left. Units: ${count}, Cities: ${count}` — DC.player
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 156 — `Player ${id} added to left players list for potential shared slot allocation.` — DC.player
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 159 — `Player ${id} not added to left players list (has units or cities).` — DC.player
  - [x] `if (DEBUG_PRINTS.master)` guard added

### rating-manager.ts
- [x] Line 140 — `[RatingManager] loadPlayerRating: Loading file for ${btag}` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 145 — `[RatingManager] loadPlayerRating: No file found for ${btag}` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 153 — `[RatingManager] loadPlayerRating: Checksum FAILED for ${btag}` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 175 — `[RatingManager] loadPlayerRating: Checksum OK for ${btag}, rating=${rating}` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 187 — `[RatingManager] loadPlayerRating: Found pending entry for ${btag}` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 193 — `[RatingManager] loadPlayerRating: Finalizing pending entry for ${btag}` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 209 — `[RatingManager] loadPlayerRating: Finalization save result=${saved}` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 211 — `[RatingManager] loadPlayerRating: FAILED to retrieve playerData` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 217 — `[RatingManager] loadPlayerRating: No pending entry for ${btag}` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 320 — `[RatingManager] Captured initial game data: ${count} players` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 647 — `[RatingManager] Player ${btag} already finalized, skipping` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 661 — `[RatingManager] Finalizing ${btag}: eliminated #${count}, placement ${place}` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 780 — `[RatingManager] Saved finalized rating for ${btag}: ${old} -> ${new}` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 829 — `[RatingManager] calculateAndSaveRatings: ${count} survivors to finalize` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 953 — `[RatingManager] Saved survivor rating for ${btag}: ${old} -> ${new}` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 974 — `[RatingManager] saveRatingsInProgress called: turn=${turn}` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 980 — `[RatingManager] saveRatingsInProgress exiting early` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 996 — `[RatingManager] Filter: ${btag} excluded - already finalized` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 1004 — `[RatingManager] Filter: ${btag} excluded - player left the game` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 1010 — `[RatingManager] Filter: ${btag} excluded - isEliminated=true` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 1016 — `[RatingManager] Filter: ${btag} excluded - AI player` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 1020 — `[RatingManager] Filter: ${btag} INCLUDED - alive and not finalized` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 1026 — `[RatingManager] saveRatingsInProgress: No alive players after filtering` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 1033 — `[RatingManager] saveRatingsInProgress: ${count} alive players to save` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 1135 — `[RatingManager] Failed to save pending rating for ${btag}` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 1137 — `[RatingManager] Saved pending entry for ${btag}` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 1159 — `[RatingManager] broadcastFinalizedPlayerToOthers: Skipping self` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 1231 — `[RatingManager] Broadcast finalized player ${btag} to others database` — DC.ratingManager
  - [x] `if (DEBUG_PRINTS.master)` guard added

### rating-sync-manager.ts
- [x] Line 82 — `[RATING SYNC] ========== SYNC START ==========` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 83 — `[RATING SYNC] Local player: ${btag}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 84 — `[RATING SYNC] Human players count: ${count}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 93 — `[RATING SYNC]   Player ${i}: ${btag}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 98 — `[RATING SYNC] Only ${count} human(s), using local-only mode` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 113 — `[RATING SYNC] Non-observer players: ${count}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 118 — `[RATING SYNC] Only observers in lobby, using local-only mode` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 123 — `[RATING SYNC] Starting P2P sync with ${count} non-observer players` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 143 — `[RATING SYNC] All ${count} SyncRequests created` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 154 — `[RATING SYNC] Creating SyncRequest ${i}/${count} for ${btag}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 163 — `[RATING SYNC]   -> Built ${count} players to sync` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 174 — `[RATING SYNC] SyncRequest COMPLETED for ${btag}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 175 — `[RATING SYNC]   -> Received ${count} players` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 182 — `[RATING SYNC]   -> Player ${j}: ${btag} (rating=${rating})` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 186 — `[RATING SYNC]   -> First: ${btag} (rating=${rating})` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 187 — `[RATING SYNC]   -> Last: ${btag}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 193 — `[RATING SYNC] SyncRequest FAILED/TIMEOUT for ${btag}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 217 — `[RATING SYNC] buildPlayerSyncData: Skipping ${targetBtag}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 225 — `[RATING SYNC] buildPlayerSyncData: ERROR - No btag` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 229 — `[RATING SYNC] buildPlayerSyncData: Building data for ${btag}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 236 — `[RATING SYNC]   -> Reading personal file: ${path}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 241 — `[RATING SYNC]   -> Personal file exists: ${bool}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 260 — `[RATING SYNC]   -> Finalized pending game for sync: ${btag}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 262 — `[RATING SYNC]   -> Personal data: rating=${rating}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 269 — `[RATING SYNC]   -> Using default data (new player or corrupted file)` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 285 — `[RATING SYNC]   -> Reading others database for hash: ${hash}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 288 — `[RATING SYNC]   -> Others database has ${count} players` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 309 — `[RATING SYNC]   -> Added ${count} players from others database` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 311 — `[RATING SYNC]   -> No others database found or empty` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 314 — `[RATING SYNC]   -> Total players to sync: ${count}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 369 — `[RATING SYNC] handleSyncComplete: playerId=${id}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 375 — `[RATING SYNC]   -> Ignoring (sync already complete)` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 383 — `[RATING SYNC]   -> Stored ${count} players for playerId=${id}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 384 — `[RATING SYNC]   -> Progress: ${completed}/${expected} syncs complete` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 388 — `[RATING SYNC]   -> All syncs received, calling completeSync()` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 397 — `[RATING SYNC] Starting timeout timer: ${timeout}s` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 402 — `[RATING SYNC] TIMEOUT TRIGGERED!` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 407 — `[RATING SYNC]   -> Forcing completeSync() due to timeout` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 410 — `[RATING SYNC]   -> Sync already complete, timeout ignored` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 420 — `[RATING SYNC] ========== LOCAL ONLY MODE ==========` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 430 — `[RATING SYNC] Local player: ${btag}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 459 — `[RATING SYNC] Finalized pending game for ${btag}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 510 — `[RATING SYNC] Saving rating file for ${btag}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 512 — `[RATING SYNC] Save result: ${SUCCESS/FAILED}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 529 — `[RATING SYNC] loadOthersDatabase: Loading for hash ${name}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 534 — `[RATING SYNC]   -> No others data found or empty` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 538 — `[RATING SYNC]   -> Found ${count} players in others database` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 576 — `[RATING SYNC]   -> Added ${count} players, skipped ${count} duplicates` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 585 — `[RATING SYNC] ========== COMPLETE SYNC ==========` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 586 — `[RATING SYNC] isComplete=${bool}, completedSyncs=${count}/${expected}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 592 — `[RATING SYNC]   -> Already complete, returning` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 604 — `[RATING SYNC] Received data from ${count} players:` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 607 — `[RATING SYNC]   -> playerId=${id}: ${count} players` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 616 — `[RATING SYNC] Total received players (before dedup): ${count}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 617 — `[RATING SYNC] Self-reported entries: ${count}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 680 — `[RATING SYNC] ========== FINALIZE SYNC ==========` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 681 — `[RATING SYNC] allPlayersMap size: ${count}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 685 — `[RATING SYNC] Applying ${count} self-reported overrides...` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 689 — `[RATING SYNC]   -> Override ${btag}: rating ${old} -> ${new}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 694 — `[RATING SYNC]   -> Adding ${btag}: rating=${rating}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 704 — `[RATING SYNC] Local player: ${btag}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 742 — `[RATING SYNC] Merged players count: ${count}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 746 — `[RATING SYNC] WARNING: No data received from sync! Using FALLBACK` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 755 — `[RATING SYNC]   -> Loading local others database...` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 757 — `[RATING SYNC]   -> After loading others: ${count} players` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 763 — `[RATING SYNC] P2P sync succeeded with ${count} total entries` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 775 — `[RATING SYNC] saveOthersFile: Input ${count} players from sync` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 784 — `[RATING SYNC]   -> Local player: ${btag}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 794 — `[RATING SYNC]   -> Loading existing others database: ${count} players` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 802 — `[RATING SYNC]   -> No existing others database found` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 824 — `[RATING SYNC]   -> Merged: ${new} new, ${updated} updated, ${total} total` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 827 — `[RATING SYNC]   -> No other players to save, returning` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 857 — `[RATING SYNC]   -> After limit: ${count} players` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 859 — `[RATING SYNC]   -> First: ${btag} (rating=${rating})` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 861 — `[RATING SYNC]   -> Last: ${btag} (rating=${rating})` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 877 — `[RATING SYNC]   -> Writing to others file for hash: ${name}` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 879 — `[RATING SYNC]   -> Others file saved successfully` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 889 — `[RATING SYNC] ========== MERGE AND SAVE ==========` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 890 — `[RATING SYNC] Input: ${count} players to process` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 912 — `[RATING SYNC] Sorted and took top ${count} players` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 915 — `[RATING SYNC]   -> Top player: ${btag} (rating=${rating})` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 917 — `[RATING SYNC]   -> Last player: ${btag} (rating=${rating})` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 926 — `[RATING SYNC] Loading ${count} players into RatingManager memory...` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 936 — `[RATING SYNC] Initializing ${count} current game players...` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 944 — `[RATING SYNC] Ensuring personal file loaded for ${btag}...` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 946 — `[RATING SYNC] Saving personal rating file for ${btag}...` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 952 — `[RATING SYNC] Saving others file with ${count} players...` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 957 — `[RATING SYNC] ========== SYNC FULLY COMPLETE ==========` — DC.ratingSync
  - [x] `if (DEBUG_PRINTS.master)` guard added

### spawner.ts
- [x] Line 86 — `[SharedSlots] Spawned unit for player ${id} on slot ${id}` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added

### unit-trained-event.ts
- [x] Line 26 — `[SharedSlots] Transport reassigned from shared slot ${id} to real owner ${id}` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 30 — `[SharedSlots] Transport trained on real owner slot ${id}` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 38 — `[SharedSlots] Trained unit reassigned from slot ${id} to slot ${id}` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 42 — `[SharedSlots] Trained unit on slot ${id}` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added

### unit-death-event.ts
- [x] Line 30 — `Unit Death Event Triggered for ${name} killed by ${name}` — DC.events
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 34 — `[SharedSlots] Unit died on slot ${id}` — DC.sharedSlots
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 42 — `[Redistribute] Triggered by: unit death on pending free slot ${id}` — DC.redistribute
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 67 — `[KILL TRACKER] Skipping deny - unit killed its own unit` — DC.killTracker
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 70 — `[KILL TRACKER] Skipping name update - killing unit is a building` — DC.killTracker
  - [x] `if (DEBUG_PRINTS.master)` guard added
- [x] Line 73 — `[KILL TRACKER ERROR] Exception: ${e}` — DC.killTracker
  - [x] `if (DEBUG_PRINTS.master)` guard added

### unit-name-helper.ts
- [x] Line 64 — `[NAME HELPER] Unit is null, returning` — DC.killTracker
  - [x] `if (DEBUG_PRINTS.master)` guard added
