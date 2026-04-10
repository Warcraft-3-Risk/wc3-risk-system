import { describe, it, expect } from 'vitest';
import {
	calculateSlotsPerPlayer,
	calculateSlotDeltas,
	planUnitRedistribution,
	planIncrementalSlotAddition,
	selectSlotForNewUnit,
	countOwnershipChanges,
	estimateMinimapCostOfRedistribution,
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

// ---------------------------------------------------------------------------
// planUnitRedistribution — confirms current redistribution DOES move units
// when adding a new slot (the performance problem)
// ---------------------------------------------------------------------------

describe('planUnitRedistribution — confirms unnecessary unit movement', () => {
	it('confirms units are moved when a 3rd slot is added to an already-balanced 2-slot setup', () => {
		// Player had 2 slots with 10 units each (balanced), now gets a 3rd slot.
		// Current algorithm collects all 20 units and redistributes across 3 slots.
		const units: UnitPlacement[] = [
			...Array.from({ length: 10 }, (_, i) => ({ unitId: i, currentSlotId: 0 })),
			...Array.from({ length: 10 }, (_, i) => ({ unitId: i + 10, currentSlotId: 1 })),
		];
		const slots: SlotState[] = [
			{ slotId: 0, unitCount: 10 },
			{ slotId: 1, unitCount: 10 },
			{ slotId: 2, unitCount: 0 }, // newly added
		];
		const plan = planUnitRedistribution(units, slots);
		// 20 / 3 = 6 per slot + 2 remainder → slot 0: 7, slot 1: 7, slot 2: 6
		// units[0..6] → slot 0 (first 7 stay, no-op)
		// units[7..13] → slot 1 — but units[7..9] are on slot 0, units[10..13] on slot 1
		//   units 7,8,9 (on slot 0) move to slot 1 = 3 moves
		//   units 10,11,12,13 (on slot 1) stay = 0 moves
		// units[14..19] → slot 2 — all on slot 1 → 6 moves
		// Total: at least 9 moves for units that were already balanced
		expect(plan.length).toBeGreaterThan(0);
	});

	it('confirms units are moved when a 2nd slot is added to a 1-slot player with 20 units', () => {
		const units: UnitPlacement[] = Array.from({ length: 20 }, (_, i) => ({
			unitId: i,
			currentSlotId: 0,
		}));
		const slots: SlotState[] = [
			{ slotId: 0, unitCount: 20 },
			{ slotId: 1, unitCount: 0 }, // newly added
		];
		const plan = planUnitRedistribution(units, slots);
		// 10 stay on slot 0, 10 move to slot 1 = 10 moves
		expect(plan.length).toBe(10);
	});

	it('confirms units are moved when a 4th slot is added to a player with 3 balanced slots', () => {
		// 3 slots × 10 units each. Player now gets a 4th slot.
		const units: UnitPlacement[] = [
			...Array.from({ length: 10 }, (_, i) => ({ unitId: i, currentSlotId: 0 })),
			...Array.from({ length: 10 }, (_, i) => ({ unitId: i + 10, currentSlotId: 1 })),
			...Array.from({ length: 10 }, (_, i) => ({ unitId: i + 20, currentSlotId: 2 })),
		];
		const slots: SlotState[] = [
			{ slotId: 0, unitCount: 10 },
			{ slotId: 1, unitCount: 10 },
			{ slotId: 2, unitCount: 10 },
			{ slotId: 3, unitCount: 0 }, // newly added
		];
		const plan = planUnitRedistribution(units, slots);
		// Units get redistributed: 30 / 4 = 7+7+8+8, many unnecessary moves
		expect(plan.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// planIncrementalSlotAddition — desired behaviour: no unit moves when
// slots are added
// ---------------------------------------------------------------------------

describe('planIncrementalSlotAddition', () => {
	it('returns zero moves when a new slot is added to a balanced setup', () => {
		const units: UnitPlacement[] = [
			...Array.from({ length: 10 }, (_, i) => ({ unitId: i, currentSlotId: 0 })),
			...Array.from({ length: 10 }, (_, i) => ({ unitId: i + 10, currentSlotId: 1 })),
		];
		const oldSlots: SlotState[] = [
			{ slotId: 0, unitCount: 10 },
			{ slotId: 1, unitCount: 10 },
		];
		const newSlots: SlotState[] = [...oldSlots, { slotId: 2, unitCount: 0 }];
		const plan = planIncrementalSlotAddition(units, oldSlots, newSlots);
		expect(plan).toEqual([]);
	});

	it('returns zero moves when going from 1 slot to 3 slots with 50 units', () => {
		const units: UnitPlacement[] = Array.from({ length: 50 }, (_, i) => ({
			unitId: i,
			currentSlotId: 0,
		}));
		const oldSlots: SlotState[] = [{ slotId: 0, unitCount: 50 }];
		const newSlots: SlotState[] = [
			{ slotId: 0, unitCount: 50 },
			{ slotId: 1, unitCount: 0 },
			{ slotId: 2, unitCount: 0 },
		];
		const plan = planIncrementalSlotAddition(units, oldSlots, newSlots);
		expect(plan).toEqual([]);
	});

	it('returns zero moves even when existing distribution is unbalanced', () => {
		// Slot 0 has 18 units, slot 1 has 2 — still should not redistribute
		const units: UnitPlacement[] = [
			...Array.from({ length: 18 }, (_, i) => ({ unitId: i, currentSlotId: 0 })),
			...Array.from({ length: 2 }, (_, i) => ({ unitId: i + 18, currentSlotId: 1 })),
		];
		const oldSlots: SlotState[] = [
			{ slotId: 0, unitCount: 18 },
			{ slotId: 1, unitCount: 2 },
		];
		const newSlots: SlotState[] = [...oldSlots, { slotId: 2, unitCount: 0 }];
		const plan = planIncrementalSlotAddition(units, oldSlots, newSlots);
		expect(plan).toEqual([]);
	});

	it('returns zero moves for the 23→11 player scenario', () => {
		// Each of 11 players has 2 slots with 10 units each.
		// They get a 3rd slot — no units should move.
		for (let p = 0; p < 11; p++) {
			const units: UnitPlacement[] = [
				...Array.from({ length: 10 }, (_, i) => ({ unitId: p * 100 + i, currentSlotId: p })),
				...Array.from({ length: 10 }, (_, i) => ({ unitId: p * 100 + 10 + i, currentSlotId: p + 11 })),
			];
			const oldSlots: SlotState[] = [
				{ slotId: p, unitCount: 10 },
				{ slotId: p + 11, unitCount: 10 },
			];
			const newSlots: SlotState[] = [...oldSlots, { slotId: p + 22, unitCount: 0 }];
			const plan = planIncrementalSlotAddition(units, oldSlots, newSlots);
			expect(plan).toEqual([]);
		}
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

// ---------------------------------------------------------------------------
// estimateMinimapCostOfRedistribution
// ---------------------------------------------------------------------------

describe('estimateMinimapCostOfRedistribution', () => {
	it('7 moves → 28 frame operations (4 per move)', () => {
		const units: UnitPlacement[] = Array.from({ length: 14 }, (_, i) => ({
			unitId: i,
			currentSlotId: 0,
		}));
		const slots: SlotState[] = [
			{ slotId: 0, unitCount: 14 },
			{ slotId: 1, unitCount: 0 },
		];
		const plan = planUnitRedistribution(units, slots);
		// 14 units across 2 slots = 7 per slot, 7 moves from slot 0 to slot 1
		expect(plan.length).toBe(7);
		expect(estimateMinimapCostOfRedistribution(plan)).toBe(28);
	});

	it('110 moves (23→11 scenario) → 440 frame operations', () => {
		// Simulate: 11 active players, 220 total units, all on player slot
		// Each player has 20 units on slot 0, needs 2 slots
		// Moving 10 units per player to second slot = 110 moves total
		const plan: { unitId: number; fromSlotId: number; toSlotId: number }[] = [];
		for (let i = 0; i < 110; i++) {
			plan.push({ unitId: i, fromSlotId: 0, toSlotId: 1 });
		}
		expect(estimateMinimapCostOfRedistribution(plan)).toBe(440);
	});

	it('zero moves → zero frame operations', () => {
		expect(estimateMinimapCostOfRedistribution([])).toBe(0);
	});

	it('incremental slot addition: 0 minimap cost', () => {
		const existingUnits: UnitPlacement[] = Array.from({ length: 10 }, (_, i) => ({
			unitId: i,
			currentSlotId: 0,
		}));
		const oldSlots: SlotState[] = [{ slotId: 0, unitCount: 10 }];
		const newSlots: SlotState[] = [
			{ slotId: 0, unitCount: 10 },
			{ slotId: 1, unitCount: 0 },
		];
		const plan = planIncrementalSlotAddition(existingUnits, oldSlots, newSlots);
		expect(estimateMinimapCostOfRedistribution(plan)).toBe(0);
	});
});
