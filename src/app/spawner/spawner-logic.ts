/**
 * Pure spawn-step logic extracted for testing.
 *
 * Operates on plain data without WC3 engine dependencies so these
 * functions can be exercised under Vitest.
 */

/**
 * How many new units a spawner should produce in a single step.
 *
 * @param currentCount  - Number of units the player already has alive from this spawner.
 * @param maxPerPlayer  - Cap on units per player (after multiplier).
 * @param perStep       - Max units to emit in one step (after multiplier).
 * @returns The number of units to create this step (0 if cap is already met).
 */
export function computeSpawnAmount(currentCount: number, maxPerPlayer: number, perStep: number): number {
	if (currentCount >= maxPerPlayer) return 0;
	return Math.min(perStep, maxPerPlayer - currentCount);
}
