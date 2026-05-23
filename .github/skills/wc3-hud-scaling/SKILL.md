---
name: wc3-hud-scaling
description: 'Handle Reforged HUD scaling issues for absolute positioned UI frames. Use when custom frames (like minimap blips or command card overlays) become misaligned when a player changes their HUD Scale slider in settings.'
---

# Handling Reforged HUD Scaling with Absolute Frame Positions

## The Problem

When a player lowers their **HUD Scale** slider in the Warcraft III Video Options, the default user interface (`ConsoleUIBackdrop`) shrinks to free up screen space.

If you are using `BlzFrameSetAbsPoint` to position custom UI elements (like custom minimap blips, command card overlays, or inventory slots) over the default UI, your frames will detach and float awkwardly when the player changes their HUD scale. This is because absolute points are fixed to the monitor's screen coordinates, while the default native UI is physically moving.

## How the WC3 UI Scales

To make `BlzFrameSetAbsPoint` follow the scaling UI, you need to understand two rules about how Reforged scales the console:

1. **Horizontally Centered:** The UI shrinks towards the center of the screen (`X = 0.4`). As it scales down, the left edge physically pulls away from `0.0` and slides rightward.
2. **Bottom Anchored:** The UI is anchored to the bottom of the screen (`Y = 0.0`). It shrinks downwards, but the bottom edge never leaves the floor.

## The Mathematical Solution

Instead of explicitly hardcoding absolute coordinates like `X = 0.01` and `Y = 0.01`, you multiply them by the player's current HUD Scale, and shift the `X` coordinate by the console's horizontal movement.

### The Algorithm (Lua Example)

```lua
-- 1. Grab the primary UI backdrop
local consoleUI = BlzGetFrameByName("ConsoleUIBackdrop", 0)
local consoleWidth = BlzFrameGetWidth(consoleUI)

-- 2. Calculate the Scale Multiplier
-- At 100% scale, the default UI has a width of 0.8
local hudScale = consoleWidth / 0.8

-- 3. Calculate the Left Edge Offset
-- Because the UI scales toward the center (X = 0.4), the left edge pushes inwards
local uiCenterX = 0.4
local uiLeftEdgeX = uiCenterX - (consoleWidth / 2.0)

-- 4. Apply to your Custom Frames
-- Example: We want an icon to sit exactly at X=0.01, Y=0.01 relative to the minimap corner
local originalOffsetX = 0.01
local originalOffsetY = 0.01

-- Multiply original distances/sizes by the scale
local scaledOffsetX = originalOffsetX * hudScale
local scaledOffsetY = originalOffsetY * hudScale

-- Offset X by the sliding left edge. Y needs no offset because the console naturally rests at Y=0
local finalX = uiLeftEdgeX + scaledOffsetX
local finalY = 0.0 + scaledOffsetY

BlzFrameSetAbsPoint(myCustomFrame, FRAMEPOINT_BOTTOMLEFT, finalX, finalY)
BlzFrameSetSize(myCustomFrame, originalWidth * hudScale, originalHeight * hudScale)
```

### Best Practices for Optimization

1. **Do not calculate `BlzFrameGetWidth` every tick:** Polling frame width dynamically adds overhead. We calculate it on a slower (e.g., `0.1s` - `0.25s`) timer and cache it. Fast-moving unit updates should use the cached multiplier.
2. **Do not use fixed `X/Y` absolute constants:** Always construct positions relative to the `uiLeftEdgeX` offset and multiply sizes by `hudScale`.
3. **If a change is detected in HUD Scale:** Loop through your static UI frames and immediately reposition them using the newly cached variables.
