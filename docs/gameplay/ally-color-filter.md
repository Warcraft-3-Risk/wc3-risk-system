# Ally Color Filter

## Motivation

Warcraft III natively supports an "Ally Color Mode" (toggled via `Alt+A` or the minimap button). It traditionally cycles between standard colors, minimap-only colors, and unit color overrides. However, our Risk system requires very specific color mapping logic (e.g., tracking the local player as blue, allies as teal, enemies as red, and neutral units as black) and robust color-blindness/high-contrast support. We also need to guarantee replay stability when observers watch POV VODs.

## Current Behavior

- We intercept the native WC3 ally mode state via a high-frequency polling loop (`startPolling()` in `AllyColorFilterManager`).
- When the native state indicates a toggle (`GetAllyColorFilterState() > 0`), we instantly zero it out using `SetAllyColorFilterState(0)`. This completely suppresses the native engine from executing its own destructive visual changes.
- We maintain our own state via `AllyColorState` that tracks the mode (0: Off, 1: Minimap Only, 2: High Contrast/On).
- Units incrementally receive color updates (`applyColorFilter`) applying specific vertex and primary colors based on their ownership relative to the local player.
- A separate `applyPlayerColorFilter` pass syncs physical raw owner slots with `SetPlayerColor` so WC3 health bars match the unit model color, especially for shared-slot units. Normal-mode fallback uses `NameManager.getOriginalColor(realOwner)` instead of the locally overridden engine color.
- The player camera-position minimap overlay uses the same minimap ally-color mapping, falling back to `NameManager.getOriginalColor(player)` in mode 0.
- Replays and observers are explicitly bypassed. `getMode()` utilizes `isReplay()` and `IsPlayerObserver()` to permanently lock these clients into `0` (Normal colors). This ensures watching replays never suffers from color-blindness or POV color-shifting.

## Constraints and Safety Rules

- **No Desync Risk**: The unit pass restricts itself to `SetUnitVertexColor` and `SetUnitColor`. The player-color pass uses plain `SetPlayerColor` separately from unit enumeration, so local ally-mode health-bar colors do not need the desync-prone BJ helper/group loop.
- **Performance / GC Optimization**: The TSTL polling loop uses ES6 `for...of` iteration over sets and maps rather than `.forEach`. This maps directly to native Lua `for k, v in pairs() do` iterations, preventing excessive closure allocation in hot paths.
- **Event Caching**: `GetLocalPlayer()` references and color/contrast settings checks are computed out-of-loop and housed in `updateCache()`. The update loop consumes zero CPU processing unless the color settings or `Alt+A` are explicitly triggered by the user.

## Source of Truth in Code

- **Manager (Logic & Loop)**: `src/app/managers/ally-color-filter-manager.ts`
- **State Definition**: `src/app/managers/alliances/ally-color-state.ts`
- **Testing**: `tests/game-simulation/ally-color-filter-manager.test.ts`
