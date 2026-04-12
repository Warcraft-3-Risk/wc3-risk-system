import { describe, it, expect } from 'vitest';
import {
	filterDamagedOrDeadTrees,
	countTreesNeedingReset,
	computeBatches,
	batchCount,
	timerTicksRequired,
	type TreeState,
} from '../src/app/utils/tree-reset-logic';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTree(id: number, life: number, maxLife: number): TreeState {
	return { id, life, maxLife };
}

// ---------------------------------------------------------------------------
// filterDamagedOrDeadTrees
// ---------------------------------------------------------------------------

describe('filterDamagedOrDeadTrees', () => {
	it('returns empty array when no trees are tracked', () => {
		expect(filterDamagedOrDeadTrees([])).toEqual([]);
	});

	it('returns a dead tree (life === 0)', () => {
		const dead = makeTree(1, 0, 100);
		expect(filterDamagedOrDeadTrees([dead])).toEqual([dead]);
	});

	it('returns a damaged-but-alive tree (0 < life < maxLife)', () => {
		const damaged = makeTree(2, 40, 100);
		expect(filterDamagedOrDeadTrees([damaged])).toEqual([damaged]);
	});

	it('excludes a tree at full health (life === maxLife)', () => {
		const healthy = makeTree(3, 100, 100);
		expect(filterDamagedOrDeadTrees([healthy])).toEqual([]);
	});

	it('handles a mix of healthy, damaged, and dead trees', () => {
		const healthy = makeTree(1, 100, 100);
		const damaged = makeTree(2, 50, 100);
		const dead = makeTree(3, 0, 100);

		const result = filterDamagedOrDeadTrees([healthy, damaged, dead]);
		expect(result).toHaveLength(2);
		expect(result).toContain(damaged);
		expect(result).toContain(dead);
		expect(result).not.toContain(healthy);
	});

	it('returns all trees when all are damaged', () => {
		const trees = [makeTree(1, 10, 100), makeTree(2, 0, 100), makeTree(3, 99, 100)];
		expect(filterDamagedOrDeadTrees(trees)).toHaveLength(3);
	});

	it('returns no trees when all are healthy', () => {
		const trees = [makeTree(1, 100, 100), makeTree(2, 200, 200), makeTree(3, 50, 50)];
		expect(filterDamagedOrDeadTrees(trees)).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// countTreesNeedingReset
// ---------------------------------------------------------------------------

describe('countTreesNeedingReset', () => {
	it('returns 0 for an empty list', () => {
		expect(countTreesNeedingReset([])).toBe(0);
	});

	it('counts only damaged or dead trees', () => {
		const trees = [
			makeTree(1, 100, 100), // healthy
			makeTree(2, 0, 100), // dead
			makeTree(3, 50, 100), // damaged
		];
		expect(countTreesNeedingReset(trees)).toBe(2);
	});

	it('returns 0 when all trees are healthy', () => {
		const trees = [makeTree(1, 100, 100), makeTree(2, 50, 50)];
		expect(countTreesNeedingReset(trees)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// computeBatches
// ---------------------------------------------------------------------------

describe('computeBatches', () => {
	it('returns empty array for empty input', () => {
		expect(computeBatches([], 10)).toEqual([]);
	});

	it('returns empty array when batchSize is 0', () => {
		expect(computeBatches([1, 2, 3], 0)).toEqual([]);
	});

	it('splits items evenly into batches', () => {
		const items = [1, 2, 3, 4, 5, 6];
		const result = computeBatches(items, 2);
		expect(result).toEqual([
			[1, 2],
			[3, 4],
			[5, 6],
		]);
	});

	it('puts the remainder in the last batch', () => {
		const items = [1, 2, 3, 4, 5];
		const result = computeBatches(items, 2);
		expect(result).toEqual([[1, 2], [3, 4], [5]]);
	});

	it('returns a single batch when all items fit in one batch', () => {
		const items = [1, 2, 3];
		const result = computeBatches(items, 10);
		expect(result).toEqual([[1, 2, 3]]);
	});

	it('returns one batch per item when batchSize is 1', () => {
		const items = [10, 20, 30];
		const result = computeBatches(items, 1);
		expect(result).toEqual([[10], [20], [30]]);
	});

	it('does not mutate the source array', () => {
		const items = [1, 2, 3];
		computeBatches(items, 2);
		expect(items).toEqual([1, 2, 3]);
	});
});

// ---------------------------------------------------------------------------
// batchCount
// ---------------------------------------------------------------------------

describe('batchCount', () => {
	it('returns 0 for zero items', () => {
		expect(batchCount(0, 100)).toBe(0);
	});

	it('returns 0 for zero batchSize', () => {
		expect(batchCount(100, 0)).toBe(0);
	});

	it('returns 1 when items fit in a single batch', () => {
		expect(batchCount(50, 100)).toBe(1);
	});

	it('returns exact count when items divide evenly', () => {
		expect(batchCount(100, 10)).toBe(10);
	});

	it('rounds up when items do not divide evenly', () => {
		expect(batchCount(101, 100)).toBe(2);
	});

	it('handles typical tree count scenario: 500 trees, batch 100', () => {
		expect(batchCount(500, 100)).toBe(5);
	});
});

// ---------------------------------------------------------------------------
// timerTicksRequired
// ---------------------------------------------------------------------------

describe('timerTicksRequired', () => {
	it('returns 0 for zero items', () => {
		expect(timerTicksRequired(0, 100)).toBe(0);
	});

	it('returns 0 for one batch (last batch never needs a wait)', () => {
		expect(timerTicksRequired(50, 100)).toBe(0);
	});

	it('returns batches - 1 for multiple batches', () => {
		// 500 items / 100 per batch = 5 batches → 4 waits
		expect(timerTicksRequired(500, 100)).toBe(4);
	});

	it('returns 0 when batchSize is 0 (no batches)', () => {
		expect(timerTicksRequired(100, 0)).toBe(0);
	});

	it('counts correctly for non-divisible counts', () => {
		// 101 items / 100 per batch = 2 batches → 1 wait
		expect(timerTicksRequired(101, 100)).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Integration: snapshot-and-clear pattern simulation
// ---------------------------------------------------------------------------

describe('Integration: snapshot-and-clear reset pattern', () => {
	it('does not reprocess trees whose reset overlaps with new damage events', () => {
		// Simulate the snapshot taken at start of reset()
		const tracked = new Set<TreeState>();
		const damaged1 = makeTree(1, 0, 100);
		const damaged2 = makeTree(2, 50, 100);
		tracked.add(damaged1);
		tracked.add(damaged2);

		// Take snapshot (mirrors reset() in TreeManager)
		const snapshot = Array.from(tracked);
		tracked.clear();

		// While processing, a new tree is damaged
		const newlyDamaged = makeTree(3, 10, 100);
		tracked.add(newlyDamaged);

		// Snapshot should only contain the original two
		expect(snapshot).toHaveLength(2);
		expect(snapshot).toContain(damaged1);
		expect(snapshot).toContain(damaged2);

		// Tracking set should hold the new damage for the next round
		expect(tracked.size).toBe(1);
		expect(tracked.has(newlyDamaged)).toBe(true);
	});

	it('processes zero trees when none were damaged', () => {
		const tracked = new Set<TreeState>();

		const snapshot = Array.from(tracked);
		tracked.clear();

		const batches = computeBatches(snapshot, 100);
		expect(batches).toHaveLength(0);
	});
});
