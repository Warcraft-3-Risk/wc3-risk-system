# Debug Print Categories

Reference document for all `debugPrint` subsystems. Use this to plan which categories belong in `DEBUG_PRINTS` and decide what to enable/disable during development.

## Current Implementation

- **Toggle:** `SHOW_DEBUG_PRINTS` in `src/configs/game-settings.ts` — single kill switch for all output
- **File logging:** `SAVE_DEBUG_LOGS_TO_FILE` — writes timestamped logs via `DebugLogger`
- **Function:** `debugPrint()` in `src/app/utils/debug-print.ts` — prints with `DEBUG:` prefix, optionally logs to file

**38 files** import `debugPrint` (**28 with active calls**, 9 import-only, 1 definition). Estimated **250+** call sites.

---

## Proposed `DEBUG_PRINTS` Categories

```ts
export const DEBUG_PRINTS = {
	master: true, // kill switch for everything
	ratingSync: true, // [RATING SYNC] P2P sync, data merging (~68 calls)
	ratingManager: true, // [RatingManager] file I/O, checksums, finalization (~25 calls)
	slotCount: true, // [SharedSlots] unit count tracking per slot (~20 calls)
	redistribute: true, // [Redistribute] slot redistribution on leave/death (~25 calls)
	neutralize: true, // [Neutralize] converting leaver units to neutral (~8 calls)
	clientManager: true, // ClientManager: slot allocation, alliances (~12 calls)
	killTracker: true, // [KILL TRACKER] kill counting, deny detection (~5 calls)
	victory: true, // victory conditions, team wins (~4 calls)
	drawManager: true, // [DrawManager] W3C draw vote tracking (1 call)
	gameMode: true, // [W3CMode] state transitions, capitals, promode (~30 calls)
	transport: true, // Transport patrol, unload events (~8 calls)
	spawner: true, // unit spawning (~3 calls)
	events: true, // unit death bare messages (most triggers import-only)
	city: true, // guard swap logic (~5 calls)
	player: true, // player state changes (3 calls)
	unitLag: true, // UnitLagManager: unit lag diagnostics (2 calls)
	minimap: true, // MinimapIconManager: icon lifecycle (~18 calls)
	winTracker: true, // match history (1 call)
	distribution: true, // initial territory distribution (1 call)
	// quests: currently import-only, no active calls
};
```

---

## Subsystem Breakdown

### 1. Rating Sync (`ratingSync`)

| Detail          | Value                                            |
| --------------- | ------------------------------------------------ |
| **Prefix**      | `[RATING SYNC]`                                  |
| **Files**       | `src/app/rating/rating-sync-manager.ts`          |
| **Call sites**  | ~68+                                             |
| **Noise level** | **Very High** — fires on every P2P sync exchange |

Covers the entire P2P rating synchronization pipeline: sync start/complete markers, per-player data exchange, merge conflicts, retry logic, and completion summaries.

**Example messages:**

- `[RATING SYNC] ========== SYNC START ==========`
- `[RATING SYNC] SyncRequest COMPLETED for ${playerBtag}`
- `[RATING SYNC] P2P sync succeeded with ${totalPlayersReceived} total entries`

**When to enable:** Debugging rating desync issues, verifying P2P data exchange.

---

### 2. Rating Manager (`ratingManager`)

| Detail          | Value                                    |
| --------------- | ---------------------------------------- |
| **Prefix**      | `[RatingManager]`                        |
| **Files**       | `src/app/rating/rating-manager.ts`       |
| **Call sites**  | ~18+                                     |
| **Noise level** | **Medium** — fires on load/save/finalize |

Handles rating file I/O, checksum validation, pending game finalization, and player filtering.

**Example messages:**

- `[RatingManager] loadPlayerRating: Checksum OK for ${btag}, rating=${data.player.rating}`
- `[RatingManager] Filter: ${btag} excluded - player left the game`

**When to enable:** Debugging rating file corruption, checksum mismatches, ELO persistence.

---

### 3. Slot Count (`slotCount`)

| Detail          | Value                                                                                                                                                                                                                                                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prefix**      | `[SharedSlots]`                                                                                                                                                                                                                                                                                                                                                                      |
| **Files**       | `src/app/game/services/client-manager.ts`, `src/app/spawner/spawner.ts`, `src/app/triggers/unit-trained-event.ts`, `src/app/city/components/guard.ts`, `src/app/game/game-mode/base-game-mode/game-loop-state.ts`, `src/app/game/services/distribution-service/standard-distribution-service.ts`, `src/app/game/game-mode/capital-game-mode/capitals-distribute-capitals-state.ts` |
| **Call sites**  | ~20+                                                                                                                                                                                                                                                                                                                                                                               |
| **Noise level** | **High** — fires on every unit spawn/death/train                                                                                                                                                                                                                                                                                                                                   |

Tracks per-slot unit counts. Logs increments, decrements, and turn summaries.

**Example messages:**

- `[SharedSlots] Increment slot ${slot}: ${oldCount} → ${newCount}`
- `[SharedSlots] Spawned unit for player ${playerId} on slot ${owningSlot}`
- `[SharedSlots] === Turn ${turn} Slot Summary ===`

**When to enable:** Debugging unit count drift, slot allocation bugs, or the unit lag system.

---

### 4. Redistribute (`redistribute`)

| Detail          | Value                                                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prefix**      | `[Redistribute]`                                                                                                                                         |
| **Files**       | `src/app/game/services/client-manager.ts`, `src/app/game/game-mode/base-game-mode/game-loop-state.ts`, `src/app/triggers/unit_death/unit-death-event.ts` |
| **Call sites**  | ~25+                                                                                                                                                     |
| **Noise level** | **Medium** — fires on player leave/elimination                                                                                                           |

Logs the slot redistribution algorithm: freed slots, donor/receiver assignments, and trigger reasons.

**Example messages:**

- `[Redistribute] === Running evaluateAndRedistribute() ===`
- `[Redistribute] Freed slot ${slot} from eliminated player ${elimPlayer}`
- `[Redistribute] Donor ${donor}: donating slot ${slot}`
- `[Redistribute] Triggered by: player left (${playerName})`

**When to enable:** Debugging slot imbalance after player leaves, client redistribution logic.

---

### 5. Neutralize (`neutralize`)

| Detail          | Value                                            |
| --------------- | ------------------------------------------------ |
| **Prefix**      | `[Neutralize]`                                   |
| **Files**       | `src/app/game/services/client-manager.ts`        |
| **Call sites**  | ~8+                                              |
| **Noise level** | **Low** — fires only when a player leaves in FFA |

Logs conversion of player units to NEUTRAL_HOSTILE, city resets, and slot cleanup.

**Example messages:**

- `[Neutralize] Neutralizing all units for player ${playerId}`
- `[Neutralize] Transferred unit ${unitName} from slot ${slot} to NEUTRAL_HOSTILE`
- `[Neutralize] Complete. All slots should now have 0 units.`

**When to enable:** Debugging leaver unit handling in FFA mode.

---

### 6. Kill Tracker (`killTracker`)

| Detail          | Value                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------ |
| **Prefix**      | `[KILL TRACKER]`, `[TRACKER]`                                                              |
| **Files**       | `src/app/managers/unit-kill-tracker.ts`, `src/app/triggers/unit_death/unit-death-event.ts` |
| **Call sites**  | ~5                                                                                         |
| **Noise level** | **Low** — mostly edge case logging                                                         |

Tracks kill attribution, deny detection, and name update skipping.

**Example messages:**

- `[KILL TRACKER] Skipping deny - unit killed its own unit`
- `[KILL TRACKER] Skipping name update - killing unit is a building`
- `[TRACKER] Killing unit is null, returning 0`

**When to enable:** Debugging incorrect kill counts or kill attribution.

---

### 7. Victory (`victory`)

| Detail          | Value                                 |
| --------------- | ------------------------------------- |
| **Prefix**      | _(none — uses bare messages)_         |
| **Files**       | `src/app/managers/victory-manager.ts` |
| **Call sites**  | ~6                                    |
| **Noise level** | **Low** — fires near game end         |

Victory condition checks, team win tracking.

**Example messages:**

- `No opponents remain!`
- `${displayName} has met the city count victory condition!`
- `Adding win for team ${teamNumber}`

**When to enable:** Debugging victory detection, premature/missed wins.

---

### 8. Draw Manager (`drawManager`)

| Detail          | Value                                  |
| --------------- | -------------------------------------- |
| **Prefix**      | `[DrawManager]`                        |
| **Files**       | `src/app/managers/w3c-draw-manager.ts` |
| **Call sites**  | ~1                                     |
| **Noise level** | **Very Low**                           |

W3C draw vote handling.

**Example messages:**

- `[DrawManager] Player already voted for draw.`

**When to enable:** Debugging draw vote issues in W3C mode.

---

### 9. Game Mode (`gameMode`)

| Detail          | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prefix**      | `[W3CMode]`, plus bare numbered steps and state names                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Files**       | `src/app/game/game-mode/mode/w3c-mode.ts`, `src/app/game/game-mode/mode/base-mode.ts`, `src/app/game/game-mode/base-game-mode/reset-state.ts`, `src/app/game/game-mode/base-game-mode/game-loop-state.ts`, `src/app/game/game-mode/capital-game-mode/*.ts` (4 files), `src/app/game/game-mode/promode-game-mode/promode-game-loop-state.ts`, `src/app/game/game-mode/w3c-mode/w3c-game-over-state.ts`, `src/app/game/game-mode/utillity/remove-units.ts` |
| **Call sites**  | ~30+                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Noise level** | **Medium** — fires on state transitions and phase changes                                                                                                                                                                                                                                                                                                                                                                                                |

State machine transitions, player leave/forfeit handling, capitals selection/distribution phases, promode elimination tracking, fog phase cycling, game mode initialization.

**Example messages:**

- `[W3CMode] onPlayerLeft`
- `[W3CMode] onEnterState`
- `1. Capitals Selection` / `2. Capitals Selection` (numbered phase steps)
- `Distributing Capitals`
- `Player ${name} has chosen a capital in ${country}`
- `Restarting ${gameMode}, state length: ${length}`
- `Phase is dusk (0), turning on fog`
- `Setting status of ${name} to DEAD due to city count.`
- `Removing units for player ${name} index ${i}`

**When to enable:** Debugging game mode state transitions, incorrect state progression, capitals mode issues.

---

### 10. Transport (`transport`)

| Detail          | Value                                          |
| --------------- | ---------------------------------------------- |
| **Prefix**      | `Transport Patrol`, `Unit Unloaded`            |
| **Files**       | `src/app/managers/transport-manager.ts`        |
| **Call sites**  | ~8                                             |
| **Noise level** | **Medium** — fires on every boat patrol/unload |

Boat patrol casting, validation, and unload events.

**Example messages:**

- `Transport Patrol Casted`
- `Transport Patrol Valid`
- `Transport Patrol Already Enabled - Stopping Previous Patrol`
- `Transport Patrol Starting`
- `Patrol Origin: (${x}, ${y})`
- `Registering Patrol Timed Event`
- `Unit Unloaded Event Triggered for unit: ${unitName}`

**When to enable:** Debugging boat transport pathfinding, unit unloading issues.

---

### 11. Events (`events`)

| Detail          | Value                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prefix**      | _(bare messages)_                                                                                                                                              |
| **Files**       | `src/app/triggers/unit_death/unit-death-event.ts` (active calls), `src/app/triggers/unit-trained-event.ts` (active — [SharedSlots] prefix, counted in slotCount) |
| **Call sites**  | ~1 unique to this category (unit death bare message)                                                                                                           |
| **Noise level** | **High** — fires on every unit death                                                                                                                           |

Raw game event logging. Most trigger files (`unit-damaged-event.ts`, `unit-issue-order-event.ts`, `unit-upgrade-event.ts`, `spell-effect-event.ts`, `city-selected-event.ts`, `ownership-change-event.ts`) currently **import-only** with no active calls — ready for future instrumentation.

**Example messages:**

- `Unit Death Event Triggered for ${unitName} killed by ${killingUnit}`

**When to enable:** Debugging event handler firing, event ordering issues.

> **Note:** The event trigger files are prime candidates for adding new `debugPrint` calls. The imports are already in place.

---

### 12. City (`city`)

| Detail          | Value                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| **Prefix**      | _(bare messages about swap logic)_                                                                      |
| **Files**       | `src/app/city/land-city.ts` (4 calls), `src/app/city/components/guard.ts` (1 call — [SharedSlots] prefix) |
| **Call sites**  | ~5                                                                                                      |
| **Noise level** | **Low** — fires on guard swap attempts                                                                  |

City guard swap logic: capital checks, same-owner checks, enemy team checks, allied capital checks.

**Example messages:**

- `Not a capital then swap`
- `If same owner then swap`
- `If enemy team then don't swap`
- `You can not swap the guard of an allied capital!`

**When to enable:** Debugging city capture, guard swap rules.

---

### 13. Spawner (`spawner`)

| Detail          | Value                              |
| --------------- | ---------------------------------- |
| **Prefix**      | _(overlaps with [SharedSlots])_      |
| **Files**       | `src/app/spawner/spawner.ts`       |
| **Call sites**  | ~3+                                |
| **Noise level** | **High** — fires every spawn cycle |

Unit spawning logic, slot assignment for new units.

**When to enable:** Debugging spawn failures, incorrect unit placement.

---

### 14. Unit Lag (`unitLag`)

| Detail          | Value                                         |
| --------------- | --------------------------------------------- |
| **Prefix**      | `UnitLagManager:`                             |
| **Files**       | `src/app/game/services/unit-lag-manager.ts`   |
| **Call sites**  | 2 active + 1 commented                        |
| **Noise level** | **Medium** — fires per tracked/untracked unit |

Unit lag diagnostics via minimap icon tracking.

**Example messages:**

- `UnitLagManager: Tracking ${unitName} via MinimapIconManager.`
- `UnitLagManager: Untracking ${unitName}.`

**When to enable:** Investigating lag spikes related to unit count.

---

### 15. Player (`player`)

| Detail          | Value                                        |
| --------------- | -------------------------------------------- |
| **Prefix**      | _(bare messages)_                            |
| **Files**       | `src/app/player/player-manager.ts` (3 calls) |
| **Call sites**  | 3                                            |
| **Noise level** | **Low**                                      |

Player state changes, leave/join tracking, client allocation candidates.

**Example messages:**

- `Player ${id} added to left players list for potential client allocation.`
- `Player ${id} not added to left players list (has units or cities).`

**When to enable:** Debugging player state management.

---

### 16. Distribution (`distribution`)

| Detail          | Value                                                                         |
| --------------- | ----------------------------------------------------------------------------- |
| **Prefix**      | `[SharedSlots]` (guard distribution)                                            |
| **Files**       | `src/app/game/services/distribution-service/standard-distribution-service.ts` |
| **Call sites**  | 1                                                                             |
| **Noise level** | **Very Low** — fires once per player at game start                            |

Initial territory distribution. The single call uses `[SharedSlots]` prefix for guard distribution tracking.

**Example messages:**

- `[SharedSlots] Guard distributed to player ${id}, incrementing count`

**When to enable:** Debugging uneven territory distribution, start-of-game allocation.

---

### 17. Minimap (`minimap`)

| Detail          | Value                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| **Prefix**      | `MinimapIconManager:`                                                    |
| **Files**       | `src/app/managers/minimap-icon-manager.ts`                               |
| **Call sites**  | ~18                                                                      |
| **Noise level** | **Medium** — fires on init, icon creation, pool expansion, unit tracking |

Minimap icon lifecycle: initialization, world bounds calculation, city icon creation, frame pool management, unit tracking, capital borders, error handling.

**Example messages:**

- `MinimapIconManager: Initialized for terrain: ${MAP_TYPE}`
- `MinimapIconManager: Creating icons for ${count} cities`
- `MinimapIconManager: Expanded pool by ${count}. Total size: ${total}`
- `MinimapIconManager: Pool exhausted, expanding by 200`
- `MinimapIconManager: Count of tracked units: ${count}, Pool size: ${poolSize}`
- `MinimapIconManager: Adding double-ring border for capital city`

**When to enable:** Debugging missing/incorrect minimap icons, pool exhaustion, capital borders.

---

### 18. Quests (`quests`)

| Detail          | Value                      |
| --------------- | -------------------------- |
| **Prefix**      | _(none)_                   |
| **Files**       | `src/app/quests/quests.ts` |
| **Call sites**  | 0 (import-only)            |
| **Noise level** | **None** — no active calls |

Import is in place but no active `debugPrint` calls. Ready for future instrumentation.

**When to enable:** N/A currently — placeholder for quest board debugging.

---

### 19. Win Tracker (`winTracker`)

| Detail          | Value                                  |
| --------------- | -------------------------------------- |
| **Prefix**      | _(bare, passes 'WinTracker' as arg)_   |
| **Files**       | `src/app/game/services/win-tracker.ts` |
| **Call sites**  | 1                                      |
| **Noise level** | **Very Low**                           |

Match history, played match counts.

**Example messages:**

- `Played matches: ${playedMatchCount}`

**When to enable:** Debugging W3C match tracking.

---

## Noise Ranking (high → low)

| Category        | Noise     | Call sites | Why                                          |
| --------------- | --------- | ---------- | -------------------------------------------- |
| `ratingSync`    | Very High | ~68        | Fires on every P2P sync exchange             |
| `slotCount`     | High      | ~20        | Fires on every unit spawn/death              |
| `gameMode`      | Medium    | ~30        | State transitions, capitals phases, fog      |
| `redistribute`  | Medium    | ~25        | Player leave/elimination                     |
| `clientManager` | Medium    | ~12        | Slot allocation, alliance management         |
| `minimap`       | Medium    | ~18        | Init, icon creation, pool, unit tracking     |
| `ratingManager` | Medium    | ~25        | Load/save/finalize                           |
| `transport`     | Medium    | ~8         | Boat events                                  |
| `unitLag`       | Medium    | 2          | Per tracked/untracked unit                   |
| `events`        | Low-Med   | ~1         | Most trigger files are import-only currently |
| `neutralize`    | Low       | ~8         | Only on player leave (FFA)                   |
| `killTracker`   | Low       | ~5         | Edge cases only                              |
| `victory`       | Low       | ~4         | Near game end                                |
| `city`          | Low       | ~5         | Guard swap attempts                          |
| `player`        | Low       | 3          | State changes                                |
| `spawner`       | Low       | ~3         | Overlaps slotCount                           |
| `winTracker`    | Very Low  | 1          | End-of-game                                  |
| `distribution`  | Very Low  | 1          | Game start only                              |
| `drawManager`   | Very Low  | 1          | 1 call site                                  |
| `quests`        | None      | 0          | Import-only, no active calls                 |

---

## Suggested Default Profiles

### `all-off` — Production

Everything disabled. No debug output.

### `minimal` — General development

Enable: `victory`, `gameMode`, `redistribute`, `neutralize`

### `rating-debug` — Rating system issues

Enable: `ratingSync`, `ratingManager`

### `unit-debug` — Unit count / lag investigation

Enable: `slotCount`, `redistribute`, `spawner`, `unitLag`, `killTracker`

### `event-debug` — Event pipeline investigation

Enable: `events`, `city`, `transport`

### `all-on` — Full firehose

Everything enabled. Pair with `SAVE_DEBUG_LOGS_TO_FILE = true` since console will be unreadable.

---

## Import-Only Files (no active calls)

These files import `debugPrint` but have **zero active calls**. The imports are in place for future instrumentation:

| File                                                  | Potential category                |
| ----------------------------------------------------- | --------------------------------- |
| `src/main.ts`                                         | `gameMode` (entry point)          |
| `src/app/triggers/spell-effect-event.ts`              | `events`                          |
| `src/app/triggers/ownership-change-event.ts`          | `events` / `city`                 |
| `src/app/triggers/city-selected-event.ts`             | `events` / `city`                 |
| `src/app/triggers/unit-upgrade-event.ts`              | `events`                          |
| `src/app/triggers/unit-issue-order-event.ts`          | `events`                          |
| `src/app/triggers/unit_death/unit-damaged-event.ts`   | `events`                          |
| `src/app/triggers/unit_death/handle-guard-death.ts`   | `city` (has 1 commented-out call) |
| `src/app/quests/quests.ts`                            | `quests`                          |
| `src/app/game/game-mode/utillity/on-player-status.ts` | `player` / `gameMode`             |
