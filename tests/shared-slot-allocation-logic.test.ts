import { describe, it, expect } from 'vitest';
import {
	calculateSlotsPerPlayer,
	calculateSlotDeltas,
	selectSlotForNewUnit,
	type SlotState,
	type PlayerSlotSnapshot,
} from '../src/app/utils/shared-slot-allocation-logic';

// ---------------------------------------------------------------------------
// calculateSlotsPerPlayer
// ---------------------------------------------------------------------------

describe('calculateSlotsPerPlayer', () => {
	it('divides slots evenly', () => {
		expect(calculateSlotsPerPlayer(10, 5)).toBe(2);
	});

	it('floors fractional results', () => {
		expect(calculateSlotsPerPlayer(10, 3)).toBe(3); // 3.33… → 3
	});

	it('returns 0 when no active players', () => {
		expect(calculateSlotsPerPlayer(10, 0)).toBe(0);
	});

	it('returns total when only one player', () => {
		expect(calculateSlotsPerPlayer(12, 1)).toBe(12);
	});

	it('returns 0 when no slots available', () => {
		expect(calculateSlotsPerPlayer(0, 5)).toBe(0);
	});

	it('handles 23→11 player lobby scenario', () => {
		// 23 total player slots, 11 active players → 2 per player (1 leftover)
		expect(calculateSlotsPerPlayer(23, 11)).toBe(2);
	});

	it('handles 23→5 player scenario', () => {
		expect(calculateSlotsPerPlayer(23, 5)).toBe(4); // 4×5 = 20, 3 leftover
	});
});

// ---------------------------------------------------------------------------
// calculateSlotDeltas
// ---------------------------------------------------------------------------

describe('calculateSlotDeltas', () => {
	it('returns positive delta for players needing more slots', () => {
		const players: PlayerSlotSnapshot[] = [{ playerId: 0, slotIds: [0] }];
		const result = calculateSlotDeltas(players, 3);
		expect(result).toEqual([{ playerId: 0, delta: 2 }]);
	});

	it('returns negative delta for players with excess slots', () => {
		const players: PlayerSlotSnapshot[] = [{ playerId: 0, slotIds: [0, 1, 2, 3] }];
		const result = calculateSlotDeltas(players, 2);
		expect(result).toEqual([{ playerId: 0, delta: -2 }]);
	});

	it('returns zero delta for balanced players', () => {
		const players: PlayerSlotSnapshot[] = [{ playerId: 0, slotIds: [0, 1] }];
		const result = calculateSlotDeltas(players, 2);
		expect(result).toEqual([{ playerId: 0, delta: 0 }]);
	});

	it('handles multiple players with mixed deltas', () => {
		const players: PlayerSlotSnapshot[] = [
			{ playerId: 0, slotIds: [0, 1, 2] }, // has 3
			{ playerId: 1, slotIds: [3] }, // has 1
			{ playerId: 2, slotIds: [4, 5] }, // has 2
		];
		const result = calculateSlotDeltas(players, 2);
		expect(result).toEqual([
			{ playerId: 0, delta: -1 },
			{ playerId: 1, delta: 1 },
			{ playerId: 2, delta: 0 },
		]);
	});
});

// ---------------------------------------------------------------------------
// selectSlotForNewUnit — new unit placement
// ---------------------------------------------------------------------------

describe('selectSlotForNewUnit', () => {
	it('returns undefined for empty slot list', () => {
		expect(selectSlotForNewUnit([])).toBeUndefined();
	});

	it('picks the only slot when there is one', () => {
		const slots: SlotState[] = [{ slotId: 0, unitCount: 5 }];
		expect(selectSlotForNewUnit(slots)).toEqual({ slotId: 0, unitCount: 5 });
	});

	it('picks the slot with the fewest units', () => {
		const slots: SlotState[] = [
			{ slotId: 0, unitCount: 10 },
			{ slotId: 1, unitCount: 3 },
			{ slotId: 2, unitCount: 7 },
		];
		expect(selectSlotForNewUnit(slots)!.slotId).toBe(1);
	});

	it('picks a slot with 0 units when others have units', () => {
		const slots: SlotState[] = [
			{ slotId: 0, unitCount: 8 },
			{ slotId: 1, unitCount: 0 },
			{ slotId: 2, unitCount: 5 },
		];
		expect(selectSlotForNewUnit(slots)!.slotId).toBe(1);
	});

	it('picks one of the tied slots when multiple have the same lowest count', () => {
		const slots: SlotState[] = [
			{ slotId: 0, unitCount: 5 },
			{ slotId: 1, unitCount: 3 },
			{ slotId: 2, unitCount: 3 },
		];
		const result = selectSlotForNewUnit(slots)!;
		// "just picks any" — we verify it is one of the tied slots
		expect(result.unitCount).toBe(3);
		expect([1, 2]).toContain(result.slotId);
	});

	it('works for newly added empty slots', () => {
		// Player has 2 balanced slots (10 each) and a new empty slot
		const slots: SlotState[] = [
			{ slotId: 0, unitCount: 10 },
			{ slotId: 1, unitCount: 10 },
			{ slotId: 2, unitCount: 0 },
		];
		expect(selectSlotForNewUnit(slots)!.slotId).toBe(2);
	});

	it('naturally fills new slots first across multiple spawn cycles', () => {
		// Simulate 6 spawns: start with slots [10, 10, 0]
		const slots: SlotState[] = [
			{ slotId: 0, unitCount: 10 },
			{ slotId: 1, unitCount: 10 },
			{ slotId: 2, unitCount: 0 },
		];
		const assignedSlots: number[] = [];
		for (let i = 0; i < 6; i++) {
			const best = selectSlotForNewUnit(slots)!;
			assignedSlots.push(best.slotId);
			best.unitCount++;
		}
		// First 6 spawns should all go to slot 2 (starts at 0, reaches 6)
		// because slot 2 stays lowest until it catches up at 10
		expect(assignedSlots).toEqual([2, 2, 2, 2, 2, 2]);
		expect(slots[2].unitCount).toBe(6);
	});

	it('spreads units evenly after new slot catches up', () => {
		// Simulate 12 spawns starting from [10, 10, 0]
		const slots: SlotState[] = [
			{ slotId: 0, unitCount: 10 },
			{ slotId: 1, unitCount: 10 },
			{ slotId: 2, unitCount: 0 },
		];
		for (let i = 0; i < 12; i++) {
			const best = selectSlotForNewUnit(slots)!;
			best.unitCount++;
		}
		// After 10 spawns slot 2 catches up (10,10,10)
		// Then 2 more → one goes to first tied (slot 0 or 1), another to next
		// All slots should be within ±1 of each other
		const counts = slots.map((s) => s.unitCount);
		const min = Math.min(...counts);
		const max = Math.max(...counts);
		expect(max - min).toBeLessThanOrEqual(1);
	});

	it('handles the production scenario: player slot + shared slots', () => {
		// Player 0 (main) has 15 units, shared slot 12 has 8, shared slot 13 has 12
		const slots: SlotState[] = [
			{ slotId: 0, unitCount: 15 },
			{ slotId: 12, unitCount: 8 },
			{ slotId: 13, unitCount: 12 },
		];
		// New unit should go to slot 12 (fewest units)
		expect(selectSlotForNewUnit(slots)!.slotId).toBe(12);
	});

	it('matches getSlotWithLowestUnitCount production behaviour', () => {
		// Mirrors the production method which includes the player's own slot
		const playerSlot: SlotState = { slotId: 0, unitCount: 5 };
		const sharedSlots: SlotState[] = [
			{ slotId: 12, unitCount: 8 },
			{ slotId: 13, unitCount: 3 },
		];
		const allSlots = [playerSlot, ...sharedSlots];
		const result = selectSlotForNewUnit(allSlots)!;
		expect(result.slotId).toBe(13);
		expect(result.unitCount).toBe(3);
	});
});
