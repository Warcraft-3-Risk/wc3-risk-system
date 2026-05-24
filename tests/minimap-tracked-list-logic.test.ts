import { describe, it, expect, beforeEach } from 'vitest';
import { MinimapTrackedList } from '../src/app/utils/minimap-tracked-list-logic';

describe('MinimapTrackedList', () => {
	let list: MinimapTrackedList<string, string, string>;

	beforeEach(() => {
		list = new MinimapTrackedList<string, string, string>();
	});

	it('adds single unit and frame', () => {
		list.addTrackedUnit('unit1', 'frame1', 'owner1');

		expect(list.trackedUnitList).toHaveLength(1);
		expect(list.trackedUnitList[0]).toBe('unit1');
		expect(list.trackedFrameList[0]).toBe('frame1');
		expect(list.trackedRawOwnerList[0]).toBe('owner1');
		expect(list.trackedUnitIndex.get('unit1')).toBe(0);
	});

	it('ignores duplicate unit additions', () => {
		list.addTrackedUnit('unit1', 'frame1', 'owner1');
		list.addTrackedUnit('unit1', 'frame2', 'owner1'); // duplicate unit

		expect(list.trackedUnitList).toHaveLength(1);
		expect(list.trackedFrameList[0]).toBe('frame1'); // Keeps the original frame
	});

	it('removes unit at index 0 (swap-pop)', () => {
		list.addTrackedUnit('unit1', 'frame1', 'owner1');
		list.addTrackedUnit('unit2', 'frame2', 'owner2');
		list.addTrackedUnit('unit3', 'frame3', 'owner3');

		const removedFrame = list.removeTrackedAt(0);

		expect(removedFrame).toBe('frame1');

		// Assert structure
		expect(list.trackedUnitList).toHaveLength(2);

		// unit3 should have swapped to index 0
		expect(list.trackedUnitList[0]).toBe('unit3');
		expect(list.trackedFrameList[0]).toBe('frame3');
		expect(list.trackedRawOwnerList[0]).toBe('owner3');
		expect(list.trackedUnitIndex.get('unit3')).toBe(0);

		// unit2 should remain untouched
		expect(list.trackedUnitList[1]).toBe('unit2');
		expect(list.trackedUnitIndex.get('unit2')).toBe(1);

		// unit1 should be gone
		expect(list.trackedUnitIndex.has('unit1')).toBe(false);
	});

	it('removes last unit in the list (pop without swap consequences)', () => {
		list.addTrackedUnit('unit1', 'frame1', 'owner1');
		list.addTrackedUnit('unit2', 'frame2', 'owner2');

		const removedFrame = list.removeTrackedAt(1);

		expect(removedFrame).toBe('frame2');
		expect(list.trackedUnitList).toHaveLength(1);
		expect(list.trackedUnitList[0]).toBe('unit1');
		expect(list.trackedUnitIndex.has('unit2')).toBe(false);
		expect(list.trackedUnitIndex.get('unit1')).toBe(0);
	});

	it('returns undefined if removing an out-of-bounds index', () => {
		list.addTrackedUnit('unit1', 'frame1', 'owner1');

		const removedNegative = list.removeTrackedAt(-1);
		const removedTooHigh = list.removeTrackedAt(1);
		const removedFromEmpty = new MinimapTrackedList().removeTrackedAt(0);

		expect(removedNegative).toBeUndefined();
		expect(removedTooHigh).toBeUndefined();
		expect(removedFromEmpty).toBeUndefined();
	});

	it('removes by unit reference', () => {
		list.addTrackedUnit('unit1', 'frame1', 'owner1');
		list.addTrackedUnit('unit2', 'frame2', 'owner2');

		const frame = list.removeTrackedUnit('unit1');

		expect(frame).toBe('frame1');
		expect(list.trackedUnitList).toHaveLength(1);
		expect(list.trackedUnitList[0]).toBe('unit2');
		expect(list.trackedUnitIndex.get('unit2')).toBe(0);
	});

	it('returns undefined if removing a unit that does not exist', () => {
		list.addTrackedUnit('unit1', 'frame1', 'owner1');

		const frame = list.removeTrackedUnit('missing-unit');

		expect(frame).toBeUndefined();
		expect(list.trackedUnitList).toHaveLength(1); // List untouched
	});

	it('clears all entries', () => {
		list.addTrackedUnit('unit1', 'frame1', 'owner1');
		list.addTrackedUnit('unit2', 'frame2', 'owner2');

		list.clear();

		expect(list.trackedUnitList).toHaveLength(0);
		expect(list.trackedFrameList).toHaveLength(0);
		expect(list.trackedRawOwnerList).toHaveLength(0);
		expect(list.trackedUnitIndex.size).toBe(0);
	});
});
