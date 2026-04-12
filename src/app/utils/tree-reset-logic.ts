/**
 * Pure tree-reset logic extracted for testing.
 *
 * Operates on plain data without WC3 engine dependencies so these
 * functions can be exercised under Vitest.
 */

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

/**
 * Minimal representation of a destructable tree used for reset decisions.
 */
export interface TreeState {
	/** Unique identifier for the tree (e.g. handle id or array index). */
	id: number;
	/** Current life of the tree (0 = dead). */
	life: number;
	/** Maximum life of the tree. */
	maxLife: number;
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/**
 * Returns only the trees that need to be restored (life below maximum).
 * This covers both fully-dead trees (life === 0) and damaged-but-alive trees.
 *
 * Used to validate which trees in a tracked set actually need resetting.
 */
export function filterDamagedOrDeadTrees(trackedTrees: TreeState[]): TreeState[] {
	return trackedTrees.filter((t) => t.life < t.maxLife);
}

/**
 * Counts how many trees in the tracked set require a life restore.
 */
export function countTreesNeedingReset(trackedTrees: TreeState[]): number {
	return filterDamagedOrDeadTrees(trackedTrees).length;
}

// ---------------------------------------------------------------------------
// Batch computation
// ---------------------------------------------------------------------------

/**
 * Splits an array of items into sequential batches of at most `batchSize`.
 * The final batch may be smaller than `batchSize`.
 *
 * Used to determine how many WC3 `DestructableRestoreLife` calls are made
 * per timer tick so the game doesn't stutter.
 */
export function computeBatches<T>(items: T[], batchSize: number): T[][] {
	if (batchSize <= 0) return [];
	const batches: T[][] = [];
	for (let i = 0; i < items.length; i += batchSize) {
		batches.push(items.slice(i, i + batchSize));
	}
	return batches;
}

/**
 * Returns the total number of batches required to process `itemCount` items
 * with the given `batchSize`.
 */
export function batchCount(itemCount: number, batchSize: number): number {
	if (batchSize <= 0 || itemCount <= 0) return 0;
	return Math.ceil(itemCount / batchSize);
}

/**
 * Estimates the number of timer ticks (waits) needed to process all items.
 * The last batch does not require a wait so the count is `batches - 1`.
 */
export function timerTicksRequired(itemCount: number, batchSize: number): number {
	const batches = batchCount(itemCount, batchSize);
	return Math.max(0, batches - 1);
}
