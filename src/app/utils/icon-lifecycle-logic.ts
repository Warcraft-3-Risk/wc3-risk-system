/**
 * Pure minimap-icon lifecycle logic extracted for testing.
 *
 * These functions capture the conditions under which units should be tracked
 * on the minimap and when they should be cleaned up, without depending on
 * WC3 engine globals.
 */

export interface TrackableUnit {
	/** Integer type ID (0 means invalid/removed). */
	typeId: number;
	/** Current hit points. */
	hp: number;
	/** Whether the unit is a SPAWN type. */
	isSpawn: boolean;
	/** Whether the unit is a GUARD type. */
	isGuard: boolean;
	/** Whether the unit is alive. */
	alive: boolean;
	/** Whether the unit is loaded in a transport. */
	isLoaded: boolean;
}

/** WC3 death threshold — units with HP at or below this are considered dead. */
const DEATH_THRESHOLD = 0.405;

/**
 * Determine whether a unit should be tracked on the minimap.
 *
 * A unit is eligible if it is:
 *   - Alive
 *   - Of type SPAWN
 *   - Not a GUARD (guards are managed separately)
 *
 * @param unit - The unit to evaluate.
 * @returns `true` if the unit should be registered for minimap tracking.
 */
export function shouldTrackUnit(unit: TrackableUnit): boolean {
	if (!unit.alive) return false;
	if (!unit.isSpawn) return false;
	if (unit.isGuard) return false;
	return true;
}

/**
 * Determine whether a unit from the delayed re-track queue should be
 * re-registered on the minimap after transport unloading.
 *
 * Skip units that:
 *   - Died during the delay
 *   - Became guards during the delay
 *   - Were reloaded into another transport during the delay
 */
export function shouldRetrack(unit: TrackableUnit): boolean {
	if (!unit.alive) return false;
	if (unit.isGuard) return false;
	if (unit.isLoaded) return false;
	return true;
}

/**
 * Determine whether a tracked unit should be cleaned up (removed from tracking).
 *
 * A unit is dead/invalid when its typeId is 0 (removed from game) or
 * its HP is at or below the WC3 death threshold of 0.405.
 */
export function isUnitDead(typeId: number, hp: number): boolean {
	return typeId === 0 || hp <= DEATH_THRESHOLD;
}

/**
 * Calculate the number of frames that should be in the pool after a series
 * of register/unregister operations.
 *
 * This models the frame pool invariant:
 *   poolSize = initialPoolSize - currentlyTrackedCount
 *
 * @param initialPoolSize - Starting pool size.
 * @param registrations - Number of units registered (frames taken from pool).
 * @param unregistrations - Number of units unregistered (frames returned to pool).
 * @returns Expected pool size.
 */
export function expectedPoolSize(initialPoolSize: number, registrations: number, unregistrations: number): number {
	return initialPoolSize - registrations + unregistrations;
}

// ---------------------------------------------------------------------------
// Double-registration detection
// ---------------------------------------------------------------------------

/**
 * Determine whether registering a unit would cause a frame leak.
 *
 * If a unit is already tracked, calling `registerTrackedUnit()` again will
 * pop a new frame from the pool and overwrite the Map entry — the old
 * frame is never returned to the pool (leaked).
 *
 * @param isAlreadyTracked - Whether the unit is already in the `trackedUnits` Map.
 * @returns `true` if calling register would leak a frame.
 */
export function wouldDoubleRegister(isAlreadyTracked: boolean): boolean {
	return isAlreadyTracked;
}

/**
 * Count the number of leaked frames from cumulative register/unregister operations.
 *
 * The invariant is: `leaked = registerCalls - unregisterCalls - currentTracked`.
 * Each register allocates a frame, each unregister returns one, and
 * `currentTracked` is the number currently in use.  Any excess registers
 * that were not balanced by unregisters and are not accounted for in
 * `currentTracked` represent leaked frames.
 *
 * @param registerCalls   - Total calls to `registerTrackedUnit()`.
 * @param unregisterCalls - Total calls to `unregisterTrackedUnit()`.
 * @param currentTracked  - Units currently in `trackedUnits` Map.
 * @returns Number of leaked frames (0 = healthy).
 */
export function countLeakedFrames(registerCalls: number, unregisterCalls: number, currentTracked: number): number {
	const leaked = registerCalls - unregisterCalls - currentTracked;
	return Math.max(0, leaked);
}

/**
 * Simulate the delayed track queue processing and detect frame leaks.
 *
 * Models `TransportManager.processDelayedTrackQueue()` which calls both
 * `UnitLagManager.trackUnit()` and `MinimapIconManager.registerIfValid()`
 * for each queued unit.  If a unit is already tracked (e.g., by another
 * code path during the 0.1s delay), the double-register leaks a frame.
 *
 * @param queuedUnits - Units in the delayed track queue with their current state.
 * @returns Object with `trackedCount`, `registerCalls`, `leakedFrames`.
 */
export function simulateTransportQueueProcessing(
	queuedUnits: (TrackableUnit & { isAlreadyTracked: boolean })[]
): { trackedCount: number; registerCalls: number; leakedFrames: number } {
	let registerCalls = 0;
	let trackedCount = 0;
	const trackedSet = new Set<number>();

	for (let i = 0; i < queuedUnits.length; i++) {
		const unit = queuedUnits[i];

		// Skip invalid units (mirrors processDelayedTrackQueue guards)
		if (!shouldRetrack(unit)) continue;

		// UnitLagManager.trackUnit() → registerTrackedUnit() (no duplicate check)
		const wasTracked = unit.isAlreadyTracked || trackedSet.has(i);
		registerCalls++; // trackUnit always calls registerTrackedUnit

		// registerIfValid() — HAS duplicate check
		if (!wasTracked) {
			// First call from trackUnit already registered it, registerIfValid sees it as tracked → no-op
		}
		// But if it WAS already tracked before queue processing, trackUnit overwrites → leak

		trackedSet.add(i);
		if (!wasTracked) {
			trackedCount++;
		}
		// If wasTracked, one frame was leaked (old frame overwritten)
	}

	const leakedFrames = registerCalls - trackedCount;
	return { trackedCount, registerCalls, leakedFrames };
}
