# Ally Color Mode 2: Engine Limitation With Shared Slots

## Motivation

Warcraft 3 allows players to toggle ally color filter modes natively with Alt+A. However, in this map, shared-slot ownership is extensively utilized, meaning many units that appear to belong to a player are actually owned by neutral 'shared-slot' handles.

When native mode 2 (High Contrast) is activated by the engine, it blindly applies colors based on raw slot ownership:
- Local player units become Blue
- Allies and shared-slot units become Teal
- Enemies become Red

This inherently breaks Shared Slot mechanics, as shared-slot units are incorrectly treated as 'allies' by the engine rather than as the player's own units. Furthermore, native UI tooltips containing hardcoded color codes bypass native UI recoloring efforts.

## Current Behavior

To resolve this limitation, the map completely disables the native Mode 2 engine feature and implements a custom robust High Contrast option:
- A custom UI button in the top left (F3) allows the player to toggle **High Contrast Mode**, which is saved to their local preferences.
- A fast polling loop inside MinimapIconManager continuously checks and resets the native engine's SetAllyColorFilterState(0) to automatically suppress the effects if the player presses Alt+A.
- The custom High Contrast mode is applied manually through SetUnitColor (3D Models), SetUnitVertexColor (Tinting), and Minimap blip updates via the AllyColorFilterManager.
- True ownership is correctly resolved through the SharedSlotManager so shared units behave visually like local player units.
- Null owners (NEUTRAL_HOSTILE) are tinted completely black.
- A custom 'colorblind' option replaces the teal allied color with yellow.
- Embedded native Warcraft 3 hex color tags in custom names/tooltips are stripped before appending the new High Contrast hex code to prevent the engine renderer from reverting text colors.

## Constraints and Safety Rules

- Attempting to use the native Alt+A Mode 2 is actively combated by the map. We treat the visual effect of it as a complete breakage of Shared Slots.
- All new unit generation (Spawns, Training, Guard Changes) MUST be passed through AllyColorFilterManager.getInstance().applyColorFilter(unit).
- Using SetUnitColor directly outside of AllyColorFilterManager is restricted.
- When rendering custom names/tooltips, strictly strip legacy W3 color tags using ColorStringUtil.stripColorTags(text) before prepending the calculated string prefix.

## Source of Truth in Code

- src/app/managers/ally-color-filter-manager.ts
- src/app/managers/minimap-icon-manager.ts
- src/app/game/services/shared-slot-manager.ts
- src/app/utils/color-string-util.ts
