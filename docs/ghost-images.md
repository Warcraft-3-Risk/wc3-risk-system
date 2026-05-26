# Ghost Images and Minimap Leaks

## Motivation

In Warcraft III, when a building is covered by the Fog of War, the engine creates a local "memory" of that building for the player. Internally, this is handled by a class known as `CGhostImage`. This document explains the engine-level bugs associated with this system and the workaround used in this project to prevent information leaks and UI overlaps on our custom minimap.

## Terminology

- **Native minimap ghost leak**: The engine bug where a fogged building's `CGhostImage` still draws or recolors a native minimap blip after ownership changes.
- **Fog-safe ownership transfer**: A capturable building may change real WC3 ownership while hidden in fog, but that transfer must not reveal new intel through native minimap ghosts, color filters, or custom minimap UI.
- **Minimap camouflage**: The implementation technique used to make ownership transfers fog-safe: hide native minimap display, blacken unseen buildings before/around ownership changes, restore the world model locally when visible, and draw custom minimap indicators only where we explicitly want them.

## The Bug

The `CGhostImage` system has two critical engine bugs:

1. **Ignores Minimap Display Flags**: It completely ignores the `UNIT_BF_HIDE_MINIMAP_DISPLAY` (`nbmm`) boolean field. Even if you explicitly tell a building _not_ to draw on the native minimap, the ghost image forces a default square blip to render anyway while in the fog.
2. **Instantly Leaks Ownership Changes**: If a building changes ownership (e.g., from `NEUTRAL_HOSTILE` to a Player) while hidden in the fog, the `CGhostImage` instantly updates the color of that minimap blip to the new owner's color. It does not wait for an enemy unit to actually gain vision of the building to update the intelligence.

## Impact on the Custom Minimap

Since we disable native minimap dots to draw our own custom minimap frames (allowing perfect control over what players see in the fog), this engine bug causes two major issues during city distribution:

- **Overlapping Icons**: The engine forces the native blip to appear right underneath our custom frame minimap UI.
- **Information Leaks**: The native blips update instantly through the fog, revealing exactly where every opponent's distributed cities are located.

## Fog-Safe Ownership Transfer

To bypass this limitation without breaking the game's state, we use minimap camouflage tied to vision:

1. During initialization (when fog is applied), we color the capturable structures (e.g., Barracks and Circle of Power) completely black `(0, 0, 0, 255)` using `SetUnitVertexColor`.
2. Because the `CGhostImage` natively takes on the vertex color of the building at the moment ownership changes in the fog, the ghost image minimap pixel also renders completely black, effectively hiding it within the fog of war.
3. When the city is distributed, the _new owner_ locally restores the normal white vertex color `(255, 255, 255, 255)` so they see their own building correctly.
4. For all other players, the building remains visually black in the fog.
5. An update loop checks `IsUnitVisible`. The exact moment a player's vision reveals the building from the fog, we use `SetUnitVertexColor` locally for that witnessing player to restore the proper building color.

This ensures that while the `CGhostImage` still technically caches a building ownership blip on the minimap, the blip is rendered completely black and thus invisible against the fog to the players, preventing intel leaks and custom minimap overlap.

## Campfire Spawners

Campfire spawners (`UNIT_ID.SPAWNER`, `h004`) are buildings with the same ownership/fog problem as cities, but with a stricter display rule: they should not appear on either the native minimap or the custom minimap.

The fix mirrors cities instead of splitting gameplay ownership from WC3 ownership:

1. During the same fog-enabled initialization window as `City.HideMinimap()`, `Spawner.HideMinimap()` marks the campfire native minimap display as hidden, temporarily resets the unit to `NEUTRAL_HOSTILE`, disables extended line of sight, and colors the campfire black.
2. `Spawner.setOwner()` still transfers real WC3 ownership with `SetUnitOwner(...)` when the country is captured.
3. The spawner is refreshed through the minimap update loop without creating a custom minimap frame. If the campfire is visible to the local player, its world model is restored to white; if it is hidden in fog, it is kept black so any native building ghost remains invisible.

This keeps the spawner owned like a city while preventing both default and custom minimap indicators for campfires.

## Constraints and Safety Rules

- Do not rely on `UNIT_BF_HIDE_MINIMAP_DISPLAY` to hide buildings in the fog of war if their ownership is going to change.
- When adding new capturable structure types, ensure their native minimap footprints are managed via the same vision-based local vertex coloring application if they are distributed in the fog.
- Campfire spawners should keep real WC3 ownership. Do not replace spawner ownership with a code-only owner cache just to avoid minimap ghosts.
- Ally-color refreshes must not call the normal unit color filter on never-seen fogged city structures. Repaint barracks, circles of power, and city guards when `IsUnitVisible(..., GetLocalPlayer())` is true, or when the city has already been recorded as seen. Fogged seen-city repaints must use the last seen owner, not the hidden current owner, otherwise captures in fog leak through color changes.

## Source of Truth in Code

- `src/main.ts` (Applies the initial black camouflage during fog setup)
- `src/app/city/city.ts` (Contains the initial coloring logic)
- `src/app/spawner/spawner.ts` (Applies the same ownership-preserving minimap camouflage to campfires)
- `src/app/game/services/distribution-service/standard-distribution-service.ts` (Restores color locally for the city's new owner)
- `src/app/managers/minimap-icon-manager.ts` (Runs the `IsUnitVisible` loop that seamlessly pops the correct color back in locally when an opponent finally explores the city, and refreshes campfire camouflage without creating campfire custom minimap icons)
