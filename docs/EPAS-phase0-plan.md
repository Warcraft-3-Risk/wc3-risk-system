# EPAS Phase 0 — Detection-Only Execution Plan

> **Goal:** Prove the safe-radius detection mechanism works before implementing any navigation/pathing logic.  
> **Outcome:** `debugPrint` messages confirming enter/exit of enemy port safe-radius zones, and automatic resumption of the original patrol destination on exit.

---

## What Phase 0 IS

- Register a `TriggerRegisterUnitInRange` detection zone around every port city.
- When a patrolling transport **enters** the zone heading toward an enemy port → log it, store original destination, set `epasActive = true`.
- When the transport **exits** the zone (distance check in `handlePatrol`) → log it, re-issue the original patrol move order, set `epasActive = false`.
- Lots of `debugPrint` calls at every decision point to give full visibility.

## What Phase 0 is NOT

- No 12-point navigation ring / nav points.
- No CW/CCW traversal.
- No ray-circle intersection math.
- No z-height / water threshold checks.
- No actual rerouting — the transport still sails straight through the danger zone.

---

## Tasks

### Task 1 — Add EPAS Fields to the `Transport` Type

**File:** `src/app/managers/transport-manager.ts`

Add minimal EPAS tracking fields to the existing `Transport` type:

```ts
// EPAS Phase 0 fields
epasActive: boolean;
epasPortCenterX: number;
epasPortCenterY: number;
epasSafeRadius: number;
epasOriginalDestX: number;
epasOriginalDestY: number;
epasPortName: string; // for debug messages
```

Initialize all EPAS fields in `TransportManager.add()`:

```ts
epasActive: false,
epasPortCenterX: 0,
epasPortCenterY: 0,
epasSafeRadius: 0,
epasOriginalDestX: 0,
epasOriginalDestY: 0,
epasPortName: '',
```

**Debug prints:** None yet — these are just data fields.

---

### Task 2 — Create the `PortData` Structure and Build the Port Registry

**File:** `src/app/managers/transport-manager.ts` (or a new `src/app/managers/epas-manager.ts` — TBD based on preference)

Define a minimal Phase 0 `PortData`:

```ts
type PortData = {
	city: City;
	portUnit: unit; // city barrack building (detection center + owner check)
	centerX: number;
	centerY: number;
	safeRadius: number;
	enterTrigger: trigger;
	portName: string; // for debug messages
};
```

The `portUnit` is the city's barrack building (`city.barrack.unit`) — this is a permanent static unit that serves as both the center of the detection zone and the owner reference for the enemy check (`GetOwningPlayer(portUnit)`).

Build an `AllPortData: PortData[]` array. Populate it by iterating `CityToCountry.keys()` and filtering for `city.isPort()`.

**Debug prints:**

- `"[EPAS] Initializing EPAS for {portCount} port cities"`
- For each port: `"[EPAS] Registered port: {portName} at ({cx}, {cy}), safeRadius={R}"`
- `"[EPAS] EPAS initialization complete"`

---

### Task 3 — Register `TriggerRegisterUnitInRange` for Each Port

**File:** Same as Task 2.

For each `PortData`, create a trigger using `TriggerRegisterUnitInRange(trig, portUnit, safeRadius, null)` on the **port city building** (the permanent static unit).

The callback (`onPortRangeEnter`) will be wired up in Task 4.

Compute `safeRadius` using a fixed constant for the port guard attack range (all port guards have the same range):

```ts
const PORT_GUARD_ATTACK_RANGE = 600; // verify in editor
const EPAS_BUFFER = 300;
const safeRadius = PORT_GUARD_ATTACK_RANGE + EPAS_BUFFER;
```

Note: We use a constant instead of reading from the guard unit because the guard is irrelevant to this system — we only care about the port city building as a static detection center.

**Debug prints:**

- `"[EPAS] Trigger registered for port: {portName}, safeRadius={safeRadius}"`

---

### Task 4 — Implement `onPortRangeEnter()` Callback

**File:** Same as Task 2.

When any unit enters a port's safe radius, run the following filter chain. Log every check:

1. **Is it a transport?** → Look up in `TransportManager.transports`.
2. **Is patrol enabled?** → `transport.patrolEnabled === true`
3. **Is state MOVING or RETURNING?** → `transport.patrolState`
4. **Is EPAS already active?** → `transport.epasActive === false`
5. **Is port enemy?** → `IsUnitEnemy(portData.portUnit, GetOwningPlayer(transport.unit))` — checks the port city building's owner against the transport's owner.
6. **Is transport heading toward port? (dot product > 0)**

If all checks pass → activate EPAS (Task 5).

**Debug prints:**

- `"[EPAS] Unit entered range of port: {portName}"`
- `"[EPAS] >> Not a tracked transport — ignoring"`
- `"[EPAS] >> Transport not patrolling — ignoring"`
- `"[EPAS] >> Transport not in MOVING/RETURNING state (state={state}) — ignoring"`
- `"[EPAS] >> EPAS already active for this transport — ignoring"`
- `"[EPAS] >> Port is not enemy — ignoring"`
- `"[EPAS] >> Heading check: dot={dot}"`
- `"[EPAS] >> Transport heading AWAY from port — ignoring"`
- `"[EPAS] >> All checks passed — ACTIVATING EPAS for port: {portName}"`

---

### Task 5 — Implement `activateEPAS()` (Phase 0 — No Navigation)

**File:** Same as Task 2.

Store the EPAS state on the transport:

```ts
transport.epasActive = true;
transport.epasPortCenterX = portData.centerX;
transport.epasPortCenterY = portData.centerY;
transport.epasSafeRadius = portData.safeRadius;
transport.epasPortName = portData.portName;

// Save the original destination so we can resume it on exit
if (transport.patrolState === PatrolState.MOVING) {
	transport.epasOriginalDestX = transport.patrolDestX;
	transport.epasOriginalDestY = transport.patrolDestY;
} else {
	transport.epasOriginalDestX = transport.patrolOriginX;
	transport.epasOriginalDestY = transport.patrolOriginY;
}
```

**Do NOT issue any new move orders.** The transport continues on its current path. Phase 0 is detection-only.

**Debug prints:**

- `"[EPAS] ACTIVATED for port: {portName}"`
- `"[EPAS] >> Transport position: ({tx}, {ty})"`
- `"[EPAS] >> Patrol state: {MOVING|RETURNING}"`
- `"[EPAS] >> Original destination saved: ({destX}, {destY})"`
- `"[EPAS] >> Safe radius: {R}"`

---

### Task 6 — Detect Exit from Safe Radius in `handlePatrol()`

**File:** `src/app/managers/transport-manager.ts`

In the `MOVING` and `RETURNING` cases of `handlePatrol()`, add a check at the top:

```ts
if (transport.epasActive) {
	const edx = GetUnitX(transport.unit) - transport.epasPortCenterX;
	const edy = GetUnitY(transport.unit) - transport.epasPortCenterY;
	const eDist = SquareRoot(edx * edx + edy * edy);

	debugPrint(`[EPAS] Tick — dist to port ${transport.epasPortName}: ${eDist} / ${transport.epasSafeRadius}`);

	if (eDist > transport.epasSafeRadius) {
		// Exited the safe radius — deactivate and resume patrol
		deactivateEPAS(transport);
	}
	// Phase 0: fall through to normal patrol logic regardless
}
```

This is a **non-blocking** check — normal patrol logic still runs below it. The transport paths normally; we're only detecting the moment it leaves.

**Debug prints:**

- `"[EPAS] Tick — dist to port {portName}: {eDist} / {safeRadius}"` (every tick while active)
- On exit: see Task 7.

---

### Task 7 — Implement `deactivateEPAS()` (Phase 0)

**File:** Same as Task 2.

```ts
function deactivateEPAS(transport: Transport): void {
	transport.epasActive = false;

	// Resume original patrol destination
	transport.isScriptOrdering = true;
	IssuePointOrder(transport.unit, 'move', transport.epasOriginalDestX, transport.epasOriginalDestY);
	transport.isScriptOrdering = false;
}
```

**Debug prints:**

- `"[EPAS] DEACTIVATED — exited safe radius of port: {portName}"`
- `"[EPAS] >> Resuming patrol to original destination: ({destX}, {destY})"`

---

### Task 8 — Clear EPAS State on Patrol Stop / Death

**File:** `src/app/managers/transport-manager.ts`

In `stopPatrol()`, add:

```ts
transport.epasActive = false;
```

In `onDeath()` (if transport cleanup exists), ensure `epasActive` is cleared.

**Debug prints:**

- `"[EPAS] Cleared — patrol stopped or transport died"`

---

### Task 9 — Wire Up Initialization

**File:** Wherever the game initialization sequence lives (likely `TransportManager` constructor or a game-start hook).

Call the EPAS initialization function **after** all cities have been constructed (i.e., after `ConcreteCountryBuilder` has finished).

**Debug prints:**

- Already covered in Task 2/3.

---

## Execution Order

```
Task 1  →  Add EPAS fields to Transport type
Task 2  →  Create PortData type + build port registry
Task 3  →  Register range triggers for each port
Task 4  →  Implement onPortRangeEnter() with full filter chain
Task 5  →  Implement activateEPAS() (detection only, no rerouting)
Task 6  →  Add exit detection to handlePatrol()
Task 7  →  Implement deactivateEPAS() (resume original destination)
Task 8  →  Clear EPAS on stopPatrol() / death
Task 9  →  Wire up initialization in game-start sequence
```

Tasks 1–3 are foundational setup.  
Tasks 4–7 are the core detection loop.  
Tasks 8–9 are cleanup and integration.

---

## Expected Debug Output (Happy Path)

```
[EPAS] Initializing EPAS for 12 port cities
[EPAS] Registered port: Lisbon at (1200, -3400), safeRadius=900
[EPAS] Trigger registered for port: Lisbon, safeRadius=900
...
[EPAS] EPAS initialization complete

-- Transport starts patrolling, approaches enemy Lisbon --

[EPAS] Unit entered range of port: Lisbon
[EPAS] >> Heading check: dot=4523.7
[EPAS] >> All checks passed — ACTIVATING EPAS for port: Lisbon
[EPAS] ACTIVATED for port: Lisbon
[EPAS] >> Transport position: (800, -3100)
[EPAS] >> Patrol state: MOVING
[EPAS] >> Original destination saved: (1400, -5200)
[EPAS] >> Safe radius: 900

-- Each patrol tick while inside zone --

[EPAS] Tick — dist to port Lisbon: 650 / 900
[EPAS] Tick — dist to port Lisbon: 720 / 900
[EPAS] Tick — dist to port Lisbon: 880 / 900
[EPAS] Tick — dist to port Lisbon: 950 / 900

-- Exited --

[EPAS] DEACTIVATED — exited safe radius of port: Lisbon
[EPAS] >> Resuming patrol to original destination: (1400, -5200)
```

---

## Success Criteria

- [ ] Debug prints confirm triggers fire when transports enter enemy port zones.
- [ ] Debug prints confirm filters correctly reject non-transport units, allied ports, non-patrolling transports, and transports heading away.
- [ ] Debug prints show distance polling each tick while EPAS is active.
- [ ] Debug prints confirm deactivation when the transport leaves the safe radius.
- [ ] After exiting the zone, the transport continues to its original patrol destination without interruption.
- [ ] Manual player orders still cancel patrol (and EPAS) cleanly.
- [ ] Transport death clears EPAS state cleanly.

---

## Next Iteration (Phase 1)

Once Phase 0 is validated, the next iteration will layer on:

- 12-point navigation ring computation
- Z-height water/land validation of nav points
- Entry/exit point calculation (ray-circle intersection)
- CW/CCW direction selection (cross product)
- `handleEPAS()` nav-point stepping in `handlePatrol()`
- Actual rerouting of the transport around the port
