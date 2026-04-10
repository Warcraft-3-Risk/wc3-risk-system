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
