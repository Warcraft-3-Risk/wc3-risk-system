import { describe, it, expect } from 'vitest';
import {
	filterDamagedOrDeadTrees,
	countTreesNeedingReset,
	computeBatches,
	batchCount,
	timerTicksRequired,
	distanceSq,
	selectNearbyTreeIds,
	drainHitQueue,
	type TreeState,
	type TreePosition,
	type HitPosition,
} from '../src/app/utils/tree-reset-logic';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTree(id: number, life: number, maxLife: number): TreeState {
	return { id, life, maxLife };
}

function makePos(id: number, x: number, y: number): TreePosition {
	return { id, x, y };
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
// distanceSq
// ---------------------------------------------------------------------------

describe('distanceSq', () => {
	it('returns 0 for identical points', () => {
		expect(distanceSq(5, 5, 5, 5)).toBe(0);
	});

	it('returns correct squared distance for axis-aligned points', () => {
		// distance = 3  →  3² = 9
		expect(distanceSq(0, 0, 3, 0)).toBe(9);
		expect(distanceSq(0, 0, 0, 3)).toBe(9);
	});

	it('returns correct squared distance for diagonal', () => {
		// 3-4-5 triangle → distance = 5, distanceSq = 25
		expect(distanceSq(0, 0, 3, 4)).toBe(25);
	});

	it('is symmetric', () => {
		expect(distanceSq(1, 2, 5, 6)).toBe(distanceSq(5, 6, 1, 2));
	});
});

// ---------------------------------------------------------------------------
// selectNearbyTreeIds
// ---------------------------------------------------------------------------

describe('selectNearbyTreeIds', () => {
	it('returns empty array when there are no trees', () => {
		expect(selectNearbyTreeIds([], 0, 0, 300)).toEqual([]);
	});

	it('returns empty array when radius is 0', () => {
		const trees = [makePos(1, 100, 100)];
		expect(selectNearbyTreeIds(trees, 100, 100, 0)).toEqual([]);
	});

	it('includes a tree exactly at the origin when radius covers it', () => {
		const trees = [makePos(1, 0, 0)];
		expect(selectNearbyTreeIds(trees, 0, 0, 300)).toEqual([1]);
	});

	it('includes trees within the radius', () => {
		// Trees at distance 100 and 200 from origin; radius 250 → both included
		const trees = [makePos(1, 100, 0), makePos(2, 200, 0)];
		const result = selectNearbyTreeIds(trees, 0, 0, 250);
		expect(result).toContain(1);
		expect(result).toContain(2);
	});

	it('excludes trees outside the radius', () => {
		// Tree at distance 400, radius 300 → excluded
		const trees = [makePos(1, 400, 0)];
		expect(selectNearbyTreeIds(trees, 0, 0, 300)).toEqual([]);
	});

	it('includes a tree exactly on the radius boundary', () => {
		// distance = 300 exactly; 300² = 90000 ≤ 300² = 90000
		const trees = [makePos(1, 300, 0)];
		expect(selectNearbyTreeIds(trees, 0, 0, 300)).toEqual([1]);
	});

	it('excludes trees just outside the radius', () => {
		const trees = [makePos(1, 301, 0)];
		expect(selectNearbyTreeIds(trees, 0, 0, 300)).toEqual([]);
	});

	it('handles mixed in-range and out-of-range trees', () => {
		const trees = [
			makePos(1, 0, 0), // center — in range
			makePos(2, 150, 150), // distance ≈ 212 — in range
			makePos(3, 250, 250), // distance ≈ 354 — out of range
		];
		const result = selectNearbyTreeIds(trees, 0, 0, 300);
		expect(result).toContain(1);
		expect(result).toContain(2);
		expect(result).not.toContain(3);
	});

	it('works with a non-origin center', () => {
		// Center at (500, 500), tree at (600, 500) → distance 100, radius 200 → included
		const trees = [makePos(1, 600, 500), makePos(2, 800, 500)]; // distances 100 and 300
		const result = selectNearbyTreeIds(trees, 500, 500, 200);
		expect(result).toContain(1);
		expect(result).not.toContain(2);
	});

	it('handles negative coordinates correctly', () => {
		const trees = [makePos(1, -100, 0), makePos(2, -400, 0)];
		const result = selectNearbyTreeIds(trees, 0, 0, 300);
		expect(result).toContain(1);
		expect(result).not.toContain(2);
	});

	it('uses the typical AoE scan radius of 300', () => {
		// Simulates scanning around a mortar/artillery attack impact
		const trees = [
			makePos(10, 0, 0), // exactly at impact — included
			makePos(11, 200, 0), // within AoE — included
			makePos(12, 350, 0), // outside AoE — excluded
		];
		const result = selectNearbyTreeIds(trees, 0, 0, 300);
		expect(result).toHaveLength(2);
		expect(result).toContain(10);
		expect(result).toContain(11);
	});
});

// ---------------------------------------------------------------------------
// drainHitQueue
// ---------------------------------------------------------------------------

describe('drainHitQueue', () => {
	it('returns empty array for an empty queue', () => {
		const queue: HitPosition[] = [];
		expect(drainHitQueue(queue)).toEqual([]);
	});

	it('returns all positions and empties the source queue', () => {
		const queue: HitPosition[] = [
			{ x: 100, y: 200 },
			{ x: 300, y: 400 },
		];
		const result = drainHitQueue(queue);
		expect(result).toEqual([
			{ x: 100, y: 200 },
			{ x: 300, y: 400 },
		]);
		expect(queue).toHaveLength(0);
	});

	it('allows new items to accumulate after drain', () => {
		const queue: HitPosition[] = [{ x: 10, y: 20 }];
		drainHitQueue(queue);
		expect(queue).toHaveLength(0);

		queue.push({ x: 50, y: 60 });
		expect(queue).toHaveLength(1);
	});

	it('returns a snapshot that is independent of the original queue', () => {
		const queue: HitPosition[] = [{ x: 1, y: 2 }];
		const snapshot = drainHitQueue(queue);
		queue.push({ x: 3, y: 4 });
		expect(snapshot).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Integration: queue-to-tree-set pipeline
// ---------------------------------------------------------------------------

describe('Integration: queue-to-tree-set pipeline', () => {
	it('drains positions and selects nearby trees into a set (deduplication)', () => {
		const queue: HitPosition[] = [
			{ x: 0, y: 0 },
			{ x: 10, y: 10 }, // overlapping with first — same trees in range
		];

		const allTrees: TreePosition[] = [
			makePos(1, 5, 5), // near both hits
			makePos(2, 250, 0), // near first hit
			makePos(3, 500, 500), // far from both
		];

		const positions = drainHitQueue(queue);
		const treeSet = new Set<number>();
		for (const pos of positions) {
			for (const id of selectNearbyTreeIds(allTrees, pos.x, pos.y, 300)) {
				treeSet.add(id);
			}
		}

		// Tree 1 was near both hits but appears only once in the set
		expect(treeSet.size).toBe(2);
		expect(treeSet.has(1)).toBe(true);
		expect(treeSet.has(2)).toBe(true);
		expect(treeSet.has(3)).toBe(false);
		expect(queue).toHaveLength(0);
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
