# Custom Minimap Icons

## Motivation

Warcraft III Reforged provides two built-in minimap icon sizes: a small dot for units and a larger
square for buildings. In Risk, cities are barracks units — but their minimap icons must be clearly
larger than ordinary units, distinctly colored by owner, and sensitive to fog-of-war. Neither native
WC3 size fits that design.

The solution is to suppress the native WC3 minimap display for every city and player unit we care
about, then overlay custom `BACKDROP` SimpleFrames directly on top of the minimap widget. Those
frames are sized, positioned, and textured by game code every 0.2 seconds, giving us full control
over icon appearance independent of WC3 engine constraints.

The custom icon system is only activated for the `"world"` terrain type (or when
`FORCE_CUSTOM_MINIMAP_ICONS` is set). Other terrains fall back to native WC3 minimap rendering.

---

## Overview Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        WC3 UI Canvas                             │
│                                                                  │
│  ┌──────────────┐                                                │
│  │  ConsoleUI   │  ← width polled every 0.1 s to detect         │
│  │  Backdrop    │    HUD scale changes                           │
│  │              │                                                │
│  │ ┌──────────┐ │                                                │
│  │ │ Minimap  │ │  ← ORIGIN_FRAME_MINIMAP (parent for frames)   │
│  │ │  Widget  │ │                                                │
│  │ │ ┌──┐┌──┐ │ │  ← Custom BACKDROP frames positioned by       │
│  │ │ │  ││  │ │ │    BlzFrameSetAbsPoint() using world→screen    │
│  │ │ └──┘└──┘ │ │    coordinate math                             │
│  │ └──────────┘ │                                                │
│  └──────────────┘                                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## Setup Flow

Called once at game start (or after `-ng` reset via `reinitialize()`).

```
initialize(cities)
  │
  ├─ for each City
  │    ├─ BlzSetUnitBooleanField(barrack, HIDE_MINIMAP_DISPLAY, true)
  │    ├─ BlzSetUnitBooleanField(cop,     HIDE_MINIMAP_DISPLAY, true)
  │    ├─ BlzCreateFrameByType('BACKDROP', 'MinimapCityIcon', minimapParent)
  │    ├─ BlzFrameSetSize(frame, BUILDING_ICON_SIZE × scale)
  │    ├─ BlzFrameSetLevel(frame, 10)
  │    ├─ updateIconPosition(frame, city.x, city.y)   ← world → screen math
  │    └─ updateIconColor(frame, city, isVisible, localPlayer)
  │
  ├─ startUpdateTimer()   ← 0.2 s repeating timer → updateAllIcons()
  │
  └─ expandPool(INITIAL_POOL_SIZE = 2000)
       └─ creates recycled BACKDROP frames for moving units
```

**Capital cities** receive additional decoration later via `addCapitalBorder()`:

```
addCapitalBorder(city)
  ├─ create outerBorderFrame  size=CAPITAL_BORDER_OUTER  level=11  texture=white
  ├─ create innerBorderFrame  size=CAPITAL_BORDER_INNER  level=12  texture=black
  └─ resize cityIcon          size=CAPITAL_ICON_SIZE     level=13  (sits on top)
```

Stacking order (bottom → top): `minimap bg → outer border (11) → inner border (12) → city dot (13)`

---

## World → Screen Coordinate Math

Every icon position is computed from first principles each time `updateIconPosition()` is called.

```
-- 1. Normalize world coords to [0, 1]
normX = (worldX - worldMinX) / worldWidth
normY = (worldY - worldMinY) / worldHeight

-- 2. Account for HUD Scale (console shrinks toward screen center X=0.4)
uiLeftEdgeX = 0.4 - (0.8 × hudScale) / 2.0

-- 3. Small fixed offsets align icons with the minimap inset inside the console
baseX = uiLeftEdgeX  +  0.009 × hudScale
baseY =                  0.004 × hudScale   (console anchors to screen bottom, no Y shift)

-- 4. Final absolute screen position
iconX = baseX + normX × (MINIMAP_WIDTH  × hudScale)   -- MINIMAP_WIDTH  = 0.14
iconY = baseY + normY × (MINIMAP_HEIGHT × hudScale)   -- MINIMAP_HEIGHT = 0.14

BlzFrameSetAbsPoint(frame, FRAMEPOINT_CENTER, iconX, iconY)
```

`hudScale` is cached and recomputed only when the `ConsoleUIBackdrop` width changes (polled at 0.1 s).
When a change is detected, `repositionAllStaticIcons()` snaps every city and border frame immediately.

For the hot update loop the pre-computed scalars are hoisted outside the per-unit loop to avoid
redundant arithmetic on every frame every tick.

---

## Per-Tick Update Loop (every 0.2 s)

```
updateAllIcons()
  │
  ├─ Resolve effectiveLocal  (= observed player in replay, GetLocalPlayer() otherwise)
  ├─ Read allyColorMode, isColorBlind, isColorContrast, isDeadInFFA, ownershipRevision
  │
  ├─ [Global dirty check]
  │    If any global context changed (color mode, POV player, ownership revision…)
  │    → poison all trackedRawOwnerList entries to force a color re-read next pass
  │
  ├─ [City icons — all updated every tick]
  │    for each CityIconRecord
  │      isVisible = IsUnitVisible(city.barrack.unit, effectiveLocal)
  │      if record state differs from last tick  (dirty check)
  │        → updateCityIconColorFast(...)
  │        → update record cache fields
  │
  └─ [Moving unit icons — throttled: UNITS_PER_TICK = 200 per tick]
       Resume from currentUnitUpdateIndex (ring buffer)
       for up to 200 units
         if unit dead → hide frame, return to pool, remove from list
         if visible   → update position inline, update color if rawOwner changed
         else         → hide frame
```

The throttled ring buffer means the full unit list is refreshed across multiple ticks, keeping each
0.2 s callback lightweight regardless of total unit count.

---

## Frame Pool

Moving-unit icons are created up-front in a pool to avoid per-unit frame allocation at runtime.

```
framePool  ←  pre-created BACKDROP frames (initially 2000)

registerTrackedUnit(unit)
  ├─ UNIT_BF_HIDE_MINIMAP_DISPLAY = true  (suppress native dot)
  ├─ iconFrame = framePool.pop()           (or expandPool(200) if empty)
  └─ add to trackedList

unregisterTrackedUnit(unit) / unit dies
  ├─ BlzFrameSetVisible(frame, false)
  └─ framePool.push(frame)                 (recycle for next unit)
```

Guard units are intentionally **not** tracked — they already have city icons.

---

## Ally Color Mode and the Minimap

`AllyColorState` (in `src/app/managers/alliances/ally-color-state.ts`) governs a three-mode cycle
toggled by `Alt+A`:

| Mode | Description | Minimap icon color |
|------|-------------|-------------------|
| **0** | Player colors (default) | Each player's unique WC3 player color |
| **1** | Minimap colors only | Blue (self) / Teal (ally) / Red (enemy) |
| **2** | High-contrast / Color Contrast | Same as mode 1, also recolors unit models |

The `colorContrast` player option forces mode 2 regardless of the toggle state.

### Color Resolution Decision Tree

```
resolveIconColor(owner, effectiveLocal, allyColorMode, isColorBlind, isDeadInFFA)
  │
  ├─ owner === effectiveLocal?
  │    └─ WHITE (texture index 99)
  │
  ├─ allyColorMode > 0?  (modes 1 or 2)
  │    ├─ owner is neutral (id ≥ 24)?
  │    │    └─ GRAY (texture index 90)
  │    │
  │    ├─ ally?
  │    │    ├─ isDeadInFFA? → RED  (dead player's shared units look like enemies)
  │    │    └─ isColorBlind? → YELLOW  else  TEAL
  │    │
  │    └─ enemy? → RED  (texture index 0)
  │
  └─ mode 0 (player colors)
       └─ NameManager.getOriginalColor(owner) → TeamColor[colorIndex].blp
            (uses original pre-game color to survive slot reassignment)
```

Cities in fog of war that have **never** been seen show as GRAY. Cities seen before entering fog
show the **last-seen owner's** color.

### Colorblind Support

When a player enables the colorblind option, the ally color becomes **Yellow** instead of Teal
(modes 1 and 2). This applies to both minimap icon textures and — in mode 2 — unit vertex colors.

### Replay and Observer Safety

`AllyColorState.getMode()` returns `0` unconditionally for replay viewers and observers. This
prevents POV-dependent color shifts when watching a recorded game from a neutral perspective.
`effectiveLocal` is resolved through `getReplayObservedPlayer()` so that fog-of-war visibility
follows the observed player's state, not the client's.

---

## Unit Model Colors (Mode 2 / `AllyColorFilterManager`)

In addition to minimap textures, **mode 2** also applies `SetUnitVertexColor` to unit models in the
3D world. `AllyColorFilterManager` manages this:

- A polling timer suppresses the native WC3 ally color toggle (`GetAllyColorFilterState`) and
  replaces it with our own logic.
- `applyColorFilter(unit)` is called when a unit becomes visible on a city, is trained, unloaded,
  or changes ownership.
- The cache (`updateCache()`) pre-computes RGB values per player once per mode change rather than
  on every unit update.

---

## Pseudocode Summary

### Setting up one city icon

```lua
-- Called once per city at game initialization
function createCityIcon(city)
    -- Suppress the native WC3 minimap dot
    BlzSetUnitBooleanField(city.barrack, HIDE_MINIMAP_DISPLAY, true)
    BlzSetUnitBooleanField(city.cop,     HIDE_MINIMAP_DISPLAY, true)

    -- Create a colored square on the minimap
    frame = BlzCreateFrameByType("BACKDROP", "MinimapCityIcon", minimapParent)
    BlzFrameSetSize(frame, BUILDING_ICON_SIZE, BUILDING_ICON_SIZE)
    BlzFrameSetLevel(frame, 10)

    -- Place it at the correct screen position
    updateIconPosition(frame, city.x, city.y)

    -- Color it based on current owner
    updateIconColor(frame, city, isVisible, localPlayer)
    BlzFrameSetVisible(frame, true)
end
```

### Coloring an icon (simplified)

```lua
function resolveIconTexture(owner, selfPlayer, mode, colorBlind, deadInFFA)
    if owner == selfPlayer then
        return TEXTURE_WHITE          -- always white for the local player

    elseif mode > 0 then              -- ally color modes 1 and 2
        if isNeutral(owner) then
            return TEXTURE_GRAY
        elseif isAlly(owner, selfPlayer) then
            if deadInFFA then return TEXTURE_RED end
            return colorBlind and TEXTURE_YELLOW or TEXTURE_TEAL
        else
            return TEXTURE_RED        -- enemy
        end

    else                              -- mode 0: individual player colors
        colorIndex = getOriginalColorIndex(owner)
        return TEXTURE_TEAMCOLOR[colorIndex]
    end
end
```

### Per-tick update (simplified)

```lua
-- Runs every 0.2 seconds
function updateAllIcons()
    effectiveLocal = isReplay() and getReplayObservedPlayer() or GetLocalPlayer()

    -- City icons: update every city if anything relevant changed
    for each cityRecord in cityRecords do
        if cityRecord.isDirty(effectiveLocal, allyColorMode, ...) then
            texture = resolveIconTexture(city.getOwner(), effectiveLocal, ...)
            setTextureCached(cityRecord.frame, texture)
        end
    end

    -- Moving units: process up to 200 per tick (ring buffer)
    for i = 0 to min(200, trackedUnits.length) do
        unit = trackedUnits[currentIndex]

        if isDead(unit) then
            hideFrame(unit.frame)
            returnToPool(unit.frame)
        elseif isVisible(unit, effectiveLocal) then
            updatePosition(unit.frame, unit.x, unit.y)
            if unit.rawOwner changed then
                updateUnitColor(unit.frame, unit, effectiveLocal, allyColorMode)
            end
            showFrame(unit.frame)
        else
            hideFrame(unit.frame)
        end

        currentIndex = (currentIndex + 1) % trackedUnits.length
    end
end
```

---

## Constraints and Safety Rules

- **Do not call `BlzFrameGetWidth` every tick.** HUD scale is polled on a separate 0.1 s timer and
  cached as `hudScale`. All fast-path loops consume only the cached value.
- **Always use `setTextureCached`.** `BlzFrameSetTexture` is expensive; the cache skips the call
  when the texture has not changed.
- **Dirty-check before every color update.** City records store the last-applied state; an update
  is only issued when at least one input changed.
- **Poison the raw-owner cache on global state changes.** When ally color mode, POV player, or
  ownership revision changes, all `trackedRawOwnerList` entries are set to an invalid sentinel so
  every unit's color is recomputed over the next few ticks.
- **Frame pool must always be returned.** Any path that hides a unit frame must push it back to
  `framePool`. Leaking frames exhausts the pool and requires runtime expansion.
- **Replay safety.** Never gate `effectiveLocal` on `GetLocalPlayer()` alone. Always resolve
  through `isReplay() ? getReplayObservedPlayer() : GetLocalPlayer()`. Ally color mode is forcibly
  `0` in replay to prevent color-shifted POVs.
- **No static `X/Y` constants.** All positions must be derived from `uiLeftEdgeX` and multiplied
  by `hudScale` or icons will detach from the minimap at lower HUD scale settings.
- **Terrain guard.** The entire system bails early (`isActive = false`) on non-world terrain maps.
  This is set once in the constructor and never changes.

---

## Constraints on the Range Indicator

Each `City` owns a special effect (`city.effect`) that renders a range-indicator ring on the ground
at the city's coordinates. This effect is created in the `City` constructor:

```typescript
this._effect = AddSpecialEffect('war3mapImported\\TargetIndicatorThinner_TC_100.mdx', x, y);
BlzSetSpecialEffectAlpha(this._effect, 0);   // hidden by default
```

`ObserverRangeIndicator` (observer-only button) toggles the alpha of every city's effect between
`0` (hidden) and `25` (faint overlay), giving observers a visual sense of city placement density.
Regular players never see this button or the effect.

---

## Source of Truth in Code

| Concern | File |
|---------|------|
| Core icon management (setup, update loop, color logic) | `src/app/managers/minimap-icon-manager.ts` |
| Ally color state machine (modes 0/1/2, toggle, color resolution) | `src/app/managers/alliances/ally-color-state.ts` |
| Unit model vertex color application (mode 2 tinting) | `src/app/managers/ally-color-filter-manager.ts` |
| HUD scale math explanation | `docs/minimap-hud-scaling.md` |
| Replay POV and fog-of-war minimap behavior | `docs/replay/replay-minimap-fow-fix.md` |
| Ally color filter system (mode intercept, polling) | `docs/gameplay/ally-color-filter.md` |
| Observer range indicator toggle button | `src/app/triggers/visuals/observer-range-indicator.ts` |
| City range effect field | `src/app/city/city.ts` (`City._effect`) |
| Ally color mode unit tests | `tests/ally-color-mode-logic.test.ts` |
| Minimap color integration tests | `tests/game-simulation/minimap-icon-manager-color.test.ts` |
| Ally color filter integration tests | `tests/game-simulation/ally-color-filter-manager.test.ts` |
