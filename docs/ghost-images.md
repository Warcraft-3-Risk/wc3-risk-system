# Ghost Images and Minimap Leaks

## Motivation

In Warcraft III, when a building is covered by the Fog of War, the engine creates a local "memory" of that building for the player. Internally, this is handled by a class known as `CGhostImage`. This document explains the engine-level bugs associated with this system and the workaround used in this project to prevent information leaks and UI overlaps on our custom minimap.

## The Bug

The `CGhostImage` system has two critical engine bugs:

1. **Ignores Minimap Display Flags**: It completely ignores the `UNIT_BF_HIDE_MINIMAP_DISPLAY` (`nbmm`) boolean field. Even if you explicitly tell a building _not_ to draw on the native minimap, the ghost image forces a default square blip to render anyway while in the fog.
2. **Instantly Leaks Ownership Changes**: If a building changes ownership (e.g., from `NEUTRAL_HOSTILE` to a Player) while hidden in the fog, the `CGhostImage` instantly updates the color of that minimap blip to the new owner's color. It does not wait for an enemy unit to actual gain vision of the building to update the intelligence.

## Impact on the Custom Minimap

Since we disable native minimap dots to draw our own custom minimap frames (allowing perfect control over what players see in the fog), this engine bug causes two major issues during city distribution:

- **Overlapping Icons**: The engine forces the native blip to appear right underneath our custom frame minimap UI.
- **Information Leaks**: The native blips update instantly through the fog, revealing exactly where every opponent's distributed cities are located.

## Current Behavior (The Workaround)

To bypass this limitation without breaking the game's state, we use a vertex coloring trick tied to vision:

1. During initialization (when fog is applied), we color the capturable structures (e.g., Barracks and Circle of Power) completely black `(0, 0, 0, 255)` using `SetUnitVertexColor`.
2. Because the `CGhostImage` natively takes on the vertex color of the building at the moment ownership changes in the fog, the ghost image minimap pixel also renders completely black, effectively hiding it within the fog of war.
3. When the city is distributed, the _new owner_ locally restores the normal white vertex color `(255, 255, 255, 255)` so they see their own building correctly.
4. For all other players, the building remains visually black in the fog.
5. An update loop checks `IsUnitVisible`. The exact moment a player's vision reveals the building from the fog, we use `SetUnitVertexColor` locally for that witnessing player to restore the proper building color.

This ensures that while the `CGhostImage` still technically caches a building ownership blip on the minimap, the blip is rendered completely black and thus invisible against the fog to the players, preventing intel leaks and custom minimap overlap.

## Constraints and Safety Rules

- Do not rely on `UNIT_BF_HIDE_MINIMAP_DISPLAY` to hide buildings in the fog of war if their ownership is going to change.
- When adding new capturable structure types, ensure their native minimap footprints are managed via the same vision-based local vertex coloring application if they are distributed in the fog.

## Source of Truth in Code

- `src/main.ts` (Applies the initial black camouflage during fog setup)
- `src/app/city/city.ts` (Contains the initial coloring logic)
- `src/app/game/services/distribution-service/standard-distribution-service.ts` (Restores color locally for the city's new owner)
- `src/app/managers/minimap-icon-manager.ts` (Runs the `IsUnitVisible` loop that seamlessly pops the correct color back in locally when an opponent finally explores the city)
