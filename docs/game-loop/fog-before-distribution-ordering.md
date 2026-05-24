# Fog-Before-Distribution State Ordering

## Motivation

In Warcraft III, units in fog of war are rendered with their last-known visual state, including player color. If fog is applied after cities are distributed to players, the local player briefly sees all enemy cities receive player colors during distribution. When fog then activates, WC3 caches that colored state — making every enemy city appear owned even though it should be hidden.

This is especially visible in promode, where fog of war is a core mechanic and cities are randomly assigned across countries. Initial ownership is now intentionally shown to every player during distribution, then normal fog memory takes over after setup.

## Current Behavior

All game modes apply `ApplyFogState` before any city distribution state:

- **StandardMode:** ApplyFogState → CityDistributeState → VisionState
- **PromodeMode:** ApplyFogState → CityDistributeState
- **EqualizedPromodeMode:** ApplyFogState → EqualizedCityDistributeState
- **W3CMode:** ApplyFogState → CityDistributeState
- **CapitalsMode:** ApplyFogState → CapitalsSelectionState → CapitalsDistributeCapitalsState → CapitalsDistributeState → VisionState

This ensures fog is active when `SetUnitOwner()` is called on guard and barracks units during distribution, so enemy city colors are never cached by the WC3 fog renderer.

During city distribution, each assigned city temporarily shares its barracks, circle of power, and guard vision with every match player. That reveals all starting cities as they are distributed and makes the old country-sharing reveal pass redundant.

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
- src/app/game/services/distribution-service/standard-distribution-service.ts
