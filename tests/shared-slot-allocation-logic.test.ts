import { describe, it, expect } from 'vitest';
import {
	calculateSlotsPerPlayer,
	calculateSlotDeltas,
	planUnitRedistribution,
	countOwnershipChanges,
	simulateRedistribution,
	type UnitPlacement,
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
// planUnitRedistribution
// ---------------------------------------------------------------------------

describe('planUnitRedistribution', () => {
	it('returns empty plan for no units', () => {
		const slots: SlotState[] = [{ slotId: 0, unitCount: 0 }];
		expect(planUnitRedistribution([], slots)).toEqual([]);
	});

	it('returns empty plan for no target slots', () => {
		const units: UnitPlacement[] = [{ unitId: 1, currentSlotId: 0 }];
		expect(planUnitRedistribution(units, [])).toEqual([]);
	});

	it('skips units already on the correct slot (no-op optimization)', () => {
		const units: UnitPlacement[] = [
			{ unitId: 1, currentSlotId: 0 },
			{ unitId: 2, currentSlotId: 0 },
		];
		const slots: SlotState[] = [{ slotId: 0, unitCount: 2 }];
		const plan = planUnitRedistribution(units, slots);
		expect(plan).toEqual([]); // Both already on slot 0
	});

	it('distributes units evenly across two slots', () => {
		// 4 units all on slot 0, spread to slots 0 and 1
		const units: UnitPlacement[] = [
			{ unitId: 1, currentSlotId: 0 },
			{ unitId: 2, currentSlotId: 0 },
			{ unitId: 3, currentSlotId: 0 },
			{ unitId: 4, currentSlotId: 0 },
		];
		const slots: SlotState[] = [
			{ slotId: 0, unitCount: 4 },
			{ slotId: 1, unitCount: 0 },
		];
		const plan = planUnitRedistribution(units, slots);
		// 2 per slot. First 2 stay on slot 0 (no-op), last 2 move to slot 1
		expect(plan).toHaveLength(2);
		expect(plan[0]).toEqual({ unitId: 3, fromSlotId: 0, toSlotId: 1 });
		expect(plan[1]).toEqual({ unitId: 4, fromSlotId: 0, toSlotId: 1 });
	});

	it('handles remainder distribution (+1 for first R slots)', () => {
		// 5 units across 2 slots → 3 on slot 0, 2 on slot 1
		const units: UnitPlacement[] = [
			{ unitId: 1, currentSlotId: 0 },
			{ unitId: 2, currentSlotId: 0 },
			{ unitId: 3, currentSlotId: 0 },
			{ unitId: 4, currentSlotId: 0 },
			{ unitId: 5, currentSlotId: 0 },
		];
		const slots: SlotState[] = [
			{ slotId: 0, unitCount: 5 },
			{ slotId: 1, unitCount: 0 },
		];
		const plan = planUnitRedistribution(units, slots);
		// Slot 0 gets 3 (first 3 no-op), slot 1 gets 2 (units 4,5 move)
		expect(plan).toHaveLength(2);
		expect(plan.every((p) => p.toSlotId === 1)).toBe(true);
	});

	it('distributes across three slots', () => {
		// 9 units all on slot 0, spread to 0, 1, 2 → 3 each
		const units: UnitPlacement[] = Array.from({ length: 9 }, (_, i) => ({
			unitId: i + 1,
			currentSlotId: 0,
		}));
		const slots: SlotState[] = [
			{ slotId: 0, unitCount: 9 },
			{ slotId: 1, unitCount: 0 },
			{ slotId: 2, unitCount: 0 },
		];
		const plan = planUnitRedistribution(units, slots);
		// First 3 stay on 0 (no-op), next 3 → slot 1, last 3 → slot 2
		expect(plan).toHaveLength(6);
		const toSlot1 = plan.filter((p) => p.toSlotId === 1);
		const toSlot2 = plan.filter((p) => p.toSlotId === 2);
		expect(toSlot1).toHaveLength(3);
		expect(toSlot2).toHaveLength(3);
	});

	it('handles units already spread across multiple slots', () => {
		// 4 units: 2 on slot 0, 2 on slot 1 — target: 2 per slot → no moves
		const units: UnitPlacement[] = [
			{ unitId: 1, currentSlotId: 0 },
			{ unitId: 2, currentSlotId: 0 },
			{ unitId: 3, currentSlotId: 1 },
			{ unitId: 4, currentSlotId: 1 },
		];
		const slots: SlotState[] = [
			{ slotId: 0, unitCount: 2 },
			{ slotId: 1, unitCount: 2 },
		];
		const plan = planUnitRedistribution(units, slots);
		// Unit assignment: slot 0 gets first 2 (no-op), slot 1 gets last 2
		// But units 3,4 are on slot 1 already — will they be assigned to slot 1?
		// The algorithm assigns by position: units[0,1]→slot 0, units[2,3]→slot 1
		// units 3,4 currentSlotId=1 assigned to slot 1 → no-op
		expect(plan).toHaveLength(0);
	});

	it('counts correct ownership changes for worst-case all-on-one-slot', () => {
		// 100 units all on slot 0, redistribute to 4 slots
		const units: UnitPlacement[] = Array.from({ length: 100 }, (_, i) => ({
			unitId: i + 1,
			currentSlotId: 0,
		}));
		const slots: SlotState[] = [
			{ slotId: 0, unitCount: 100 },
			{ slotId: 1, unitCount: 0 },
			{ slotId: 2, unitCount: 0 },
			{ slotId: 3, unitCount: 0 },
		];
		const plan = planUnitRedistribution(units, slots);
		// 25 per slot, first 25 stay on slot 0 → 75 moves
		expect(countOwnershipChanges(plan)).toBe(75);
	});
});

// ---------------------------------------------------------------------------
// simulateRedistribution — full pipeline
// ---------------------------------------------------------------------------

describe('simulateRedistribution', () => {
	it('23→11 player transition: quantifies ownership changes', () => {
		// Simulate: 11 active players each with 1 real slot + 1 shared slot
		// Each player has 20 units on their main slot, 0 on shared slot
		const activePlayers: PlayerSlotSnapshot[] = [];
		const unitsByPlayer = new Map<number, UnitPlacement[]>();

		for (let i = 0; i < 11; i++) {
			const mainSlotId = i;
			const sharedSlotId = 11 + i; // Shared slots are player IDs 11-21
			activePlayers.push({ playerId: i, slotIds: [mainSlotId, sharedSlotId] });

			const units: UnitPlacement[] = Array.from({ length: 20 }, (_, j) => ({
				unitId: i * 100 + j,
				currentSlotId: mainSlotId, // All units on main slot
			}));
			unitsByPlayer.set(i, units);
		}

		const result = simulateRedistribution(activePlayers, unitsByPlayer);

		// 11 players × 20 units = 220 total
		expect(result.totalUnitsProcessed).toBe(220);

		// Each player: 20 units across 2 slots → 10 per slot
		// 10 stay on main (no-op), 10 move to shared → 10 changes per player
		expect(result.totalOwnershipChanges).toBe(110); // 11 × 10

		// Verify per-player
		for (const p of result.perPlayerChanges) {
			expect(p.changes).toBe(10);
			expect(p.units).toBe(20);
		}
	});

	it('already balanced distribution results in zero changes', () => {
		const activePlayers: PlayerSlotSnapshot[] = [{ playerId: 0, slotIds: [0, 1] }];
		const unitsByPlayer = new Map<number, UnitPlacement[]>();
		unitsByPlayer.set(0, [
			{ unitId: 1, currentSlotId: 0 },
			{ unitId: 2, currentSlotId: 0 },
			{ unitId: 3, currentSlotId: 1 },
			{ unitId: 4, currentSlotId: 1 },
		]);

		const result = simulateRedistribution(activePlayers, unitsByPlayer);
		expect(result.totalOwnershipChanges).toBe(0);
	});

	it('single player with no shared slots results in zero changes', () => {
		const activePlayers: PlayerSlotSnapshot[] = [{ playerId: 0, slotIds: [0] }];
		const unitsByPlayer = new Map<number, UnitPlacement[]>();
		unitsByPlayer.set(0, [
			{ unitId: 1, currentSlotId: 0 },
			{ unitId: 2, currentSlotId: 0 },
		]);

		const result = simulateRedistribution(activePlayers, unitsByPlayer);
		expect(result.totalOwnershipChanges).toBe(0);
		expect(result.totalUnitsProcessed).toBe(2);
	});

	it('stress test: 11 players, 3 slots each, 50 units', () => {
		const activePlayers: PlayerSlotSnapshot[] = [];
		const unitsByPlayer = new Map<number, UnitPlacement[]>();

		for (let i = 0; i < 11; i++) {
			const slotIds = [i, i + 23, i + 46]; // 3 slots each
			activePlayers.push({ playerId: i, slotIds });

			// All 50 units on main slot
			const units: UnitPlacement[] = Array.from({ length: 50 }, (_, j) => ({
				unitId: i * 1000 + j,
				currentSlotId: i,
			}));
			unitsByPlayer.set(i, units);
		}

		const result = simulateRedistribution(activePlayers, unitsByPlayer);

		// 11 × 50 = 550 units
		expect(result.totalUnitsProcessed).toBe(550);

		// Each player: 50 units / 3 slots = 16+17+17
		// 17 stay on main (no-op), 16+17 = 33 move → per player
		// Actually: floor(50/3) = 16, remainder 2
		// Slot 0: 16+1=17, Slot 1: 16+1=17, Slot 2: 16 → 17+16=33 moves per player
		for (const p of result.perPlayerChanges) {
			expect(p.changes).toBe(33);
			expect(p.units).toBe(50);
		}

		expect(result.totalOwnershipChanges).toBe(11 * 33); // 363
	});

	it('handles player with no units', () => {
		const activePlayers: PlayerSlotSnapshot[] = [{ playerId: 0, slotIds: [0, 1] }];
		const unitsByPlayer = new Map<number, UnitPlacement[]>();
		// No units for player 0

		const result = simulateRedistribution(activePlayers, unitsByPlayer);
		expect(result.totalOwnershipChanges).toBe(0);
		expect(result.totalUnitsProcessed).toBe(0);
	});

	it('quantifies no-op savings vs naive approach', () => {
		// 6 units: 3 on slot 0, 3 on slot 1 → already balanced → 0 changes
		// Naive approach would move all 6 units regardless
		const activePlayers: PlayerSlotSnapshot[] = [{ playerId: 0, slotIds: [0, 1] }];
		const unitsByPlayer = new Map<number, UnitPlacement[]>();
		unitsByPlayer.set(0, [
			{ unitId: 1, currentSlotId: 0 },
			{ unitId: 2, currentSlotId: 0 },
			{ unitId: 3, currentSlotId: 0 },
			{ unitId: 4, currentSlotId: 1 },
			{ unitId: 5, currentSlotId: 1 },
			{ unitId: 6, currentSlotId: 1 },
		]);

		const result = simulateRedistribution(activePlayers, unitsByPlayer);
		expect(result.totalOwnershipChanges).toBe(0); // Optimal: zero moves
		// Naive approach would have been 6 moves (move every unit)
	});
});
