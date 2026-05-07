/**
 * Pure tree-reset logic extracted for testing.
 *
 * Operates on plain data without WC3 engine dependencies so these
 * functions can be exercised under Vitest.
 */

/**
 * Whether a tree needs its life restored during a reset pass.
 * A tree is damaged when its current life is below its maximum.
 */
export function needsReset(life: number, maxLife: number): boolean {
	return life < maxLife;
}

/**
 * Splits an array of items into sequential batches of at most `batchSize`.
 * The final batch may be smaller than `batchSize`.
 */
export function computeBatches<T>(items: T[], batchSize: number): T[][] {
	if (batchSize <= 0) return [];
	const batches: T[][] = [];
	for (let i = 0; i < items.length; i += batchSize) {
		batches.push(items.slice(i, i + batchSize));
	}
	return batches;
}
