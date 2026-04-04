# Replay Minimap FOW Fix

## Overview

Custom minimap icons (managed by `MinimapIconManager`) were showing all units on the minimap during replay — even those behind the observed player's fog of war.

## Root Cause

`IsUnitVisible(unit, localPlayer)` was using `GetLocalPlayer()` for visibility checks. In a replay, `GetLocalPlayer()` always returns the **recording player**, not the player whose POV the viewer is watching. Since the recording player has `ALLIANCE_SHARED_VISION` with allies, all allied units appeared visible regardless of the observed player's actual fog state.

## Fix

All `IsUnitVisible` calls in `MinimapIconManager` now use `effectiveLocal`:

```typescript
const effectiveLocal = isReplay() ? getReplayObservedPlayer() : localPlayer;
```

### Call Sites Fixed

- `updateAllIcons()` — city visibility check
- `updateAllIcons()` — unit visibility check
- `registerTrackedUnit()` — initial registration visibility
- `addCapitalBorder()` — capital icon color/visibility

The coloring functions (`updateIconColor`, `updateUnitIconColor`) already received `effectiveLocal` correctly — only the visibility gating was wrong.

## File Changed

- `src/app/managers/minimap-icon-manager.ts`
