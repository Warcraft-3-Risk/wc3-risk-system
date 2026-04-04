# Execution Plan: MinimapIconManager 0.1s Update Loop Optimization

## Problem Statement

`MinimapIconManager.updateAllIcons()` runs on a **0.1s periodic timer** (10 ticks/second) and iterates **every city icon** AND **every tracked unit** on each tick, calling multiple expensive WC3 natives per element:

- `IsUnitVisible` — fog-of-war check
- `GetUnitX` / `GetUnitY` — position read
- `BlzFrameSetAbsPoint` — frame repositioning
- `BlzFrameSetTexture` — texture swap (string path)
- `BlzFrameSetVisible` — show/hide toggle

**Scale:** ~200 cities (world map) × up to 3 frames each (capital borders) + 1,000+ spawned units = **thousands of native calls per tick, 10 times per second**. In late-game this means **10,000+ WC3 native calls/second** from this single system, most of which are redundant.

**File:** [src/app/managers/minimap-icon-manager.ts](../src/app/managers/minimap-icon-manager.ts)

> **Note:** City icon frames are always visible (`BlzFrameSetVisible` is set once at creation and never toggled). Color alone conveys fog-of-war state (gray = never seen, last-seen color = in fog, current color = visible). Capital border frames (white/black rings) are also permanently visible with fixed textures. Only **unit** icon frames toggle visibility based on fog.

---

## Root Causes

### 1a. City positions recalculated every tick (HIGH severity)

**Lines:** `updateAllIcons()` → L347–358

Cities never move — their positions come from `city.barrack.defaultX/Y`, which are fixed at map load. Yet every 100ms the update loop calls `updateIconPosition()` for every city icon, plus up to 2 additional calls per capital (inner border + outer border frame). Each call runs `worldToMinimapCoords()` (division, subtraction) and `BlzFrameSetAbsPoint()` (native).

**Cost per tick:** ~200 cities × (1–3 frames) × (`worldToMinimapCoords` + `BlzFrameSetAbsPoint`) = **200–600 position updates doing nothing**.

### 1b. City colors polled every tick (HIGH severity)

**Lines:** `updateAllIcons()` → L360 calling `updateIconColor()`

City color only changes when:

- Ownership changes (capture, neutralization, shared-slot reassignment)
- Ally color filter mode toggles (player presses the button)
- Visibility transitions (entering/leaving fog of war)

Yet `updateIconColor()` runs for all ~200 cities every 100ms. Inside it, every call:

1. Reads `city.getOwner()`
2. Reads `GetAllyColorFilterState()`
3. Calls `GetPlayerId()`, `IsPlayerAlly()`, `IsPlayerEnemy()`
4. Builds a texture path string via concatenation
5. Calls `BlzFrameSetTexture()` — **always**, even when the texture hasn't changed

**Cost per tick:** ~200 × (`getOwner` + alliance checks + string concat + `BlzFrameSetTexture`) = **200 texture updates doing nothing** in steady state.

### 1c. Texture path strings rebuilt every tick (MEDIUM severity)

**Lines:** `updateIconColor()` L456–475, `updateUnitIconColor()` L495–530

Every color update builds `'ReplaceableTextures\\TeamColor\\TeamColor' + colorStr + '.blp'` via string concatenation. In Lua (TSTL target), string concatenation allocates a new string on each call. With cities + units, this generates **hundreds of garbage strings per tick**.

### 1d. `unitsToRemove` array allocated every tick (LOW severity)

**Line:** L370

A fresh `unit[]` array is allocated every 100ms to collect dead units for cleanup. Should be a reused class field.

### 1e. Ally color filter polled at 33Hz (LOW severity)

**Lines:** Constructor, L89–96

A separate 0.03s timer (33 ticks/second) checks `GetAllyColorFilterState()` just to correct mode 2 back to 0. This is a rare user action; 33Hz polling is excessive.

---

## Solution Design

The strategy is **make the hot loop do as little as possible** by:

1. Never updating things that don't change (city positions)
2. Caching computed values (texture paths → pre-built lookup table)
3. Skipping redundant native calls (track last-applied texture per frame)
4. Reducing poll frequency where safe (ally color filter)

### Regression Analysis: Why Dirty-Flag City Colors Are Risky

The original performance-optimization-plan.md proposed making city color updates fully event-driven via dirty flags (only call `updateIconColor()` when a city is marked dirty). **This approach has significant regression risks** and has been downgraded from a mandatory task to an optional future optimization.

**What determines the output of `updateIconColor()`:**

| Input                                   | How it changes                                                      | Hookable?                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `city.getOwner()`                       | `city.setOwner()` calls (capture, guard swap, allied kill)          | Yes — hook `setOwner()`                                                                                                  |
| `IsUnitVisible(city.barrack.unit, ...)` | Fog of war transitions (units entering/leaving vision)              | Yes — compare per-tick                                                                                                   |
| `GetAllyColorFilterState()`             | User clicks minimap ally-color button                               | Yes — poll timer detects                                                                                                 |
| `IsPlayerAlly(owner, localPlayer)`      | `SharedSlotManager.assignSlotToPlayer()` wipes & rebuilds alliances | **Partially** — `evaluateAndRedistribute()` returns `true` on changes, but called from 2 external sites                  |
| `PlayerManager.isDead()` in FFA         | Player elimination changes ally color from teal→red                 | **Partially** — `EVENT_ON_PLAYER_DEAD` emitted, but only 1 handler exists, not wired to minimap                          |
| `lastSeenOwners` memory                 | Updated inside `updateIconColor()` every tick when visible          | **Breaks if skipped** — if city is visible & not dirty, `lastSeenOwners` doesn't update, causing stale fog-of-war memory |

**Specific regression scenarios if dirty flags are implemented naively:**

1. **Alliance change in ally-color mode:** `SharedSlotManager.evaluateAndRedistribute()` reassigns slots and rebuilds alliances via `assignSlotToPlayer()` → `SetPlayerAlliance()`. If ally-color mode is active (mode 1), `IsPlayerAlly(owner, localPlayer)` returns a different result. Without marking all cities dirty, cities show stale ally/enemy colors.

2. **Player death in FFA:** When the local player dies in FFA, the `isDeadInFFA` check flips from `false` to `true`, changing ally color from teal (TeamColor04) to red (TeamColor00). No dirty flag is triggered.

3. **Stale fog-of-war memory:** `updateIconColor()` unconditionally updates `lastSeenOwners.set(city, owner)` every tick when the city is visible. If the function is skipped (city not dirty but visible), and ownership changes through an unhooked path, `lastSeenOwners` retains the old owner. When the city later enters fog, it shows the wrong color.

**Mitigating factor:** `evaluateAndRedistribute()` has multiple early-exit paths and is usually a no-op (returns `false`). Actual alliance changes only happen on slot redistribution events (player elimination with 0-unit slots freed). So this is an **infrequent** regression — but when it hits, it's visually wrong.

**Chosen approach:** Instead of dirty flags, we use **Task 2.2 (texture-skip cache)** which achieves ~90% of the same benefit with **zero regression risk**. The `updateIconColor()` function still runs every tick (maintaining all side effects like `lastSeenOwners` updates), but the expensive `BlzFrameSetTexture` native call is skipped when the computed texture matches the last-applied one.

### Architecture After Optimization

```
updateAllIcons() — 0.1s timer
├── City loop (no position, color logic runs but native skipped if unchanged):
│   ├── IsUnitVisible() — still runs every tick
│   ├── updateIconColor() — still runs every tick (maintains lastSeenOwners)
│   │   └── BlzFrameSetTexture() — SKIPPED if texture unchanged (via cache)
│   └── (NO position updates — set once at creation)
│
├── Unit loop (position + cached color):
│   ├── Dead check → collect for removal (reused array)
│   ├── IsUnitVisible()
│   ├── updateIconPosition() — units move, this stays
│   ├── updateUnitIconColor() — runs every tick
│   │   └── BlzFrameSetTexture() — SKIPPED if texture unchanged (via cache)
│   └── BlzFrameSetVisible()
│
└── Cleanup dead units (reused array)
```

---

## Execution Tasks

### Phase 1: Eliminate Redundant City Position Updates (HIGH impact, ZERO risk)

- [x] **1.1 — Remove city position updates from the periodic timer**

  In `updateAllIcons()`, delete the 3 `updateIconPosition()` calls for city icons, inner borders, and outer borders (L347–358). City positions are already set once in `createCityIcon()` and `addCapitalBorder()` — they never need updating.

  City positions come from `city.barrack.defaultX/Y` — fixed at map load. Capital border frames use the same coordinates and are also positioned once at creation. Neither city icons nor border frames toggle visibility (they are always visible; color alone conveys fog state).

  ```typescript
  // BEFORE (in updateAllIcons):
  this.cityIcons.forEach((iconFrame, city) => {
  	const isVisible = IsUnitVisible(city.barrack.unit, effectiveLocal);
  	const worldX = city.barrack.defaultX;
  	const worldY = city.barrack.defaultY;
  	this.updateIconPosition(iconFrame, worldX, worldY); // ← REMOVE
  	const innerBorder = this.cityBorders.get(city);
  	const outerBorder = this.cityOuterBorders.get(city);
  	if (innerBorder) this.updateIconPosition(innerBorder, worldX, worldY); // ← REMOVE
  	if (outerBorder) this.updateIconPosition(outerBorder, worldX, worldY); // ← REMOVE
  	this.updateIconColor(iconFrame, city, isVisible, effectiveLocal);
  });

  // AFTER:
  this.cityIcons.forEach((iconFrame, city) => {
  	const isVisible = IsUnitVisible(city.barrack.unit, effectiveLocal);
  	this.updateIconColor(iconFrame, city, isVisible, effectiveLocal);
  });
  ```

  **Savings:** Eliminates ~200–600 `worldToMinimapCoords` + `BlzFrameSetAbsPoint` native calls per tick.
  **Regression risk:** None — positions are provably static (`defaultX/Y` never change).

---

### Phase 2: Optimize Texture Handling (HIGH impact, ZERO risk)

- [x] **2.1 — Pre-build texture path lookup table**

  Add a lookup array built once in the constructor. Eliminates all string concatenation in the hot loop.

  ```typescript
  private readonly COLOR_TEXTURES: string[] = [];

  // In constructor (after isActive check):
  for (let i = 0; i < 24; i++) {
      const str = i < 10 ? '0' + i : '' + i;
      this.COLOR_TEXTURES[i] = 'ReplaceableTextures\\TeamColor\\TeamColor' + str + '.blp';
  }
  this.COLOR_TEXTURES[24] = 'ReplaceableTextures\\TeamColor\\TeamColor24.blp';  // black (capital inner border)
  this.COLOR_TEXTURES[90] = 'ReplaceableTextures\\TeamColor\\TeamColor90.blp';  // neutral gray
  this.COLOR_TEXTURES[99] = 'ReplaceableTextures\\TeamColor\\TeamColor99.blp';  // white (self / capital outer border)
  ```

  Replace all string concatenation in `updateIconColor()` and `updateUnitIconColor()` with `this.COLOR_TEXTURES[index]` lookups. Map the special cases:

  - `owner == localPlayer` → `this.COLOR_TEXTURES[99]` (white)
  - Never-seen / neutral / invalid → `this.COLOR_TEXTURES[90]` (gray)
  - Enemy in ally-color mode → `this.COLOR_TEXTURES[0]` (red, Player 0 color)
  - Ally in ally-color mode → `this.COLOR_TEXTURES[4]` (teal, Player 4 color)
  - Ally in FFA when dead → `this.COLOR_TEXTURES[0]` (red override)
  - Player colors → `this.COLOR_TEXTURES[colorIndex]`

  **Savings:** Eliminates all per-tick string concatenation and garbage string generation.
  **Regression risk:** None — same strings, just pre-computed. Must ensure sparse array indices 24, 90, 99 are populated.

---

- [x] **2.2 — Track last-applied texture per frame and skip redundant `BlzFrameSetTexture` calls**

  This is the **primary optimization for city colors** — it replaces the risky dirty-flag approach with a safe last-value cache that preserves all existing logic flow.

  Add tracking maps:

  ```typescript
  private cityLastTexture: Map<City, string> = new Map();
  private unitLastTexture: Map<unit, string> = new Map();
  ```

  Instead of calling `BlzFrameSetTexture` directly, call a helper that checks the cache:

  ```typescript
  private setTextureCached(key: City | unit, iconFrame: framehandle, texture: string,
                           cache: Map<City | unit, string>): void {
      if (cache.get(key) !== texture) {
          BlzFrameSetTexture(iconFrame, texture, 0, true);
          cache.set(key, texture);
      }
  }
  ```

  Replace all `BlzFrameSetTexture` calls in `updateIconColor()` and `updateUnitIconColor()` with this helper.

  **Why this is safe:** `updateIconColor()` still runs every tick. All side effects are preserved:

  - `lastSeenOwners.set(city, owner)` still updates every tick when visible ✅
  - `SetAllyColorFilterState(0)` correction still runs ✅
  - Alliance checks, FFA dead checks still evaluate ✅
  - Only the expensive native `BlzFrameSetTexture` call is skipped when the result hasn't changed

  **Important:** Clear the cache when frames are recycled (in `unregisterTrackedUnit()` when returning frames to the pool) so recycled frames get their texture set on first use:

  ```typescript
  // In unregisterTrackedUnit():
  this.unitLastTexture.delete(unit);
  ```

  Also clear in `destroy()` for both maps.

  **Savings:** Eliminates ~99% of `BlzFrameSetTexture` native calls for both cities and units. Most cities hold the same owner for many seconds. Most units never change color during their lifetime.
  **Regression risk:** None — all logic runs identically, only the redundant native call is skipped.

---

- [x] **2.3 — Reuse `unitsToRemove` array across ticks**

  Promote to a class field and clear with `.length = 0`:

  ```typescript
  private unitsToRemove: unit[] = [];

  // In updateAllIcons():
  this.unitsToRemove.length = 0;
  // ... push dead units ...
  ```

  **Savings:** Eliminates one array allocation per tick (minor).
  **Regression risk:** None.

---

### Phase 3: Reduce Timer Overhead (LOW impact, LOW risk)

- [x] **3.1 — Reduce ally color filter poll to 0.5s**

  Change the constructor's 0.03s timer to 0.5s. The ally color button is a rare user action — 2Hz is responsive enough.

  **Additional safety net:** `updateIconColor()` already contains `if (allyColorMode == 2) { SetAllyColorFilterState(0); }` inside the city loop, which runs every 0.1s via the main update timer. So even without the dedicated poll timer, mode 2 gets corrected within 0.1s. The poll timer is purely belt-and-suspenders.

  ```typescript
  TimerStart(allyModeTimer, 0.5, true, () => {
  	if (GetAllyColorFilterState() === 2) {
  		SetAllyColorFilterState(0);
  	}
  });
  ```

  **Savings:** Reduces 33 timer fires/second to 2/second.
  **Regression risk:** None — the main 0.1s update loop already handles mode 2 correction. Note: the city loop's inline `SetAllyColorFilterState(0)` currently fires once per city (200x) — this is harmless but redundant. Could be optimized to run once before the loop, but that's separate scope.

---

### Phase 4: Cleanup and Validation

- [x] **4.1 — Ensure `destroy()` and `reinitialize()` clean up new state**

  The new fields (`cityLastTexture`, `unitLastTexture`, `unitsToRemove`, `COLOR_TEXTURES`) must be cleared in `destroy()`:

  ```typescript
  // In destroy():
  this.cityLastTexture.clear();
  this.unitLastTexture.clear();
  this.unitsToRemove.length = 0;
  ```

  `COLOR_TEXTURES` is immutable and doesn't need clearing.

---

- [x] **4.2 — Test all scenarios**

  Verify the following work correctly after optimization:

  1. **City icons appear** at correct positions on game start
  2. **City colors update** when captured by another player
  3. **Fog of war** — cities entering/leaving fog show correct last-seen color
  4. **Ally color mode toggle** — all icons refresh when the button is pressed (should take max 0.1s since `updateIconColor` runs every tick and the texture cache will detect the path change)
  5. **Capital borders** display correctly at creation and stay permanently visible
  6. **Unit icons** move smoothly on the minimap
  7. **Unit colors** reflect correct owner (including shared-slot resolution)
  8. **Unit death cleanup** — dead unit icons disappear promptly
  9. **Transport load/unload** — icons hide/show correctly; recycled frames get correct texture on reuse
  10. **Replay mode** — observed player's fog of war is respected
  11. **Game reset (`-ng`)** — `reinitialize()` → `destroy()` cleans up caches, then `initialize()` rebuilds fresh
  12. **Frame pool exhaustion** — new units still get icons when pool expands; texture cache has no stale entries for new frames

---

## Future Optimization (Deferred — requires careful integration)

### Dirty-Flag City Colors

If further optimization is needed beyond Phase 1–3, city color updates can be made fully event-driven. This **requires hooking into multiple external systems** and is deferred due to regression risk.

**Would need to hook:**

- `City.setOwner()` → `markCityDirty(city)` (ownership change)
- `SharedSlotManager.evaluateAndRedistribute()` returning `true` → `markAllColorsDirty()` (alliance change)
- `EVENT_ON_PLAYER_DEAD` → `markAllColorsDirty()` (FFA dead-player color path change)
- FOW visibility transitions → per-city dirty flag (compare `IsUnitVisible` per tick)
- Ally color filter state change → `markAllColorsDirty()`

**Must also preserve:** `lastSeenOwners.set(city, owner)` update — either always run it regardless of dirty flags, or split it into a separate per-tick pass.

**Estimated additional savings over Phase 2:** ~5–10% — because Task 2.2 already eliminates the expensive `BlzFrameSetTexture` native call; the remaining cost is just the cheap JS-side alliance checks and map lookups that `updateIconColor()` performs.

---

## Expected Impact

| Optimization                     | What It Eliminates                      | Steady-State Reduction       |
| -------------------------------- | --------------------------------------- | ---------------------------- |
| 1.1 Remove city position updates | ~200–600 `BlzFrameSetAbsPoint` per tick | 100% of city position work   |
| 2.1 Cached texture paths         | ~200–1200 string concat+alloc per tick  | 100% of string building      |
| 2.2 Skip unchanged textures      | ~1000+ `BlzFrameSetTexture` per tick    | ~99% of texture native calls |
| 2.3 Reuse dead-unit array        | 1 array allocation per tick             | Minor GC savings             |
| 3.1 Reduce ally color poll       | ~31 timer fires/second                  | 94% timer reduction          |

**Combined:** Should reduce per-tick **native call count** by **60–80%** in steady-state late-game. The remaining per-tick cost is the cheap JS-side logic (visibility checks, owner reads, map lookups) which is orders of magnitude cheaper than the eliminated native calls.

## Risk Summary

| Task                         | Regression Risk | Notes                                                                                  |
| ---------------------------- | --------------- | -------------------------------------------------------------------------------------- |
| 1.1 Remove city positions    | **None**        | Positions are provably immutable (`defaultX/Y`)                                        |
| 2.1 Texture lookup table     | **None**        | Same strings, pre-computed                                                             |
| 2.2 Texture skip cache       | **None**        | All logic preserved, only redundant native skipped. Must clear cache on frame recycle. |
| 2.3 Reuse array              | **None**        | Trivial change                                                                         |
| 3.1 Reduce poll timer        | **None**        | Main loop already corrects mode 2 at 0.1s                                              |
| Dirty-flag colors (deferred) | **Medium**      | Multiple unhooked state changes can cause stale colors                                 |
