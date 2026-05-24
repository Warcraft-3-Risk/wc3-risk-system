# Minimap HUD Scaling and Custom Icons

## Motivation

Warcraft III Reforged introduced a **HUD Scale** slider in the video options. This allows players to shrink the standard user interface (`ConsoleUIBackdrop`) to free up screen real estate.

However, custom UI components—specifically our custom Minimap Icons for cities and units that use absolute screen positioning (`BlzFrameSetAbsPoint`)—do not automatically scale with the native HUD. Therefore, if we anchor icons blindly to the bottom-left coordinate (`0.0, 0.0`), shrinking the HUD scale causes the custom icons to visually detach from the Minimap and float over the 3D game world.

This document explains our mathematical approach for dynamically tracking and scaling absolute-positioned custom Minimap Icons so they remain perfectly pinned to the standard Minimap at any HUD Scale.

## Current Behavior

To align our simpleframes to the scaled Minimap, we track the player's scaling dynamically:

1. **Detecting Scale:** We measure the width of `ConsoleUIBackdrop`. By default (100% scale), its width is `0.80` (representing the classic 4:3 aspect ratio area). Dividing the current width by `0.80` yields our `hudScale` multiplier.
2. **Applying the Multiplier:** Every Minimap coordinate offset and frame dimension used in `updateIconPosition` is multiplied by `hudScale`. This effectively compresses the spatial distribution of the icons, making them fit precisely inside the minimized bounds of the newly scaled map.
3. **Horizontal Translation Shift:** The default UI console in Warcraft 3 shrinks towards the **center** of the screen (`X = 0.4`), not toward the left edge. Therefore, as the console scales down, its left boundary physically moves away from `X = 0.0`. We calculate the new starting left edge dynamically `uiLeftEdgeX = 0.4 - (uiWidthScaled / 2.0)`, and add it to our absolute `iconX` calculations. This shifts the customized icon cluster rightwards to follow the minimap.
4. **Vertical Clamping:** The UI console scales by anchoring to the screen's absolute bottom, so the base `Y = 0.0` coordinate requires no vertical shift—only multiplicative scaling.

When a change in HUD scale is detected via the polling timer, `repositionAllStaticIcons()` is fired to instantly snap all static city and map border frames to their updated screen coordinates.

## Constraints and Safety Rules

- **Do not calculate `BlzFrameGetWidth` every tick:** Polling frame width dynamically adds overhead. We calculate it on a slower (e.g., `0.1s`) timer (`allyModeTimer` handles this dual-purpose checking) and cache it as `this.hudScale`. Fast-moving unit updates use the cached multiplier.
- **Do not use fixed `X/Y` absolute constants:** Always construct positions relative to the `uiLeftEdgeX` offset and multiply sizes by `this.hudScale`, or your frames will leak onto the terrain at lower HUD settings.
- **Relative anchoring alternatives:** While parent-child `SetPoint` linking is often preferable for UI, we utilize `SetAbsPoint` coupled with scale math here due to needing absolute mapping of world coordinate vectors over a precise bounding box without the child layout engine distorting the margins.

## Source of Truth in Code

- UI scaling math and coordinate logic: `src/app/managers/minimap-icon-manager.ts` (Specifically `updateIconPosition()`, `repositionAllStaticIcons()`, and the constructor's scale checking timer).
