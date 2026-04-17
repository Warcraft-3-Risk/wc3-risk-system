# Ally Color Mode 2: Engine Limitation With Shared Slots

## Motivation

Players can toggle WC3 ally color filter modes with Alt+A. In this map, shared-slot ownership is used so many units that appear to belong to a player are actually owned by shared-slot handles.

When native mode 2 is selected, unit colors briefly move toward the expected ally/enemy view, but then settle into WC3 native defaults:

- local player units become blue
- allies and shared-slot units become teal
- enemies become red

This is not the intended presentation for this project because shared-slot units are supposed to be treated as the local player's units for gameplay readability.

## Current Behavior

The project intentionally blocks native AllyColorFilterState mode 2.

- A periodic timer checks GetAllyColorFilterState and forces mode 2 back to mode 0.
- Icon color update logic also guards against mode 2 and resets it to mode 0.
- Supported visual behavior remains mode 0 and mode 1 style rendering through project icon logic.

This preserves shared-slot ownership readability and avoids misleading ally teal coloring on shared-slot units.

## Constraints and Safety Rules

- Treat native mode 2 as an engine limitation for this map ruleset.
- Do not ship features that depend on native mode 2 preserving custom shared-slot semantics.
- Do not rely on local SetPlayerColor or SetUnitColor override loops as a fix for this specific issue.
- Keep shared-slot ownership resolution through SharedSlotManager helpers when determining icon colors.
- Keep replay and observer logic consistent with existing effective local player handling.

## Source of Truth in Code

- src/app/managers/minimap-icon-manager.ts
- src/app/game/services/shared-slot-manager.ts
- src/app/utils/game-status.ts
