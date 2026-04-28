# Ally Color Mode 2: Engine Limitation With Shared Slots

## Motivation

Players can toggle WC3 ally color filter modes with Alt+A. In this map, shared-slot ownership is used so many units that appear to belong to a player are actually owned by shared-slot handles.

When native mode 2 (High Contrast) is selected, the Warcraft 3 engine blindly applies colors based on the raw slot ownership:
- Local player units become blue
- Allies and shared-slot units become teal
- Enemies become red

This inherently breaks Shared Slot games, as shared-slot units are treated as "allies" by the engine mechanics, rather than being treated as the local player's own units. Furthermore, native UI tooltips often contain hardcoded embedded color codes (e.g., `|cff0042ff`) which supersede any UI/filter recoloring efforts.

## Current Behavior

Instead of blocking native Mode 2 entirely, the project intercepts its logic:
- The custom UI layer (like `TooltipManager` and `MinimapIconManager`) detects the mode toggle.
- We manually apply High Contrast colors via `SetUnitVertexColor` using `AllyColorFilterManager`, which safely resolves the *true* owner through the `SharedSlotManager`.
- Units belonging to the local player (or their shared slot) are colored Blue `(0, 0, 255)`. Null owners (`NEUTRAL_HOSTILE`) are tinted black.
- We support a custom `colorblind` preference which recolors allied units to Yellow (`255, 255, 0`) instead of Teal.
- In tooltips, embedded native Warcraft 3 hex color tags (e.g., `|cff...` or `|CFF...`) are strictly stripped before appending the new High Contrast hex code, to prevent the engine renderer from reverting the text color back to blue/red.

## Constraints and Safety Rules

- Treat native mode 2 as an engine limitation for this map's ruleset. The engine does not understand "Shared Slots".
- All new unit generation (Spawns, Training, Guard Changes) must be passed through `AllyColorFilterManager.getInstance().applyColorFilter(unit)`.
- When rendering custom names/tooltips, you must strip legacy W3 color tags using `ColorStringUtil.stripColorTags(text)` (because `|c` and `|C` can be followed by lowercase *or* uppercase hex digits) before prepending the `getTooltipColorHex()` prefix.

## Source of Truth in Code

- src/app/managers/ally-color-filter-manager.ts
- src/app/managers/tooltip-manager.ts
- src/app/managers/minimap-icon-manager.ts
- src/app/game/services/shared-slot-manager.ts
- src/app/utils/color-string-util.ts
