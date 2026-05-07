# Minimap & Shared Slots Performance Analysis

## Overview

This document outlines the performance review of the unit lag/shared slots mechanic when it interacts with the custom minimap system. Under heavy loads, such as in 23-player FFAs when the player count hits 11, the `SharedSlotManager` activates and `UnitLagManager.trackUnit()` begins registering virtually every single unit into the `MinimapIconManager`'s `trackedUnits` map, causing significant FPS drops.

### 1. Current Complexity & Transpilation Cost

- **Time Complexity:** $O(U + C)$ where $U$ is the number of tracked units and $C$ is the number of cities.
- **Transpilation Cost:** The `updateAllIcons()` loop uses `.forEach()` callbacks on TypeScript `Map` objects (`this.trackedUnits.forEach(...)` and `this.cityIcons.forEach(...)`). In TSTL, this transpiles to a helper function like `__TS__MapForEach` which incurs a function-call overhead per element, and worse, allocates an anonymous closure in memory every 0.2 seconds. For thousands of shared-slot units, this creates aggressive Lua Garbage Collection (GC) spikes, dragging down FPS.

### 2. Bottlenecks

- **Per-Tick Closure Allocations:** The `.forEach` loops inside a 0.2s periodic timer generate persistent garbage collection spikes under high unit loads.
- **Redundant Loop Math:** The `updateIconPosition` method calculates static scaling factors (`hudScale`, `MINIMAP_WIDTH`, coordinate bounds, and UI center offsets) repeatedly for every unit on every tick.
- **Excessive Native API Wrapping:** Methods like `updateIconPosition` and `updateUnitIconColor` perform multiple function hops and `SharedSlotManager.getInstance()` lookups inside the hot inner loop.

### 3. Data Structure Optimization

The TypeScript `Map` object is sufficient (it transpiles cleanly to a Lua table wrapper), but the way it is interrogated matters heavily. TSTL iterators for `Map` (via `for...of`) are generally more performant and avoid per-tick closures compared to `.forEach(...)`.

### 4. Conditional Complexity Reduction

Most of the performance loss isn't from deep nesting, but from repeated property access and cross-method invocation. We can completely remove `updateIconPosition`'s hidden overhead by frontloading the coordinate transformation matrix (world-bounds math and HUD scalers) into scalar variables outside the hot loop.

### 5. Refactoring Proposal

**Improved TypeScript Code:**

```typescript
	private updateAllIcons(): void {
		const localPlayer = GetLocalPlayer();
		const effectiveLocal = isReplay() ? getReplayObservedPlayer() : localPlayer;

		// --- HOIST LOOP-INVARIANTS FOR PERFORMANCE ---
		const scaledWidth = 0.8 * this.hudScale;
		const uiLeftEdgeX = 0.4 - (scaledWidth / 2.0);
		const minimapBaseX = 0.009 * this.hudScale;
		const minimapBaseY = 0.004 * this.hudScale;

		const mmWidthScaled = this.MINIMAP_WIDTH * this.hudScale;
		const mmHeightScaled = this.MINIMAP_HEIGHT * this.hudScale;

		const baseXOffset = uiLeftEdgeX + minimapBaseX;

		// Pre-cache the shared slot manager instance lookup
		const sharedSlotMgr = SharedSlotManager.getInstance();

		// --- REPLACE .forEach WITH for...of TO AVOID CLOSURES ---
		for (const [city, iconFrame] of this.cityIcons) {
			const isVisible = IsUnitVisible(city.barrack.unit, effectiveLocal);
			this.updateIconColor(iconFrame, city, isVisible, effectiveLocal);
		}

		this.unitsToRemove.length = 0;

		for (const [unit, iconFrame] of this.trackedUnits) {
			// Check if unit is still valid and alive
			if (GetUnitTypeId(unit) === 0 || GetWidgetLife(unit) <= 0.405) {
				this.unitsToRemove.push(unit);
				BlzFrameSetVisible(iconFrame, false);
				continue;
			}

			// Check visibility
			if (IsUnitVisible(unit, effectiveLocal)) {
				// Inline position update to avoid method overhead and redundant math
				const worldX = GetUnitX(unit);
				const worldY = GetUnitY(unit);

				const normX = (worldX - this.worldMinX) / this.worldWidth;
				const normY = (worldY - this.worldMinY) / this.worldHeight;

				const iconX = baseXOffset + (normX * mmWidthScaled);
				const iconY = minimapBaseY + (normY * mmHeightScaled);

				BlzFrameSetAbsPoint(iconFrame, FRAMEPOINT_CENTER, iconX, iconY);

				// Update color using cached manager
				this.updateUnitIconColorOptimized(iconFrame, unit, effectiveLocal, sharedSlotMgr);
				BlzFrameSetVisible(iconFrame, true);
			} else {
				BlzFrameSetVisible(iconFrame, false);
			}
		}

		// Cleanup dead/removed units
		for (let i = 0; i < this.unitsToRemove.length; i++) {
			const unit = this.unitsToRemove[i];
			const frame = this.trackedUnits.get(unit);
			if (frame) {
				BlzFrameSetVisible(frame, false);
				this.trackedUnits.delete(unit);
				this.unitLastTexture.delete(unit);
				this.framePool.push(frame);
			}
		}
	}
```

**Expected Lua Output Comparison:**
TSTL transpiles `this.trackedUnits.forEach(callback)` into something that resembles `__TS__MapForEach(self.trackedUnits, function(...) ... end)`. Converting to a strict `for (const [unit, iconFrame] of this.trackedUnits)` compiles down to a far closer representation of a native Lua `for k, v in pairs(self.trackedUnits.entries) do`, dropping the anonymous function generation entirely.

### 6. Benchmark Plan (Warcraft III)

1. Use `os.clock()` within a debug print wrapper at the start and end of `updateAllIcons()`.
2. Load up the map locally and inject a debug command (e.g., `-testlag`) that loops and spawns 5,000 peasants assigned to a shared slot so they get picked up by `UnitLagManager.trackUnit()`.
3. Read the milliseconds delta printed by `os.clock()`. The refactored version should eliminate the escalating millisecond duration tick-over-tick caused by GC pauses.

### 7. Risk Assessment

- **Behavior Changes:** The functional positions and colors of the minimap icons remain mathematically equivalent, so no visual desyncs should occur.
- **Determinism:** Minimap icons are visually generated per-player based on local frames. Extracting loop variables is perfectly deterministic and safely maintains multiplayer state parity.
- **Unit Tests:** Unit tests validating the visual toggling and cleanup of minimap frame pools (`minimap-frame-pool-logic.test.ts` and `minimap-update-loop-logic.test.ts`) should continue to pass as the structural logic has not changed, only the runtime loop implementation syntax.
