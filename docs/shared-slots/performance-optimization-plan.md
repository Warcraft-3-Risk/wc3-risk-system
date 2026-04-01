# Performance Optimization Plan: Custom Minimap & Shared Slots

## Overview

This document identifies performance bottlenecks in the custom minimap icon system and shared slot infrastructure, and proposes concrete optimizations. The primary goal is reducing per-tick CPU cost in late-game scenarios where hundreds of cities and thousands of spawned units are active.

---

## Bottleneck Analysis

### 1. MinimapIconManager — 0.1s Update Loop (Critical)

**File:** [src/app/managers/minimap-icon-manager.ts](src/app/managers/minimap-icon-manager.ts#L337)

`updateAllIcons()` runs every **100ms** and iterates **every city icon** AND **every tracked unit**. Each iteration calls multiple WC3 natives: `IsUnitVisible`, `GetUnitX`, `GetUnitY`, `BlzFrameSetAbsPoint`, `BlzFrameSetTexture`, `BlzFrameSetVisible`.

**Impact:** This is the **#1 performance concern**. With ~200 cities (world map) and potentially 1,000+ spawned units, this is thousands of native calls per tick — 10 times per second.

**Sub-issues:**

| #   | Issue                                                                                                                                          | Lines                                                          | Severity |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------- |
| 1a  | City positions are **static** but `updateIconPosition` is called every tick for every city + capital borders                                   | [L347–358](src/app/managers/minimap-icon-manager.ts#L347-L358) | High     |
| 1b  | City colors only change on ownership change, yet `updateIconColor` + `BlzFrameSetTexture` is called every 100ms for all cities                 | [L360](src/app/managers/minimap-icon-manager.ts#L360)          | High     |
| 1c  | Texture path strings (`'ReplaceableTextures\\TeamColor\\TeamColor' + colorStr + '.blp'`) are built via concatenation every tick for every icon | [L456–475](src/app/managers/minimap-icon-manager.ts#L456-L475) | Medium   |
| 1d  | `unitsToRemove` array is **allocated every tick** to collect dead units                                                                        | [L370](src/app/managers/minimap-icon-manager.ts#L370)          | Low      |
| 1e  | `IsUnitVisible` called for every city every tick, even when fog-of-war hasn't changed                                                          | [L348](src/app/managers/minimap-icon-manager.ts#L348)          | Medium   |

---

### 2. Ally Color Filter Poll Timer — 0.03s (Medium)

**File:** [src/app/managers/minimap-icon-manager.ts](src/app/managers/minimap-icon-manager.ts#L89)

A separate timer fires every **30ms** solely to check `GetAllyColorFilterState()` and correct mode 2 back to 0. This is 33 ticks/second for a simple integer check.

**Impact:** Low individually, but adds unnecessary timer overhead.

---

### 3. debugPrint in Hot Paths (Medium)

**Files:** [shared-slot-manager.ts](src/app/game/services/shared-slot-manager.ts#L59-L68), [unit-lag-manager.ts](src/app/game/services/unit-lag-manager.ts#L37), [spawner.ts](src/app/spawner/spawner.ts)

`debugPrint` is called on **every** unit spawn, death, track/untrack, and increment/decrement. Even when `DEBUG_PRINTS.master` is `false`, the call still:

1. Evaluates template literal arguments (string concatenation, `GetPlayerId()` calls)
2. Enters the function body to hit the `if (!DEBUG_PRINTS.master) return` guard

With thousands of spawns/deaths per game, the argument evaluation cost adds up even in release builds.

---

### 4. Spawner.step() Per-Unit Overhead (Medium)

**File:** [src/app/spawner/spawner.ts](src/app/spawner/spawner.ts#L68-L105)

Each spawned unit triggers:

- `matchPlayers.find(x => x.getPlayer() == this.getOwner())` — **O(n) linear scan** per unit spawned
- `GetUnitRallyPoint` / `RemoveLocation` — creates and destroys a **handle** per unit (WC3 handle table pressure)
- `BlzSetUnitName(u, ...)` — string concatenation per unit

In a burst spawn of 100+ units across all spawners, this is significant.

---

### 5. Spawner.onDeath() — Array.splice (Low)

**File:** [src/app/spawner/spawner.ts](src/app/spawner/spawner.ts#L140)

`splice(index, 1)` on the spawn array is **O(n)** due to array shifting. With many units per player (hundreds), frequent deaths cause repeated linear work.

---

### 6. SharedSlotManager — Alliance Setup (Low, Burst)

**File:** [src/app/game/services/shared-slot-manager.ts](src/app/game/services/shared-slot-manager.ts#L442)

`assignSlotToPlayer()` wipes alliances across all `bj_MAX_PLAYERS` (28) players × 8 `SetPlayerAlliance` calls = **224 native calls per slot assignment**. With cross-team alliances in `givePlayerFullControlOfSlot()`, this can compound to O(T·S·8) calls.

**Impact:** Low because it only runs on redistribution events (player elimination), not per-tick. But can cause a noticeable frame hitch.

---

### 7. Frame Pool Exhaustion Spike (Low, Burst)

**File:** [src/app/managers/minimap-icon-manager.ts](src/app/managers/minimap-icon-manager.ts#L194)

When the 2,000-frame pool runs out, 200 new `BACKDROP` frames are created synchronously. Each calls `BlzCreateFrameByType`, `BlzFrameSetSize`, `BlzFrameSetLevel`, `BlzFrameSetVisible`. This produces a **visible lag spike** during gameplay.

---

## Optimization Plan

### Phase 1: Eliminate Redundant City Updates (High Impact, Low Risk)

**Objective:** Cities don't move. Stop recalculating their positions and colors every tick.

- [ ] **1.1 — Remove city position updates from the periodic timer**

  **File:** [src/app/managers/minimap-icon-manager.ts](src/app/managers/minimap-icon-manager.ts#L347-L358)

  City positions (`city.barrack.defaultX/Y`) are set once at creation and never change. `updateIconPosition` for cities and their capital borders should only be called in `createCityIcon()` and `addCapitalBorder()` — never in `updateAllIcons()`.

  In `updateAllIcons()`, replace the city loop with a visibility/color-only check:

  ```typescript
  this.cityIcons.forEach((iconFrame, city) => {
  	const isVisible = IsUnitVisible(city.barrack.unit, localPlayer);
  	this.updateIconColor(iconFrame, city, isVisible, effectiveLocal);
  });
  ```

  Remove the `updateIconPosition` calls for `iconFrame`, `innerBorder`, and `outerBorder` from within this loop.

  **Savings:** Eliminates ~200 `worldToMinimapCoords` + `BlzFrameSetAbsPoint` calls per tick (× 3 for capitals with borders).

---

- [ ] **1.2 — Make city color updates event-driven instead of polled**

  **File:** [src/app/managers/minimap-icon-manager.ts](src/app/managers/minimap-icon-manager.ts#L400)

  City color only changes when:

  - Ownership changes (captured, neutralized)
  - Ally color filter mode toggles (0 ↔ 1)

  Add a `dirtyCities: Set<City>` field. Mark cities dirty on ownership change (hook into the existing `OwnershipChangeEvent` or expose a `markCityDirty(city)` method). Mark **all** cities dirty when ally color mode changes.

  In `updateAllIcons()`, only update color for dirty cities:

  ```typescript
  this.dirtyCities.forEach((city) => {
  	const iconFrame = this.cityIcons.get(city);
  	if (iconFrame) {
  		const isVisible = IsUnitVisible(city.barrack.unit, localPlayer);
  		this.updateIconColor(iconFrame, city, isVisible, effectiveLocal);
  	}
  });
  this.dirtyCities.clear();
  ```

  For fog-of-war visibility changes (cities entering/leaving fog), keep a lightweight visibility-only check that just toggles `BlzFrameSetVisible` without re-running the full color logic:

  ```typescript
  this.cityIcons.forEach((iconFrame, city) => {
  	const isVisible = IsUnitVisible(city.barrack.unit, localPlayer);
  	const wasVisible = this.cityVisibility.get(city) || false;
  	if (isVisible !== wasVisible) {
  		this.cityVisibility.set(city, isVisible);
  		this.dirtyColors.add(city); // trigger color update on visibility transition
  	}
  });
  ```

  **Savings:** Eliminates `updateIconColor` → `BlzFrameSetTexture` for ~200 cities per tick except during ownership changes.

---

- [ ] **1.3 — Reduce ally color filter poll frequency**

  **File:** [src/app/managers/minimap-icon-manager.ts](src/app/managers/minimap-icon-manager.ts#L89)

  Change the 0.03s (33Hz) polling timer to 0.5s (2Hz). The ally color button is a rare user action — 2Hz is responsive enough.

  When the mode changes, mark all cities and units as color-dirty.

  ```typescript
  TimerStart(allyModeTimer, 0.5, true, () => {
  	const currentState = GetAllyColorFilterState();
  	if (currentState === 2) {
  		SetAllyColorFilterState(0);
  	}
  	if (currentState !== this.lastAllyColorState) {
  		this.lastAllyColorState = currentState;
  		this.markAllColorsDirty();
  	}
  });
  ```

---

### Phase 2: Optimize Unit Icon Updates (High Impact, Medium Risk)

**Objective:** Reduce per-unit work in the hot 0.1s loop.

- [ ] **2.1 — Cache texture path strings**

  **File:** [src/app/managers/minimap-icon-manager.ts](src/app/managers/minimap-icon-manager.ts#L456-L530)

  Pre-build all 26 texture paths at initialization (24 player colors + white + gray) and store in a lookup array:

  ```typescript
  private readonly COLOR_TEXTURES: string[] = [];

  // In constructor:
  for (let i = 0; i < 24; i++) {
      const str = i < 10 ? '0' + i : '' + i;
      this.COLOR_TEXTURES[i] = 'ReplaceableTextures\\TeamColor\\TeamColor' + str + '.blp';
  }
  this.COLOR_TEXTURES[90] = 'ReplaceableTextures\\TeamColor\\TeamColor90.blp'; // gray/neutral
  this.COLOR_TEXTURES[99] = 'ReplaceableTextures\\TeamColor\\TeamColor99.blp'; // white/self
  ```

  Replace all string concatenation in `updateIconColor` / `updateUnitIconColor` with direct array lookups.

  **Savings:** Eliminates string concatenation and garbage generation in the hot loop.

---

- [ ] **2.2 — Skip `BlzFrameSetTexture` when color hasn't changed**

  **File:** [src/app/managers/minimap-icon-manager.ts](src/app/managers/minimap-icon-manager.ts#L495-L530)

  Track the last-applied color index per unit. Only call `BlzFrameSetTexture` when the color actually changes:

  ```typescript
  private unitLastColor: Map<unit, number> = new Map();

  // In updateUnitIconColor:
  if (this.unitLastColor.get(unit) !== colorIndex) {
      BlzFrameSetTexture(iconFrame, this.COLOR_TEXTURES[colorIndex], 0, true);
      this.unitLastColor.set(unit, colorIndex);
  }
  ```

  Most units never change color during their lifetime, so this should skip the native call for ~99% of iterations.

  **Savings:** Eliminates nearly all `BlzFrameSetTexture` calls for units per tick.

---

- [ ] **2.3 — Reuse `unitsToRemove` array across ticks**

  **File:** [src/app/managers/minimap-icon-manager.ts](src/app/managers/minimap-icon-manager.ts#L370)

  Promote `unitsToRemove` to a class field and clear it with `.length = 0` instead of allocating a new array every tick:

  ```typescript
  private unitsToRemove: unit[] = [];

  // In updateAllIcons():
  this.unitsToRemove.length = 0;
  // ... push dead units ...
  ```

  **Savings:** Minor — eliminates one array allocation per tick.

---

- [ ] **2.4 — Consider increasing the update interval for units**

  Currently both cities and units share the 0.1s timer. After Phase 1 makes city updates nearly free, evaluate whether the unit update interval can be relaxed to 0.15s or 0.2s without noticeable visual degradation on the minimap.

  **Trade-off:** Slightly less smooth minimap dots vs. significantly fewer native calls per second.

---

### Phase 3: Eliminate debugPrint Overhead in Release Builds (Medium Impact, Low Risk)

**Objective:** Ensure debug logging has zero cost when disabled.

- [x] **3.1 — Avoid argument evaluation when debug is off**

  **File:** [src/app/utils/debug-print.ts](src/app/utils/debug-print.ts#L193)

  Template literals like `` `[SharedSlots] Increment slot ${GetPlayerId(slot)}: ${oldCount} → ${newCount}` `` are fully evaluated **before** `debugPrint` is called, including the `GetPlayerId()` native calls. When `DEBUG_PRINTS.master` is `false`, this is wasted work.

  Wrap high-frequency debug calls in an inline guard so the template literal is never evaluated when `DEBUG_PRINTS.master` is `false`:

  ```typescript
  if (DEBUG_PRINTS.master) debugPrint(`[SharedSlots] Increment slot ${GetPlayerId(slot)}: ${oldCount} → ${newCount}`, DC.sharedSlots);
  ```

  Since `DEBUG_PRINTS.master` is a property on a `const` object, TSTL cannot prove it isn't mutated at runtime, so dead-code elimination is unlikely. However, the inline guard is still effective — it's a single boolean check that avoids all template literal evaluation, `GetPlayerId()` native calls, and the `debugPrint` function call overhead.

  Apply this to all high-frequency call sites: `incrementUnitCount`, `decrementUnitCount`, `trackUnit`, `untrackUnit`, `getSlotWithLowestUnitCount`, and `Spawner.step()`.

  **Note:** A lambda approach (`debugPrintLazy(() => ...)`) was considered but rejected — in TSTL, closures still allocate a function object and capture upvalues on every call, trading string concatenation cost for closure allocation cost.

  **Savings:** Eliminates `GetPlayerId`, `GetUnitName`, string concatenation, and function call overhead on every spawn/death/track — thousands of calls per game.

---

### Phase 4: Spawner Micro-Optimizations (Medium Impact, Low Risk)

- [ ] **4.1 — Cache `matchPlayers.find()` result per step**

  **File:** [src/app/spawner/spawner.ts](src/app/spawner/spawner.ts#L88)

  The `.find()` linear scan runs once per spawned unit, but the result is always the same within a single `step()` call (same owner). Cache it before the loop:

  ```typescript
  const ownerMatchPlayer = GlobalGameData.matchPlayers.find((x) => x.getPlayer() == this.getOwner());

  for (let i = 0; i < amount; i++) {
  	// use ownerMatchPlayer directly
  	if (!IsUnitType(u, UNIT_TYPE.TRANSPORT)) {
  		ownerMatchPlayer.trackedData.units.add(u);
  	}
  	// ...
  }
  ```

  **Savings:** Reduces O(n × amount) to O(n + amount) per spawner per step.

---

- [ ] **4.2 — Cache rally point location per step**

  **File:** [src/app/spawner/spawner.ts](src/app/spawner/spawner.ts#L84-L99)

  `GetUnitRallyPoint()` creates a new `location` handle each call. Since all units from one spawner use the same rally point, get it once before the loop:

  ```typescript
  const rallyLoc = GetUnitRallyPoint(this.unit);

  for (let i = 0; i < amount; i++) {
  	// ...
  	if (rallyLoc != null) {
  		IssuePointOrderLoc(u, 'attack', rallyLoc);
  	}
  }

  if (rallyLoc != null) RemoveLocation(rallyLoc);
  ```

  **Savings:** Reduces handle creation/destruction from O(amount) to O(1) per spawner per step.

---

- [x] ~~**4.3 — Replace `spawnMap` array with a counter**~~ **REJECTED**

  The `spawnMap` tracks which specific units belong to each country's spawner. On unit death, `onDeath()` uses `indexOf` + `splice` to remove the dead unit so the spawner knows it can replace it. A simple counter wouldn't work because we need to know _which_ spawner a dying unit belongs to (via the global `SPAWNER_UNITS` map) and remove it from that spawner's list. The per-country tracking is essential to the spawn cap mechanic.

---

### Phase 5: Frame Pool Tuning (Low Impact, Low Risk)

- [ ] **5.1 — Increase initial pool or use dynamic sizing**

  **File:** [src/app/managers/minimap-icon-manager.ts](src/app/managers/minimap-icon-manager.ts#L40)

  The current `INITIAL_POOL_SIZE = 2000` may not be enough for late-game world maps. Options:

  - Increase to 3000–4000 based on expected max units
  - Or pre-expand during the first spawn turn (when unit counts are known) rather than at init

  **Also:** Reduce the expansion batch from 200 to 50–100 to smooth out lag spikes when expansion does happen.

---

## Priority & Estimated Impact

| Phase | Optimization                  | Impact | Risk   | Priority |
| ----- | ----------------------------- | ------ | ------ | -------- |
| 1.1   | Remove city position updates  | High   | Low    | P0       |
| 1.2   | Event-driven city colors      | High   | Medium | P0       |
| 2.1   | Cache texture strings         | Medium | Low    | P0       |
| 2.2   | Skip unchanged textures       | High   | Low    | P0       |
| 3.1   | Guard debug prints            | Medium | Low    | P1       |
| 4.1   | Cache matchPlayers.find       | Medium | Low    | P1       |
| 4.2   | Cache rally point             | Medium | Low    | P1       |
| 1.3   | Reduce ally color poll        | Low    | Low    | P1       |
| 2.3   | Reuse unitsToRemove array     | Low    | Low    | P2       |
| 4.3   | Replace spawnMap with counter | Low    | Medium | P2       |
| 5.1   | Frame pool tuning             | Low    | Low    | P2       |
| 2.4   | Relax unit update interval    | Medium | Medium | P2       |

**P0 = Do first.** These address the core hot loop and together should cut minimap update cost by 60–80% in steady-state gameplay.

**P1 = Do second.** These eliminate waste in spawn/death paths and debug infrastructure.

**P2 = Do if time allows.** Marginal gains, but keep things clean.
