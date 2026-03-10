# Enemy Port Avoidance System (EPAS) — Design Document

> **Requested by:** AwesomeGuy  
> **Context:** _"The auto transport has been my favorite change in the game and it really brings up quality of life. Also, the portuguese strait is infamous for killing unaware ships and transports. Sometimes you dont control portugal but still want to own both bases in south and north. This change can help that, and make such strategy more feasible, possibly improving the dynamic of the game."_

---

## 1. Problem Statement

Transport ships in **Ferry mode** (the `PatrolState` cycle: LOADING → MOVING → UNLOADING → RETURNING) blindly path through enemy port harbours. Port guards will attack and often destroy the transport as it passes through their acquisition range. Players want their auto-transports to **navigate around** enemy ports instead of through them.

---

## 2. Scope & Constraints

| Constraint                    | Detail                                                                                                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Only Ferry mode**           | EPAS only activates when `transport.patrolEnabled === true` and the transport is in `PatrolState.MOVING` or `PatrolState.RETURNING`. Manual orders are unaffected.                            |
| **Enemy ports only**          | A port is "enemy" if the port's owner is an enemy of the transport's owner (`UnitLagManager.IsUnitEnemy(port.guard.unit, GetOwningPlayer(transport.unit))`). Allied or own ports are ignored. |
| **Player orders cancel EPAS** | Any non-scripted order (i.e. `isScriptOrdering === false`) already cancels patrol via `onPatrolOrder()`. This naturally also cancels any active EPAS navigation.                              |
| **Performance**               | Detection is event-driven via `TriggerRegisterUnitInRange` on the port unit — no per-tick scanning. Navigation uses pre-computed static points around each port.                              |

---

## 3. Key Concepts

### 3.1 Port Data Structure

At map initialization, we build a dedicated `PortData` structure for each port city. This is populated once by filtering all cities for ports, and stores everything EPAS needs:

```ts
type NavPoint = {
	index: number; // 0–11 (slot in the 12-point ring)
	x: number;
	y: number;
	valid: boolean; // false if over land (z-height check)
};

type PortData = {
	city: City;
	portUnit: unit; // the port city building (static, permanent)
	guardUnit: unit; // the guard ship
	centerX: number; // port unit position
	centerY: number;
	safeRadius: number; // PORT_ATTACK_RANGE + EPAS_BUFFER
	navPoints: NavPoint[]; // 12 pre-computed points around the port
	enterTrigger: trigger; // TriggerRegisterUnitInRange trigger
};
```

### 3.2 Detection Zone

The port guard has an **attack range** (acquisition range). We define a **safe radius** that is _larger_ than the attack range by a configurable buffer:

```
EPAS_BUFFER = 300
PORT_ATTACK_RANGE = ???    // read dynamically or use a constant (see §6)
EPAS_SAFE_RADIUS = PORT_ATTACK_RANGE + EPAS_BUFFER
```

Detection is **event-driven**: a `TriggerRegisterUnitInRange` trigger is registered on the **port unit** (the city building) with radius `EPAS_SAFE_RADIUS`. When any unit enters this range, the trigger callback fires and checks whether EPAS should activate.

### 3.3 Static Navigation Points (12-Point Ring)

Each port has **12 evenly-spaced points** around its safe-radius circle, computed once at init:

```
for i = 0 to 11:
    angle = i * 30° (in radians)
    x = centerX + SAFE_RADIUS * cos(angle)
    y = centerY + SAFE_RADIUS * sin(angle)
    z = GetLocationZ(x, y)
    valid = (z ≤ WATER_Z_THRESHOLD)   // only keep points over ocean
```

Points over land (above the water z-height threshold) are marked `valid = false` and will be skipped during navigation. This naturally handles coastal ports where part of the circle overlaps with terrain.

```
         11  0  1
       10  ╲ │ ╱  2
        ── P ──
        9  ╱ │ ╲  3
        8   7  6  5  4
             │
     (12 points at 30° intervals)
```

### 3.4 Transport Facing Angle

The transport's current heading is read directly via `GetUnitFacing(unit)`, which returns degrees (0 = east, 90 = north, 180 = west, 270 = south). Converted to radians:

```
facingRad = GetUnitFacing(transport.unit) * bj_DEGTORAD
```

The facing angle determines:

1. **Which nav point** the transport enters nearest to (the entry point).
2. **Which nav point** the transport should exit at (projected exit via ray-circle intersection).
3. **Which direction** to traverse the ring (CW or CCW, via cross product).

### 3.5 Navigation Model

Instead of computing arbitrary waypoints at runtime, EPAS navigates the transport from the entry nav point to the exit nav point by stepping through the pre-computed ring:

- **Entry point:** The nearest valid nav point to the transport's current position when EPAS activates.
- **Exit point:** The nav point nearest to where the transport's facing ray exits the safe-radius circle.
- **Direction:** Determined by cross product — port to the left of heading → CCW, port to the right → CW.
- **Skipping invalid points:** If the next nav point in the traversal direction is `valid = false`, skip it and continue to the next. If the exit point itself is invalid, use the nearest valid point before it.
- **Early exit:** If the next point in the direction is invalid and there are no more valid points before the exit, EPAS deactivates and resumes normal patrol.

---

## 4. High-Level Flow

```
┌─────────────────────────────────────────────────────────┐
│            INITIALIZATION (once at map start)            │
│                                                          │
│  For each port city:                                     │
│    1. Build PortData (center, radius, 12 nav points)     │
│    2. Filter nav points by z-height (mark land invalid)  │
│    3. Register TriggerRegisterUnitInRange on port unit    │
└──────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│     EVENT: Unit enters port safe-radius                  │
│     (TriggerRegisterUnitInRange callback)                │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │ Is entering unit a  │──── NO ──→ [Ignore]
            │ patrolling transport│
            │ in MOVING/RETURNING?│
            └─────────┬───────────┘
                      │ YES
                      ▼
            ┌─────────────────────┐
            │ Is this port enemy  │──── NO ──→ [Ignore]
            │ of the transport?   │
            └─────────┬───────────┘
                      │ YES
                      ▼
            ┌─────────────────────┐
            │ Is EPAS already     │──── YES ──→ [Ignore — already navigating]
            │ active for this     │
            │ transport?          │
            └─────────┬───────────┘
                      │ NO
                      ▼
            ┌─────────────────────┐
            │ Is transport heading │
            │ toward port?         │
            │ (dot product > 0)    │
            └─────────┬────────────┘
                      │
               YES /     \ NO
                 │        │
                 ▼        ▼
       [Activate EPAS]  [Ignore — heading away]
        - Find entry &
          exit nav points
        - Pick CW/CCW
        - Issue move to
          first nav point

┌─────────────────────────────────────────────────────────┐
│     handlePatrol() tick — EPAS active                    │
│     (PatrolState.MOVING or RETURNING)                    │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │ Distance to current │
            │ nav point < arrival │──── NO ──→ [Re-issue move if order lost]
            │ threshold?          │
            └─────────┬───────────┘
                      │ YES
                      ▼
            ┌─────────────────────┐
            │ Is this the exit    │
            │ nav point?          │
            └─────────┬───────────┘
               YES /     \ NO
                 │        │
                 ▼        ▼
       [Deactivate EPAS] [Advance to next valid
        Resume patrol]    nav point in direction.
                          If none → deactivate.]
```

---

## 5. Detailed Steps

### Step 0 — Initialization (once at map start)

For each port city in the game:

1. **Build `PortData`:**

   - Store reference to city, port unit, and guard unit.
   - Read port unit position as `centerX`, `centerY`.
   - Compute `safeRadius = PORT_ATTACK_RANGE + EPAS_BUFFER`.

2. **Compute 12 navigation points:**

   ```
   for i = 0 to 11:
       angle = i * 30° * bj_DEGTORAD
       x = centerX + safeRadius * cos(angle)
       y = centerY + safeRadius * sin(angle)
       loc = Location(x, y)
       z = GetLocationZ(loc)
       RemoveLocation(loc)
       valid = (z ≤ WATER_Z_THRESHOLD)
       navPoints[i] = { index: i, x, y, valid }
   ```

3. **Register detection trigger:**
   ```
   trigger = CreateTrigger()
   TriggerRegisterUnitInRange(trigger, portUnit, safeRadius, null)
   TriggerAddCondition(trigger, onPortRangeEnter)
   ```
   The `portUnit` (the city building) is static and permanent — it serves as the center of the detection circle.

### Step A — EPAS Activation (event-driven)

**Trigger:** The `onPortRangeEnter` callback fires when any unit enters a port's safe radius.

1. **Filter the entering unit:** In the callback, check:

   - `GetTriggerUnit()` is a transport with `patrolEnabled === true`
   - Transport is in `PatrolState.MOVING` or `PatrolState.RETURNING`
   - Port owner is enemy of transport owner
   - Guard is alive
   - `transport.epasActive === false` (not already navigating)

2. **Check heading toward port (dot product):**

   ```
   facingRad = GetUnitFacing(transport.unit) * bj_DEGTORAD
   headingX  = Cos(facingRad)
   headingY  = Sin(facingRad)
   toPortX   = portData.centerX - tx
   toPortY   = portData.centerY - ty
   dot       = headingX * toPortX + headingY * toPortY
   ```

   If `dot ≤ 0`, the transport is heading **away** from the port — ignore.

3. **Find entry nav point:** The nearest **valid** nav point to the transport's current position:

   ```
   entryIndex = nearest valid navPoint to (tx, ty)
   ```

4. **Find exit nav point via ray-circle intersection:** Project the facing direction as a ray and find where it exits the safe-radius circle (same quadratic as before). Then pick the nearest **valid** nav point to that exit coordinate:

   ```
   exitIndex = nearest valid navPoint to (exitX, exitY)
   ```

5. **Determine traversal direction via cross product:**

   ```
   cross = cos(θ_f) · (centerY - ty) - sin(θ_f) · (centerX - tx)
   ```

   - `cross > 0` → CCW (increment indices)
   - `cross ≤ 0` → CW (decrement indices)

6. **Validate path:** Check that there exists at least one valid nav point between entry and exit in the chosen direction. If not, skip EPAS entirely (let transport proceed normally).

7. **Store EPAS state on the transport:**

   ```
   transport.epasActive = true
   transport.epasPortData = portData
   transport.epasEntryIndex = entryIndex
   transport.epasExitIndex = exitIndex
   transport.epasCurrentIndex = entryIndex
   transport.epasDirection = direction   // +1 CCW, -1 CW
   transport.epasOriginalDestX/Y = (patrolDest or patrolOrigin)
   ```

8. **Issue move to entry nav point:**
   ```
   transport.isScriptOrdering = true
   IssuePointOrder(transport.unit, 'move', navPoints[entryIndex].x, navPoints[entryIndex].y)
   transport.isScriptOrdering = false
   ```

### Step B — Following Nav Points

On each `handlePatrol()` tick while `transport.epasActive`:

1. **Check arrival at current nav point:**

   ```
   dist = distance(transport, navPoints[currentIndex])
   if dist < ARRIVAL_THRESHOLD:
       → advance
   ```

2. **Check if at exit point:**
   If `currentIndex === exitIndex`:

   - Deactivate EPAS.
   - Resume normal patrol to original destination.
   - Return.

3. **Advance to next valid nav point:**

   ```
   nextIndex = (currentIndex + direction) mod 12
   ```

   Skip any `valid === false` points. If we loop all the way around without finding a valid point before reaching the exit, deactivate EPAS and resume patrol.

4. **Issue move to next nav point:**

   ```
   transport.epasCurrentIndex = nextIndex
   transport.isScriptOrdering = true
   IssuePointOrder(transport.unit, 'move', navPoints[nextIndex].x, navPoints[nextIndex].y)
   transport.isScriptOrdering = false
   ```

5. **Re-issue if order lost:** If the transport doesn't have a move order (e.g. got interrupted), re-issue the current nav point move.

### Step C — EPAS Cancellation

EPAS is cancelled when:

1. **Player issues a manual order** — handled by `onPatrolOrder()` → `stopPatrol()`. Extended to clear EPAS state.

2. **Transport dies** — `onDeath()` clears EPAS state.

3. **Port ownership changes** to allied/own — transport completes current arc; harmless brief detour.

4. **Exit nav point reached** — transport has passed the threat zone (Step B.2).

5. **No valid nav points remaining** — all points between current and exit are over land (Step B.3).

---

## 6. Implementation Considerations

### 6.1 Port Attack Range

In WC3, the guard unit's attack range can be read at runtime:

```ts
const attackRange = BlzGetUnitWeaponRealField(city.guard.unit, UNIT_WEAPON_RF_ATTACK_RANGE, 0);
```

Alternatively, if all port guards have the same attack range, use a constant:

```ts
const PORT_GUARD_ATTACK_RANGE: number = 600; // verify in editor
```

### 6.2 PortData Registry

Build the port data structure once during map initialization. The `AllPortData` array is populated after all cities are constructed:

```ts
export const AllPortData: PortData[] = [];

// Called once after city construction is complete:
function initializeEPAS(): void {
	for (const city of AllPortCities) {
		const portUnit = city.unit; // the city building
		const guardUnit = city.guard.unit;
		const cx = GetUnitX(portUnit);
		const cy = GetUnitY(portUnit);
		const attackRange = BlzGetUnitWeaponRealField(guardUnit, UNIT_WEAPON_RF_ATTACK_RANGE, 0);
		const R = attackRange + EPAS_BUFFER;

		// Compute 12 nav points
		const navPoints: NavPoint[] = [];
		for (let i = 0; i < 12; i++) {
			const angle = i * 30 * bj_DEGTORAD;
			const x = cx + R * Cos(angle);
			const y = cy + R * Sin(angle);
			const loc = Location(x, y);
			const z = GetLocationZ(loc);
			RemoveLocation(loc);
			navPoints.push({
				index: i,
				x,
				y,
				valid: z <= WATER_Z_THRESHOLD,
			});
		}

		// Register detection trigger on the port city building
		const trig = CreateTrigger();
		TriggerRegisterUnitInRange(trig, portUnit, R, null);
		TriggerAddCondition(
			trig,
			Condition(() => onPortRangeEnter(portData))
		);

		const portData: PortData = {
			city,
			portUnit,
			guardUnit,
			centerX: cx,
			centerY: cy,
			safeRadius: R,
			navPoints,
			enterTrigger: trig,
		};

		AllPortData.push(portData);
	}
}
```

### 6.3 Water Z-Height Threshold

The `WATER_Z_THRESHOLD` constant determines which nav points are considered "over water." In WC3, water terrain typically has a z-height at or below a certain value. This should be calibrated per map:

```ts
const WATER_Z_THRESHOLD: number = 0; // adjust based on map terrain — may need to be slightly positive
```

### 6.4 Transport Type Extension

Add EPAS fields to the `Transport` type:

```ts
type Transport = {
	// ... existing fields ...

	// EPAS fields
	epasActive: boolean;
	epasPortData: PortData | null;
	epasCurrentIndex: number;
	epasExitIndex: number;
	epasDirection: number; // +1 = CCW, -1 = CW
	epasOriginalDestX: number;
	epasOriginalDestY: number;
};
```

Initialize in `TransportManager.add()`:

```ts
epasActive: false,
epasPortData: null,
epasCurrentIndex: 0,
epasExitIndex: 0,
epasDirection: 1,
epasOriginalDestX: 0,
epasOriginalDestY: 0,
```

### 6.5 Integration into handlePatrol()

The `MOVING` and `RETURNING` cases of `handlePatrol()` check for active EPAS. Detection is now event-driven (no scanning needed here):

```ts
case PatrolState.MOVING:
    if (transport.epasActive) {
        this.handleEPAS(transport);
    } else {
        // existing MOVING logic (distance check, move order, etc.)
    }
    break;

case PatrolState.RETURNING:
    if (transport.epasActive) {
        this.handleEPAS(transport);
    } else {
        // existing RETURNING logic
    }
    break;
```

Note: EPAS activation no longer happens in `handlePatrol()` — it is triggered by the `TriggerRegisterUnitInRange` event callback.

### 6.6 Handling the `onPatrolOrder()` Cancellation

The existing `onPatrolOrder()` handler already cancels patrol when a non-scripted, non-load/unload order is detected. Since EPAS issues orders via `isScriptOrdering = true`, those won't trigger cancellation. If a player manually orders the transport, patrol (and thus EPAS) will be properly cancelled.

### 6.7 The `stopPatrol()` Extension

```ts
private stopPatrol(transport: Transport) {
    transport.patrolEnabled = false;

    // Clear EPAS state
    transport.epasActive = false;
    transport.epasPortData = null;

    // ... existing cleanup ...
}
```

---

## 7. Pseudo Code

### 7.1 Constants

```ts
const EPAS_BUFFER: number = 300;
const EPAS_ARRIVAL_THRESHOLD: number = 150;
const WATER_Z_THRESHOLD: number = 0; // calibrate per map
const NAV_POINT_COUNT: number = 12;
const NAV_POINT_ANGLE_STEP: number = 30; // degrees
```

### 7.2 initializeEPAS() — called once at map start

```ts
function initializeEPAS(): void {
	for (const city of AllPortCities) {
		const portUnit = city.unit;
		const guardUnit = city.guard.unit;
		const cx = GetUnitX(portUnit);
		const cy = GetUnitY(portUnit);
		const attackRange = BlzGetUnitWeaponRealField(guardUnit, UNIT_WEAPON_RF_ATTACK_RANGE, 0);
		const R = attackRange + EPAS_BUFFER;

		// Build 12 nav points
		const navPoints: NavPoint[] = [];
		for (let i = 0; i < NAV_POINT_COUNT; i++) {
			const angle = i * NAV_POINT_ANGLE_STEP * bj_DEGTORAD;
			const x = cx + R * Cos(angle);
			const y = cy + R * Sin(angle);
			const loc = Location(x, y);
			const z = GetLocationZ(loc);
			RemoveLocation(loc);
			navPoints.push({ index: i, x, y, valid: z <= WATER_Z_THRESHOLD });
		}

		const portData: PortData = {
			city,
			portUnit,
			guardUnit,
			centerX: cx,
			centerY: cy,
			safeRadius: R,
			navPoints,
			enterTrigger: null!,
		};

		// Register enter-range trigger on the city building
		const trig = CreateTrigger();
		TriggerRegisterUnitInRange(trig, portUnit, R, null);
		TriggerAddCondition(
			trig,
			Condition(() => onPortRangeEnter(portData))
		);
		portData.enterTrigger = trig;

		AllPortData.push(portData);
	}
}
```

### 7.3 onPortRangeEnter() — event callback

```ts
function onPortRangeEnter(portData: PortData): boolean {
	const entering = GetTriggerUnit();
	const transport = TransportManager.findTransport(entering);
	if (!transport) return false;

	// --- Filters ---
	if (!transport.patrolEnabled) return false;
	if (transport.state !== PatrolState.MOVING && transport.state !== PatrolState.RETURNING) return false;
	if (transport.epasActive) return false;
	if (!UnitAlive(portData.guardUnit)) return false;
	if (!UnitLagManager.IsUnitEnemy(portData.guardUnit, GetOwningPlayer(transport.unit))) return false;

	// --- Heading-toward-port check (dot product) ---
	const tx = GetUnitX(transport.unit);
	const ty = GetUnitY(transport.unit);
	const facingRad = GetUnitFacing(transport.unit) * bj_DEGTORAD;
	const hx = Cos(facingRad);
	const hy = Sin(facingRad);
	const dot = hx * (portData.centerX - tx) + hy * (portData.centerY - ty);
	if (dot <= 0) return false; // heading away

	// --- Activate ---
	activateEPAS(transport, portData);
	return false;
}
```

### 7.4 activateEPAS()

```ts
function activateEPAS(transport: Transport, portData: PortData): void {
	const tx = GetUnitX(transport.unit);
	const ty = GetUnitY(transport.unit);
	const navPoints = portData.navPoints;

	// 1. Find entry nav point (nearest valid to transport position)
	const entryIndex = findNearestValidNavPoint(navPoints, tx, ty);
	if (entryIndex === -1) return; // no valid nav points at all

	// 2. Compute exit point via ray-circle intersection
	const facingRad = GetUnitFacing(transport.unit) * bj_DEGTORAD;
	const hx = Cos(facingRad);
	const hy = Sin(facingRad);
	const ex = tx - portData.centerX;
	const ey = ty - portData.centerY;
	const R = portData.safeRadius;

	const b = 2 * (ex * hx + ey * hy);
	const c = ex * ex + ey * ey - R * R;
	const discriminant = b * b - 4 * c;
	const t_exit = (-b + SquareRoot(discriminant)) / 2;
	const exitX = tx + t_exit * hx;
	const exitY = ty + t_exit * hy;

	// 3. Find exit nav point (nearest valid to exit coordinates)
	const exitIndex = findNearestValidNavPoint(navPoints, exitX, exitY);
	if (exitIndex === -1) return;

	// 4. Determine direction via cross product
	const cross = hx * (portData.centerY - ty) - hy * (portData.centerX - tx);
	const direction = cross >= 0 ? 1 : -1; // +1 = CCW, -1 = CW

	// 5. Validate that a path exists (at least one valid point between entry and exit)
	if (!hasValidPath(navPoints, entryIndex, exitIndex, direction)) return;

	// 6. Store EPAS state
	transport.epasActive = true;
	transport.epasPortData = portData;
	transport.epasCurrentIndex = entryIndex;
	transport.epasExitIndex = exitIndex;
	transport.epasDirection = direction;

	if (transport.state === PatrolState.MOVING) {
		transport.epasOriginalDestX = transport.patrolDestX;
		transport.epasOriginalDestY = transport.patrolDestY;
	} else {
		transport.epasOriginalDestX = transport.patrolOriginX;
		transport.epasOriginalDestY = transport.patrolOriginY;
	}

	// 7. Issue move to entry nav point
	const entry = navPoints[entryIndex];
	transport.isScriptOrdering = true;
	IssuePointOrder(transport.unit, 'move', entry.x, entry.y);
	transport.isScriptOrdering = false;
}
```

### 7.5 handleEPAS() — called each tick from handlePatrol()

```ts
private handleEPAS(transport: Transport): void {
    const portData = transport.epasPortData;
    if (!portData) {
        this.deactivateEPAS(transport);
        return;
    }

    const tx = GetUnitX(transport.unit);
    const ty = GetUnitY(transport.unit);
    const nav = portData.navPoints[transport.epasCurrentIndex];
    const dist = distanceBetween(tx, ty, nav.x, nav.y);

    if (dist < EPAS_ARRIVAL_THRESHOLD) {
        // Arrived at current nav point
        if (transport.epasCurrentIndex === transport.epasExitIndex) {
            // Reached exit — done
            this.deactivateEPAS(transport);
            return;
        }

        // Advance to next valid nav point
        const nextIndex = this.advanceNavPoint(transport);
        if (nextIndex === -1) {
            // No valid nav points remaining — abort
            this.deactivateEPAS(transport);
            return;
        }

        transport.epasCurrentIndex = nextIndex;
        const nextNav = portData.navPoints[nextIndex];
        transport.isScriptOrdering = true;
        IssuePointOrder(transport.unit, 'move', nextNav.x, nextNav.y);
        transport.isScriptOrdering = false;

    } else if (GetUnitCurrentOrder(transport.unit) !== 851986) {
        // 851986 = order("move") — re-issue if order got interrupted
        transport.isScriptOrdering = true;
        IssuePointOrder(transport.unit, 'move', nav.x, nav.y);
        transport.isScriptOrdering = false;
    }
}
```

### 7.6 advanceNavPoint()

```ts
private advanceNavPoint(transport: Transport): number {
    const navPoints = transport.epasPortData!.navPoints;
    const dir = transport.epasDirection;
    const exitIndex = transport.epasExitIndex;
    let idx = transport.epasCurrentIndex;

    for (let steps = 0; steps < NAV_POINT_COUNT; steps++) {
        idx = ((idx + dir) % NAV_POINT_COUNT + NAV_POINT_COUNT) % NAV_POINT_COUNT;

        if (idx === exitIndex) {
            // Reached exit — return it regardless of validity
            // (if exit is valid, we navigate to it; if invalid, caller will deactivate)
            return navPoints[idx].valid ? idx : -1;
        }

        if (navPoints[idx].valid) {
            return idx;
        }
        // Skip invalid — continue to next
    }

    return -1;  // wrapped all the way around
}
```

### 7.7 deactivateEPAS()

```ts
private deactivateEPAS(transport: Transport): void {
    transport.epasActive = false;
    transport.epasPortData = null;

    // Resume original patrol movement
    const destX = transport.epasOriginalDestX;
    const destY = transport.epasOriginalDestY;

    transport.isScriptOrdering = true;
    IssuePointOrder(transport.unit, 'move', destX, destY);
    transport.isScriptOrdering = false;
}
```

### 7.8 Helpers

```ts
function findNearestValidNavPoint(navPoints: NavPoint[], x: number, y: number): number {
	let bestIndex = -1;
	let bestDist = Infinity;

	for (const np of navPoints) {
		if (!np.valid) continue;
		const d = distanceBetween(x, y, np.x, np.y);
		if (d < bestDist) {
			bestDist = d;
			bestIndex = np.index;
		}
	}
	return bestIndex;
}

function hasValidPath(navPoints: NavPoint[], entryIndex: number, exitIndex: number, direction: number): boolean {
	let idx = entryIndex;
	for (let steps = 0; steps < NAV_POINT_COUNT; steps++) {
		idx = (((idx + direction) % NAV_POINT_COUNT) + NAV_POINT_COUNT) % NAV_POINT_COUNT;
		if (idx === exitIndex) return true;
		if (navPoints[idx].valid) return true;
	}
	return false;
}

function distanceBetween(x1: number, y1: number, x2: number, y2: number): number {
	const dx = x1 - x2;
	const dy = y1 - y2;
	return SquareRoot(dx * dx + dy * dy);
}
```

---

## 8. Edge Cases & Notes

### 8.1 Transport Already Inside Attack Range

If a transport is already inside a port's attack range when the trigger fires, the ray-circle exit math still works — the exit point is computed correctly regardless of how far inside the circle the transport is.

### 8.2 Port Ownership Changes Mid-EPAS

If a port changes from enemy to allied during EPAS, the transport simply completes its remaining nav points and resumes normal patrol. This is harmless — a brief detour with no negative effect.

### 8.3 Transport Heading Away from Port

If the transport enters the detection zone while heading **away** from the port (e.g. it's already past the port and drifting out), the dot-product check (`dot ≤ 0`) prevents EPAS from activating. The transport naturally exits the zone on its own.

### 8.4 Transport Heading Directly Through Port Center

When the facing direction points exactly at the port center, the cross product = 0. The tie-breaker defaults to CW (`direction = -1`). The arc will be ~180° — a semicircle around one side.

### 8.5 Destination Is On the Other Side of the Port

This is the most common case (e.g., Morocco → Ireland through Portugal). The facing direction naturally points through or near the port, producing roughly a semicircular path. The exit nav point lands on the far side of the ring.

### 8.6 Near-Tangent Heading

If the transport's heading barely clips the edge of the danger circle, the entry and exit nav points are close together. Only a few nav points are traversed. This is correct — only a small adjustment is needed.

### 8.7 All Nav Points Over Land

If all 12 nav points for a port are `valid = false` (extremely coastal port fully surrounded by terrain), `findNearestValidNavPoint()` returns -1 and EPAS skips activation entirely. The transport proceeds normally.

### 8.8 Consecutive Invalid Nav Points (Gap)

When stepping through the ring, several consecutive nav points may be invalid (e.g. a land peninsula). The `advanceNavPoint()` function skips all invalid points in the traversal direction. If no valid point is found before the exit index — and the exit itself is invalid — EPAS deactivates and resumes normal patrol.

### 8.9 Transport Inside Range at Patrol Start

If a transport starts patrolling while already inside an enemy port's detection radius, the `TriggerRegisterUnitInRange` trigger may not fire (WC3 requires crossing the boundary). In this case, EPAS simply won't activate and the transport will path normally. This is an accepted edge case — the transport was already inside the danger zone before patrols began.

### 8.10 Multiple Enemy Ports Close Together

Since EPAS only handles one port at a time (`epasActive` is checked on entry), if a transport exits one port's zone and immediately enters another's, EPAS activates again for the new port. If two detection zones overlap, the first trigger to fire wins — the transport navigates around that port, and the second trigger is ignored while EPAS is active.

### 8.11 Guard Unit Dies During Navigation

If the port guard dies while EPAS is active, the transport completes its current arc and resumes patrol. There's no mid-EPAS cancellation based on guard status — the avoidance route is already committed.

---

## 9. Testing Plan

1. **Basic avoidance:** Set up a ferry route that passes through a single enemy port. Verify transport navigates around it via nav points.
2. **Allied port:** Same setup but port is allied. Verify transport passes straight through (trigger fires but filter rejects).
3. **Heading away:** Position transport inside detection zone but facing away from port. Verify EPAS does not activate (dot ≤ 0).
4. **Manual cancel:** During EPAS, issue a manual order. Verify patrol and EPAS both cancel cleanly.
5. **Port ownership change:** During EPAS, give the enemy port to the transport's owner. Verify transport completes arc without issue.
6. **Dead-center heading:** Aim transport directly at port center. Verify it picks a direction and arcs ~180°.
7. **Glancing heading:** Aim transport so it barely clips the danger circle edge. Verify small arc correction (few nav points traversed).
8. **Transport death during EPAS:** Kill the transport mid-avoidance. Verify clean state cleanup.
9. **Multiple transports:** Multiple transports patrolling through the same enemy port. Verify independent EPAS instances.
10. **Both directions:** Verify EPAS works in both `MOVING` and `RETURNING` patrol states.
11. **Nav points over land:** Test a port where several nav points are over land (invalid). Verify transport skips them and still completes the arc.
12. **All nav points invalid:** Test a port where all 12 points are over land. Verify EPAS does not activate (no valid entry point).
13. **Overlapping detection zones:** Two enemy ports with adjacent detection zones. Verify transport handles each sequentially.
14. **Guard dies mid-EPAS:** Kill the port guard while transport is mid-avoidance. Verify transport completes arc and resumes patrol.
15. **Z-height calibration:** Verify `WATER_Z_THRESHOLD` correctly distinguishes water from land across all maps (Asia, Europe, World).

---

## 10. Summary

| Component                          | Location                      | Change                                                   |
| ---------------------------------- | ----------------------------- | -------------------------------------------------------- |
| `PortData` / `NavPoint` types      | `transport-manager.ts`        | New types for port data and nav points                   |
| `AllPortData` registry             | `city-map.ts`                 | Pre-built array of `PortData` for all port cities        |
| `initializeEPAS()`                 | `transport-manager.ts`        | Build PortData, compute nav points, register triggers    |
| `onPortRangeEnter()`               | `transport-manager.ts`        | Event callback: filter + activate EPAS                   |
| `activateEPAS()`                   | `transport-manager.ts`        | Compute entry/exit/direction, store state, issue move    |
| `handleEPAS()`                     | `transport-manager.ts`        | Follow nav points each tick                              |
| `advanceNavPoint()`                | `transport-manager.ts`        | Step to next valid nav point, skip invalids              |
| `deactivateEPAS()`                 | `transport-manager.ts`        | Clean up and resume patrol                               |
| `findNearestValidNavPoint()`       | `transport-manager.ts`        | Helper: find nearest valid nav point to coordinates      |
| `hasValidPath()`                   | `transport-manager.ts`        | Helper: verify path exists between entry and exit        |
| `Transport` type                   | `transport-manager.ts`        | Add EPAS fields (epasPortData, indices, direction, etc.) |
| `TransportManager.add()`           | `transport-manager.ts`        | Initialize EPAS fields                                   |
| `TransportManager.handlePatrol()`  | `transport-manager.ts`        | Check `epasActive` in MOVING/RETURNING cases             |
| `TransportManager.stopPatrol()`    | `transport-manager.ts`        | Clear EPAS state                                         |
| `TransportManager.onDeath()`       | `transport-manager.ts`        | Clear EPAS state                                         |
| `ConcreteCountryBuilder.addCity()` | `concrete-country-builder.ts` | Register port cities in `AllPortCities`                  |
