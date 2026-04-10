# Spike: Custom Minimap Icon Performance Analysis

## Objective

Identify every area in the custom minimap icon system where frames, timers, or native calls could accumulate and degrade FPS over the course of a long game — particularly when thousands of units are trained and killed within 5-minute intervals.

---

## System Overview

The custom minimap replaces WC3's native unit/city icons with manually-managed `BACKDROP` frames positioned over the minimap. Two parallel systems exist:

| System | Purpose | Frame count |
|--------|---------|-------------|
| **City icons** | Static positions, color tracks ownership | ~200 (world map) + up to 2 border frames per capital |
| **Unit icons** | Moving positions, color tracks owner | 0–1000+ at any time (fluctuates with spawns/deaths) |

**Primary file:** `src/app/managers/minimap-icon-manager.ts` (717 lines)

---

## Area 1: Frame Pool — Unbounded Growth

### How it works

- **Startup:** `expandPool(2000)` pre-creates 2,000 invisible `BACKDROP` frames (line 133)
- **When pool exhausts:** `registerTrackedUnit()` calls `expandPool(200)` synchronously (lines 229–232)
- **When unit dies/unloads:** frame returned to pool via `this.framePool.push(frame)` (lines 201, 419)

### Concern: Pool never shrinks

Once frames are created, they exist for the lifetime of the game. The pool can only grow:

```
Start:          2,000 frames
Peak combat:    2,200 frames (1 expansion)
After combat:   2,200 frames (200 idle in pool)
Next peak:      2,400 frames (another expansion)
```

Over a long game with repeated combat spikes, the pool monotonically increases. Each expansion batch of 200 frames calls `BlzCreateFrameByType` 200 times synchronously — this is a **lag spike** during gameplay.

### Quantification

| Scenario | Frames created | Pool at end |
|----------|---------------|-------------|
| Startup (200 cities, 0 units) | 2,000 + 200 city frames | 2,200 |
| Mid-game steady state (~400 units) | 2,200 | 1,800 idle |
| Late-game spike (1,200 units) | 2,200 → needs expansion → 2,400 | 1,200 idle |
| Post-wipe (units killed, back to 200) | 2,400 | 2,200 idle |
| Next spike (1,400 units) | 2,400 → 2,600 | idle fluctuates |

**Key issue:** `expandPool()` runs in the **game thread** with no frame-spread. Creating 200 `BlzCreateFrameByType` calls in a tight loop causes a visible hitch.

### `destroy()` is the only cleanup

`BlzDestroyFrame` is only called in `destroy()` (lines 687–701), which runs on game reset (`-ng` command) or full reinitialization. During normal gameplay, **zero frames are ever destroyed**. This is by design (pooling), but means the high-water mark is permanent.

---

## Area 2: Update Loop — 10 Ticks/Second Over All Icons

### The 0.1s timer

`startUpdateTimer()` (line 360) creates a repeating 0.1s timer that calls `updateAllIcons()` every tick:

```typescript
TimerStart(this.updateTimer, 0.1, true, () => {
    this.updateAllIcons();
});
```

### Per-tick cost breakdown

**City icons** (lines 377–385):
Each city, every tick:
1. `IsUnitVisible(city.barrack.unit, localPlayer)` — fog check
2. `updateIconColor()` — calls `city.getOwner()`, `GetAllyColorFilterState()`, `IsPlayerAlly()`/`IsPlayerEnemy()`, `GetHandleId()`, and potentially `BlzFrameSetTexture()`

City positions are no longer updated per tick (comment at line 381 confirms they were removed). Color updates still run for all ~200 cities every tick via `updateIconColor()`.

**Unit icons** (lines 388–421):
Each tracked unit, every tick:
1. `GetUnitTypeId(unit)` — validity check
2. `GetWidgetLife(unit)` — death check (threshold 0.405)
3. `IsUnitVisible(unit, localPlayer)` — fog check
4. `GetUnitX(unit)` + `GetUnitY(unit)` — position read
5. `worldToMinimapCoords()` — math (division, subtraction)
6. `BlzFrameSetAbsPoint()` — native frame reposition
7. `updateUnitIconColor()` — calls `SharedSlotManager.getOwnerOfUnit()`, `GetAllyColorFilterState()`, alliance checks, `GetHandleId()`, and potentially `BlzFrameSetTexture()`

**Dead unit cleanup** (lines 412–421):
Dead units are collected into `unitsToRemove[]`, then cleaned up after iteration.

### Estimated native calls per tick

| Component | Count | Calls per element | Total calls/tick |
|-----------|-------|-------------------|-----------------|
| City color updates | 200 | ~5 (fog + owner + alliance + color) | ~1,000 |
| Unit position + color | 600 (avg late-game) | ~8 (validity + fog + pos×2 + reposition + color chain) | ~4,800 |
| Dead unit cleanup | ~10/tick avg | ~3 (frame hide + map delete + pool push) | ~30 |
| **Total per tick** | | | **~5,830** |
| **Total per second (×10)** | | | **~58,300** |

In late-game with 1,000+ tracked units:

| Component | Count | Total calls/tick | Per second |
|-----------|-------|-----------------|------------|
| Cities | 200 | ~1,000 | 10,000 |
| Units | 1,000 | ~8,000 | 80,000 |
| **Total** | | **~9,000** | **~90,000** |

### Texture caching mitigates some cost

`setTextureCached()` (line 567) skips `BlzFrameSetTexture()` when the texture hasn't changed. This eliminates redundant texture calls in steady state. However, every tick still runs the **decision logic** to determine what texture *should* be applied — this includes alliance checks and color lookups.

---

## Area 3: Ownership Redistribution — Untrack/Retrack Cascade

### How redistribution triggers minimap churn

`SharedSlotManager.redistributeExistingUnits()` (line 445) collects ALL movable units and spreads them evenly across slots. For each unit that changes owner:

```typescript
lagManager.untrackUnit(u);        // → MinimapIconManager.unregisterTrackedUnit()
SetUnitOwner(u, targetSlot, true); // WC3 native
lagManager.trackUnit(u);           // → MinimapIconManager.registerTrackedUnit()
```

Each untrack/retrack cycle:
- **Untrack:** hide frame, delete from `trackedUnits` Map, delete from `unitLastTexture` Map, push frame to pool, restore `UNIT_BF_HIDE_MINIMAP_DISPLAY`
- **Retrack:** pop frame from pool (or expand pool), set size, set level, store in `trackedUnits` Map, compute position, compute color, set texture, show frame

### Quantification

| Scenario | Units moved | Minimap operations |
|----------|------------|-------------------|
| Adding 1 slot to player with 2 balanced slots (10 each) | ~7 moves | 14 untrack + 14 retrack |
| Player eliminated (100 units redistributed) | ~50 moves | 100 untrack + 100 retrack |
| 23→11 player transition (220 units, 12 slots freed) | ~110 moves | 220 untrack + 220 retrack |

**Critical:** This runs synchronously in the game thread. 110 ownership changes with full untrack/retrack = **~440 frame operations + 110 `SetUnitOwner` natives** in a single frame. This is a **multi-second freeze** in worst case.

### When it fires

1. **Every turn start** — `gameLoopState.onStartTurn()` calls `evaluateAndRedistribute()` (line 171)
2. **On unit death** — if dying unit's slot reaches 0 units and is pending free (line 48)
3. **No debouncing** — if 5 slots free simultaneously, 5 redistributions can cascade

---

## Area 4: Capital Border Frames — Created But Never Individually Removed

### How borders work

When a city becomes a capital, `addCapitalBorder()` (line 579) creates **2 new frames**:
- Outer border: `BlzCreateFrameByType('BACKDROP', 'MinimapCapitalOuterBorder', ...)` (line 597)
- Inner border: `BlzCreateFrameByType('BACKDROP', 'MinimapCapitalInnerBorder', ...)` (line 619)

### Concern: No `removeCapitalBorder()`

There is no method to remove a capital border when a city **loses** capital status. The border frames are created and stored in `cityBorders` and `cityOuterBorders` Maps, but only cleaned up in `destroy()`.

If a city gains capital → loses capital → gains capital:
- First gain: 2 frames created, stored
- Loss: no frames removed (guard check at line 585 prevents re-creation, but old frames stay visible)
- Regain: check `cityBorders.has(city)` returns true → skips → old frames remain

This means borders persist correctly for the current game, but if a city could repeatedly gain/lose capital status without game reset, frames would accumulate. In practice, `setCapital()` is called once per city (in `land-city.ts:130`), so this is **low severity** unless game mechanics change.

### Scale

- Maximum capitals per game: varies (typically 5–12)
- Border frames: 2 per capital = 10–24 additional frames
- **Impact: negligible** compared to the unit frame pool

---

## Area 5: Transport Delayed Track Queue

### The 0.1s drain timer

`TransportManager` maintains a `delayedTrackQueue` (line 62) — units queued for re-tracking after unloading from transports. A persistent 0.1s timer drains this queue:

```typescript
TimerStart(TransportManager.delayedTrackTimer, 0.1, true, () => this.processDelayedTrackQueue());
```

### Processing logic (lines 156–167)

Each tick, the queue is drained:
1. For each unit: check `UnitAlive`, `IsUnitType(GUARD)`, `IsUnitLoaded`
2. If valid: call `UnitLagManager.trackUnit()` AND `MinimapIconManager.registerIfValid()`
3. Clear the queue

### Concern: Double-registration

`processDelayedTrackQueue()` calls both:
- `UnitLagManager.trackUnit(unit)` → which internally calls `MinimapIconManager.registerTrackedUnit(unit)` (line 53 of unit-lag-manager.ts)
- `MinimapIconManager.registerIfValid(unit)` → which calls `registerTrackedUnit(unit)` if not already tracked (line 185)

The second call is guarded by `this.trackedUnits.has(unit)` (line 184), so it's a no-op. But the first call via `UnitLagManager.trackUnit()` does NOT have this guard — it checks for guard type and shared slot ownership, then unconditionally calls `registerTrackedUnit()`.

`registerTrackedUnit()` itself does NOT check if the unit is already tracked — it pops a frame from the pool and stores it in `trackedUnits`, **overwriting** any existing entry. If a unit is already tracked, this **leaks the old frame** (it's never returned to the pool).

### When this could happen

1. Unit unloads from transport → added to delayed queue
2. Before queue processes (within 0.1s), the same unit is tracked by another code path (e.g., `spawner.ts` line 97, or `guard.release()` line 80)
3. Queue processes → `trackUnit()` called again → new frame allocated, old frame leaked

### Severity: MEDIUM

Each occurrence leaks one frame handle. Over thousands of transport load/unload cycles, this could accumulate. The pool compensates by expanding, masking the leak.

---

## Area 6: Timers — Overlapping Periodic Callbacks

### Active repeating timers during gameplay

| Timer | Interval | Owner | Purpose |
|-------|----------|-------|---------|
| `MinimapIconManager.updateTimer` | 0.1s | MinimapIconManager | Update all city + unit icons |
| `MinimapIconManager.allyModeTimer` | 0.5s | Constructor (no ref stored) | Correct ally color mode 2→0 |
| `TransportManager.delayedTrackTimer` | 0.1s | Static field | Drain unload track queue |
| `TransportManager.autoLoadTimer` | 1.0s | Instance field | Auto-load range check |
| `TooltipManager.hoverTimer` | 0.04s | Constructor (no ref stored) | Tooltip position update |
| `_matchLoopTimer` | varies | game-loop-state | Game turn progression |
| `DebugPrint.autoSaveTimer` | configurable | DebugPrint | Auto-save debug log |

### Concern: `allyModeTimer` not stored, not destroyable

The ally color mode correction timer (line 101) is created in the constructor but stored only as a local variable — it cannot be destroyed on game reset. The `destroy()` method only destroys `this.updateTimer`. On `reinitialize()`, a new `allyModeTimer` is NOT created (since the constructor doesn't re-run), but the old one persists.

This is not a leak per se (only one timer per game lifetime), but it's a design concern — it runs for the entire game even if custom minimap icons are disabled mid-game.

### Concern: `TooltipManager.hoverTimer` at 25 ticks/second

The tooltip hover timer runs at 0.04s (25 Hz) — the fastest repeating timer in the system. Each tick calls `World2Screen()` and `BlzFrameSetAbsPoint()` when a unit is focused. This is unrelated to minimap icons but contributes to overall frame budget.

---

## Area 7: Other Frame Creators — Static Allocation

These systems create frames at initialization, not during gameplay:

| System | Frames created | When | Pooled/Destroyed? |
|--------|---------------|------|-------------------|
| `console.ts` | ~6 (mapInfo, message frames) | Game start | No (static) |
| `guard-button-factory.ts` | 4 per guard button | City creation | No (static) |
| `settings-view.ts` | ~5 (backdrop, buttons, timer) | Game start | No (static) |
| `rating-stats-ui.ts` | ~80+ (leaderboard rows) | Game start | No (static) |
| `ranked-statistics-view.ts` | ~60+ (stat columns/rows) | Game start | No (static) |
| `unranked-statistics-view.ts` | ~60+ (stat columns/rows) | Game start | No (static) |
| `chat-ui-manager.ts` | 1 (chat box) | Game start | No (static) |

**These are not a concern** — they allocate once at startup and remain for the game lifetime. No growth over time.

---

## Summary: Problem Areas Ranked by Severity

### 🔴 CRITICAL

| # | Problem | Impact | Location |
|---|---------|--------|----------|
| 1 | **Update loop processes all units every 0.1s** | ~90,000 native calls/sec with 1,000 units | `updateAllIcons()` L373–421 |
| 2 | **Redistribution untrack/retrack cascade** | 440+ frame ops in one frame during slot changes | `redistributeExistingUnits()` L445–516 |
| 3 | **Pool expansion is synchronous 200-frame batch** | Visible hitch when pool exhausts mid-combat | `expandPool()` L140–158 |

### 🟠 MEDIUM

| # | Problem | Impact | Location |
|---|---------|--------|----------|
| 4 | **Frame pool never shrinks** | High-water mark permanent, memory grows monotonically | `framePool` field, no trim logic |
| 5 | **Possible frame leak in transport double-tracking** | 1 frame leaked per overlapping track/queue cycle | `processDelayedTrackQueue()` L156–167 |
| 6 | **City color computed every tick for ~200 cities** | ~10,000 unnecessary alliance checks/sec in steady state | `updateIconColor()` L430–503 |
| 7 | **Ally mode timer not destroyable** | Minor: 2 ticks/sec for rare button-press correction | Constructor L101–106 |

### 🟡 LOW

| # | Problem | Impact | Location |
|---|---------|--------|----------|
| 8 | **Capital borders never individually removed** | 10–24 extra frames max, negligible | `addCapitalBorder()` L579–664 |
| 9 | **`unitLastTexture` Map grows with tracked units** | Map entries cleaned on untrack, not a leak | `setTextureCached()` L567 |

---

## Scenario Analysis: 5 Minutes of Intense Combat

**Setup:** 12 active players, world map, late-game. Each player spawns ~8 units per turn (turn = 60s). Deaths average ~40 units per turn.

### Per 5-minute window:

| Metric | Count |
|--------|-------|
| Units spawned | 12 players × 8 units × 5 turns = 480 |
| Units killed | ~200 |
| Net unit increase | ~280 per 5 min → pool demand grows |
| Track operations | 480 (spawn) + 200 (death untrack) = 680 |
| If 2 players eliminated | redistribute ~150 units → 300 track/untrack ops |
| **Total track/untrack per 5 min** | **~980** |

### Frame pool pressure:

If starting pool (2,000) is sufficient for peak concurrent units (~800), **no expansion needed**. But if concurrent tracked units exceed 2,000 (possible on world map with 23 players), each expansion batch causes a ~50–100ms hitch.

### Update loop pressure:

With 800 concurrent tracked units + 200 cities:
- **Per tick:** ~8,000 native calls
- **Per second:** ~80,000 native calls
- **Per 5 minutes:** ~24,000,000 native calls from this system alone

---

## Recommendations for Further Investigation

1. **Instrument frame pool high-water mark** — add a counter for peak `trackedUnits.size + framePool.length` to measure actual frame accumulation in production games
2. **Profile `updateAllIcons()` duration** — measure the actual time spent in the update callback vs. the 100ms budget; if it exceeds budget, frames will queue up
3. **Test transport double-tracking** — create a targeted test that unloads a unit and immediately tracks it from another source to confirm whether frames leak
4. **Measure redistribution cost** — log wall-clock time for `redistributeExistingUnits()` with 100+ units to quantify the freeze duration
5. **Evaluate reducing update frequency** — test at 0.2s (5 Hz) or 0.3s (3.3 Hz) to measure visual quality vs. CPU savings; unit movement smoothness is the primary concern
6. **Evaluate dirty-flag approach for cities** — cities only need color updates when ownership changes, ally mode toggles, or fog transitions; an event-driven approach could eliminate ~10,000 calls/sec
