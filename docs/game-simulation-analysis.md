# Game Simulation Analysis: FFA and Promode 1v1

## Overview

This document analyzes what aspects of the WC3 Risk game can be simulated in a pure-logic
test environment (no WC3 runtime), focusing on FFA (Standard mode) and Promode 1v1 flows.

## Architecture Summary

The game follows a **state machine** pattern with these key components:

| Component | File | Role |
|---|---|---|
| `ModeSelection` | `mode-selection.ts` | Handles settings UI, emits `EVENT_SET_GAME_MODE` |
| `EventCoordinator` | `event-coordinator.ts` | Routes events to current mode/state, selects mode class |
| `BaseMode<T>` | `base-mode.ts` | Manages ordered state list, advances via `nextState()` |
| `BaseState<T>` | `base-state.ts` | Per-state logic + player event handlers |
| `GlobalGameData` | `global-game-state.ts` | Static singleton holding match state, turn count, players |
| `SettingsContext` | `settings-context.ts` | Game settings (Promode, Fog, Diplomacy, etc.) |
| `EventEmitter` | `event-emitter.ts` | Pub/sub event bus connecting all components |

## Game Modes and Their State Sequences

### StandardMode (FFA)
Settings: `Promode=0`, `GameType=0`, `Diplomacy.option=0`

| # | State | WC3 Dependencies |
|---|---|---|
| 1 | `UpdatePlayerStatusState` | `GetPlayerSlotState`, `SetPlayerState` |
| 2 | `SetupState` | Scoreboard UI, `EnableSelect` |
| 3 | `ApplyFogState` | `FogManager`, `Wait.forSeconds` |
| 4 | `CityDistributeState` | Distribution service, unit placement |
| 5 | `VisionState` | Fog strategy |
| 6 | `CountdownState` | Timer, frame UI |
| 7 | `EnableControlsState` | `EnableSelect`, `EnableDragSelect` |
| 8 | `GameLoopState` | Timer-driven game loop, victory checks |
| 9 | `GameOverState` | Scoreboard, statistics |
| 10 | `ResetState` | Country/unit reset, `Wait.forSeconds` |

### PromodeMode (1v1)
Settings: `Promode=1`, `GameType=0`

| # | State | WC3 Dependencies |
|---|---|---|
| 1 | `UpdatePlayerStatusState` | `GetPlayerSlotState`, `SetPlayerState` |
| 2 | `SetupState` | Scoreboard UI, `EnableSelect` |
| 3 | `ApplyFogState` | `FogManager`, `Wait.forSeconds` |
| 4 | `CityDistributeState` | Distribution service, unit placement |
| 5 | `SetPromodeTempVisionState` | Fog + city vision reveal |
| 6 | `PromodeCountdownState` | Timer, frame UI |
| 7 | `EnableControlsState` | `EnableSelect`, `EnableDragSelect` |
| 8 | `ProModeGameLoopState` | Timer loop + city-count auto-loss |
| 9 | `GameOverState` | Victory scoring, statistics |
| 10 | `ResetState` | Country/unit reset |

## What Can Be Simulated (Pure Logic)

### ✅ Fully Simulatable

1. **Mode Selection Routing** — `EventCoordinator.applyGameMode()` logic:
   - Settings → which mode class is instantiated
   - `GameType='Capitals'` → `CapitalsMode`
   - `W3C_MODE_ENABLED` → `W3CMode`
   - `Promode=2` → `EqualizedPromodeMode`
   - `Promode=1` → `PromodeMode`
   - Default → `StandardMode`

2. **State Sequence Ordering** — Each mode's `setupStates()` returns a deterministic list.

3. **State Machine Transitions** — `BaseMode.nextState()` shifts states and calls
   `onEnterState()`. When states are exhausted, it re-emits `EVENT_SET_GAME_MODE`
   (restart cycle).

4. **Match State Lifecycle** — `GlobalGameData.matchState` transitions:
   `modeSelection` → `preMatch` → `inProgress` → `postMatch`

5. **Event Routing** — `EventCoordinator.registerEvents()` wires player events
   (alive, dead, left, forfeit, restart) to the current state's handler.

6. **Player Event Handling** — Each state handles `onPlayerDead`, `onPlayerLeft`,
   `onPlayerForfeit`, `onPlayerRestart` differently.

7. **Game Over Logic** — `GameOverState.onPlayerRestart` blocks restart in FFA,
   allows it in Promode.

8. **W3C Termination** — `W3CMode.wrapState()` checks if only 1 human player
   remains and triggers victory.

9. **Equalized Promode Round Tracking** — Round numbering, winner storage,
   automatic Round 2 start, and position swapping.

10. **Restart Cycle** — When all states are consumed, `BaseMode.nextState()` emits
    `EVENT_SET_GAME_MODE` to restart the mode from scratch.

### ❌ Cannot Simulate (WC3 Runtime Required)

1. **Unit placement and combat** — Requires WC3 unit handles
2. **City/Country management** — Requires map data and WC3 objects
3. **Timer-driven game loop** — `CreateTimer`/`TimerStart` are WC3 natives
4. **UI frames** — Scoreboard, countdown display, settings popup
5. **Fog of war** — WC3 fog system
6. **Player slot state** — `GetPlayerSlotState` is a WC3 native
7. **Income distribution** — Tied to city ownership
8. **Replay recording** — WC3 file I/O

## Approach: Extract Pure Logic Module

To make the game flow testable, we extract a **pure logic module** (`game-simulation-logic.ts`)
that mirrors the production code's decision-making without WC3 dependencies:

- State name sequences for each mode
- Mode selection routing logic
- Match state transitions
- Player event handling rules per state
- Restart/termination conditions
- W3C early termination logic
- Equalized promode round management

This module uses the same patterns and names as production code but operates on
plain TypeScript data structures instead of WC3 singletons.

## Test Coverage Plan

| Category | Tests |
|---|---|
| Mode selection routing | 5 modes × settings combinations |
| State sequences | 5 modes verified against production |
| State transitions | Full lifecycle per mode |
| Match state lifecycle | 4 transitions verified |
| Player events | Dead, left, forfeit, restart per relevant state |
| FFA restrictions | Restart blocked in GameOverState |
| Promode restart | Allowed in GameOverState |
| W3C termination | Early exit when <2 humans |
| Equalized promode rounds | Round tracking, auto-restart, winner determination |
| Full FFA simulation | Start → play → game over → restart blocked |
| Full Promode 1v1 simulation | Start → play → game over → restart → new match |
