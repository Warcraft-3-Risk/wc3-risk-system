import { describe, it, expect } from 'vitest';
import { needsReset, computeBatches } from '../src/app/utils/tree-reset-logic';

// ---------------------------------------------------------------------------
// needsReset
// ---------------------------------------------------------------------------

describe('needsReset', () => {
	it('returns true for a dead tree (life === 0)', () => {
		expect(needsReset(0, 100)).toBe(true);
	});

	it('returns true for a damaged tree (0 < life < maxLife)', () => {
		expect(needsReset(40, 100)).toBe(true);
	});

	it('returns false for a tree at full health', () => {
		expect(needsReset(100, 100)).toBe(false);
	});

	it('returns false when life equals maxLife at an arbitrary value', () => {
		expect(needsReset(73, 73)).toBe(false);
	});

	it('returns true when life is just below maxLife', () => {
		expect(needsReset(99.9, 100)).toBe(true);
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

	it('returns empty array when batchSize is negative', () => {
		expect(computeBatches([1, 2], -5)).toEqual([]);
	});

	it('splits items evenly into batches', () => {
		expect(computeBatches([1, 2, 3, 4, 5, 6], 2)).toEqual([
			[1, 2],
			[3, 4],
			[5, 6],
		]);
	});

	it('puts the remainder in the last batch', () => {
		expect(computeBatches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
	});

	it('returns a single batch when all items fit', () => {
		expect(computeBatches([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
	});

	it('returns one item per batch when batchSize is 1', () => {
		expect(computeBatches([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
	});

	it('does not mutate the original array', () => {
		const items = [1, 2, 3, 4];
		computeBatches(items, 2);
		expect(items).toEqual([1, 2, 3, 4]);
	});
});
