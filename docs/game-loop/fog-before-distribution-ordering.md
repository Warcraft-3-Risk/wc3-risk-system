# Fog-Before-Distribution State Ordering

## Motivation

In Warcraft III, units in fog of war are rendered with their last-known visual state, including player color. If fog is applied after cities are distributed to players, the local player briefly sees all enemy cities receive player colors during distribution. When fog then activates, WC3 caches that colored state — making every enemy city appear owned even though it should be hidden.

This is especially visible in promode, where fog of war is a core mechanic and cities are randomly assigned across countries. Players should only see enemy city colors in countries they share, not everywhere.

## Current Behavior

All game modes apply `ApplyFogState` before any city distribution state:

- **StandardMode:** ApplyFogState → CityDistributeState → VisionState
- **PromodeMode:** ApplyFogState → CityDistributeState → SetPromodeTempVisionState
- **EqualizedPromodeMode:** ApplyFogState → EqualizedCityDistributeState → SetPromodeTempVisionState
- **W3CMode:** ApplyFogState → CityDistributeState → SetPromodeTempVisionState
- **CapitalsMode:** ApplyFogState → CapitalsSelectionState → CapitalsDistributeCapitalsState → CapitalsDistributeState → VisionState

This ensures fog is active when `SetUnitOwner()` is called on guard and barracks units during distribution, so enemy city colors are never cached by the WC3 fog renderer.

In promode-based modes, `SetPromodeTempVisionState` then selectively shares vision of cities in shared countries for 4 seconds, which is the only time enemy city colors should be visible.

## Constraints and Safety Rules

- `ApplyFogState` must always precede any city distribution state in the mode's state list.
- If a new mode is added that distributes cities, it must follow this ordering.
- WC3 fog rendering caches last-known unit owner/color — there is no API to clear this cache.

## Source of Truth in Code

- src/app/game/game-mode/mode/promode-mode.ts
- src/app/game/game-mode/mode/equalized-promode-mode.ts
- src/app/game/game-mode/mode/w3c-mode.ts
- src/app/game/game-mode/mode/standard-mode.ts
- src/app/game/game-mode/mode/capitals-mode.ts
- src/app/game/game-mode/base-game-mode/apply-fog-state.ts
- src/app/game/game-mode/promode-game-mode/set-promode-temp-vision-state.ts
