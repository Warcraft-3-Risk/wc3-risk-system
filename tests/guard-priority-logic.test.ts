import { describe, it, expect } from 'vitest';
import {
	compareByValue,
	compareByHealth,
	selectBestGuard,
	type GuardCandidate,
	type GuardSettings,
} from '../src/app/utils/guard-priority-logic';

// ─── Helpers ────────────────────────────────────────────────────────

function unit(id: number, pointValue: number, health: number): GuardCandidate {
	return { id, pointValue, health };
}

const MAXIMIZE: GuardSettings = { value: true, health: true };
const MINIMIZE: GuardSettings = { value: false, health: false };
const MAX_VALUE_MIN_HEALTH: GuardSettings = { value: true, health: false };
const MIN_VALUE_MAX_HEALTH: GuardSettings = { value: false, health: true };

// ─── compareByValue ─────────────────────────────────────────────────

describe('compareByValue', () => {
	it('returns compare when initial is null', () => {
		const a = unit(1, 10, 100);
		expect(compareByValue(a, null, MAXIMIZE)).toBe(a);
	});

	it('returns initial when compare is null', () => {
		const a = unit(1, 10, 100);
		expect(compareByValue(null, a, MAXIMIZE)).toBe(a);
	});

	it('returns initial when both are same reference', () => {
		const a = unit(1, 10, 100);
		expect(compareByValue(a, a, MAXIMIZE)).toBe(a);
	});

	it('returns null when both are null', () => {
		expect(compareByValue(null, null, MAXIMIZE)).toBeNull();
	});

	describe('maximize mode (value=true)', () => {
		it('picks higher-value unit', () => {
			const cheap = unit(1, 5, 100);
			const expensive = unit(2, 20, 100);
			expect(compareByValue(expensive, cheap, MAXIMIZE)).toBe(expensive);
		});

		it('keeps initial when compare has lower value', () => {
			const cheap = unit(1, 5, 100);
			const expensive = unit(2, 20, 100);
			expect(compareByValue(cheap, expensive, MAXIMIZE)).toBe(expensive);
		});
	});

	describe('minimize mode (value=false)', () => {
		it('picks lower-value unit', () => {
			const cheap = unit(1, 5, 100);
			const expensive = unit(2, 20, 100);
			expect(compareByValue(cheap, expensive, MINIMIZE)).toBe(cheap);
		});

		it('keeps initial when compare has higher value', () => {
			const cheap = unit(1, 5, 100);
			const expensive = unit(2, 20, 100);
			expect(compareByValue(expensive, cheap, MINIMIZE)).toBe(cheap);
		});
	});

	describe('equal value — falls through to health tiebreaker', () => {
		it('maximize health: picks healthier unit', () => {
			const damaged = unit(1, 10, 50);
			const healthy = unit(2, 10, 100);
			expect(compareByValue(healthy, damaged, MAXIMIZE)).toBe(healthy);
		});

		it('minimize health: picks more damaged unit', () => {
			const damaged = unit(1, 10, 50);
			const healthy = unit(2, 10, 100);
			expect(compareByValue(damaged, healthy, MINIMIZE)).toBe(damaged);
		});
	});

	describe('shared slot scenario — settings should come from city owner', () => {
		it('all candidates compared with same settings regardless of owner', () => {
			// Simulates Bug 3: units from different shared slots (different actual owners)
			// but all should be compared using the CITY OWNER's settings.
			const cityOwnerSettings: GuardSettings = { value: false, health: true }; // minimize value, maximize health

			const tank = unit(1, 50, 200); // expensive tank (owned by shared slot A)
			const infantry = unit(2, 10, 150); // cheap infantry (owned by shared slot B)
			const militia = unit(3, 5, 180); // cheapest militia (owned by shared slot C)

			// With minimize-value settings, the cheapest unit should win
			let best = compareByValue(infantry, tank, cityOwnerSettings);
			best = compareByValue(militia, best, cityOwnerSettings);
			expect(best).toBe(militia);
		});

		it('tank should NOT be guard when city owner prefers minimize', () => {
			const settings: GuardSettings = { value: false, health: false };
			const tank = unit(1, 50, 200);
			const rifleman = unit(2, 10, 100);

			const result = compareByValue(tank, rifleman, settings);
			expect(result).toBe(rifleman); // rifleman is cheaper, should be preferred
		});
	});
});

// ─── compareByHealth ────────────────────────────────────────────────

describe('compareByHealth', () => {
	it('returns compare when initial is null', () => {
		const a = unit(1, 10, 100);
		expect(compareByHealth(a, null, MAXIMIZE)).toBe(a);
	});

	it('returns initial when compare is null', () => {
		const a = unit(1, 10, 100);
		expect(compareByHealth(null, a, MAXIMIZE)).toBe(a);
	});

	it('returns initial when both are same reference', () => {
		const a = unit(1, 10, 100);
		expect(compareByHealth(a, a, MAXIMIZE)).toBe(a);
	});

	it('maximize health: picks healthier unit', () => {
		const damaged = unit(1, 10, 50);
		const healthy = unit(2, 10, 100);
		expect(compareByHealth(healthy, damaged, MAXIMIZE)).toBe(healthy);
	});

	it('minimize health: picks more damaged unit', () => {
		const damaged = unit(1, 10, 50);
		const healthy = unit(2, 10, 100);
		expect(compareByHealth(damaged, healthy, MINIMIZE)).toBe(damaged);
	});

	it('returns initial when health is equal', () => {
		const a = unit(1, 10, 100);
		const b = unit(2, 10, 100);
		expect(compareByHealth(b, a, MAXIMIZE)).toBe(a);
	});
});

// ─── selectBestGuard ────────────────────────────────────────────────

describe('selectBestGuard', () => {
	it('returns null for empty array', () => {
		expect(selectBestGuard([], MAXIMIZE)).toBeNull();
	});

	it('returns the only candidate when array has one element', () => {
		const a = unit(1, 10, 100);
		expect(selectBestGuard([a], MAXIMIZE)).toBe(a);
	});

	it('picks highest value in maximize mode', () => {
		const candidates = [unit(1, 5, 100), unit(2, 20, 80), unit(3, 15, 90)];
		expect(selectBestGuard(candidates, MAXIMIZE)).toBe(candidates[1]); // value=20
	});

	it('picks lowest value in minimize mode', () => {
		const candidates = [unit(1, 15, 100), unit(2, 20, 80), unit(3, 5, 90)];
		expect(selectBestGuard(candidates, MINIMIZE)).toBe(candidates[2]); // value=5
	});

	it('uses health tiebreaker when values are equal — maximize', () => {
		const candidates = [unit(1, 10, 50), unit(2, 10, 100), unit(3, 10, 75)];
		expect(selectBestGuard(candidates, MAXIMIZE)).toBe(candidates[1]); // health=100
	});

	it('uses health tiebreaker when values are equal — minimize', () => {
		const candidates = [unit(1, 10, 100), unit(2, 10, 50), unit(3, 10, 75)];
		expect(selectBestGuard(candidates, MINIMIZE)).toBe(candidates[1]); // health=50
	});

	it('handles mixed value+health settings', () => {
		// maximize value, minimize health
		const candidates = [unit(1, 20, 100), unit(2, 20, 50), unit(3, 10, 30)];
		// Both id=1 and id=2 have highest value (20), tiebreaker is minimize health → id=2
		expect(selectBestGuard(candidates, MAX_VALUE_MIN_HEALTH)).toBe(candidates[1]);
	});

	it('handles minimize value, maximize health', () => {
		const candidates = [unit(1, 5, 50), unit(2, 5, 100), unit(3, 20, 200)];
		// Candidates 0 and 1 have lowest value (5), tiebreaker is maximize health → id=2
		expect(selectBestGuard(candidates, MIN_VALUE_MAX_HEALTH)).toBe(candidates[1]);
	});

	it('simulates shared slot bug — all units compared with city owner settings', () => {
		// 5 units across 3 shared slots, city owner wants minimize value
		const candidates = [
			unit(1, 50, 200), // tank (slot A)
			unit(2, 10, 150), // rifleman (slot B)
			unit(3, 5, 180), // militia (slot C)
			unit(4, 30, 100), // knight (slot A)
			unit(5, 5, 120), // militia2 (slot B)
		];

		const cityOwnerSettings: GuardSettings = { value: false, health: true };
		const best = selectBestGuard(candidates, cityOwnerSettings);
		// Cheapest units are militia (value=5): id=3 (hp=180) vs id=5 (hp=120)
		// With maximize health tiebreaker, militia id=3 wins
		expect(best).toBe(candidates[2]);
	});

	it('large group — 24 candidates', () => {
		const candidates: GuardCandidate[] = [];
		for (let i = 0; i < 24; i++) {
			candidates.push(unit(i, (i * 7 + 3) % 50, 50 + i * 10));
		}
		const best = selectBestGuard(candidates, MAXIMIZE);
		expect(best).toBeDefined();

		// Verify it actually is the max
		const maxValue = Math.max(...candidates.map((c) => c.pointValue));
		expect(best!.pointValue).toBe(maxValue);
	});
});

// ─── Cross-Owner Shared Slot Scenarios ──────────────────────────────
//
// These tests model Bug 3: guard priority must use the CITY OWNER's
// settings for all candidates, regardless of which shared slot each
// unit physically lives on.

describe('guard priority across shared slots', () => {
	it('mixed-owner group: city owner prefers cheap → cheapest unit wins', () => {
		// City is owned by Player 0 who wants minimise value
		const cityOwnerSettings: GuardSettings = { value: false, health: true };

		// Units from 3 different shared slots
		const slotA_tank = unit(1, 50, 200); // expensive
		const slotB_infantry = unit(2, 10, 150); // mid
		const slotC_militia = unit(3, 5, 180); // cheapest

		const best = selectBestGuard([slotA_tank, slotB_infantry, slotC_militia], cityOwnerSettings);
		expect(best).toBe(slotC_militia);
	});

	it('mixed-owner group: city owner prefers expensive → most expensive wins', () => {
		const cityOwnerSettings: GuardSettings = { value: true, health: true };

		const slotA_tank = unit(1, 50, 200);
		const slotB_infantry = unit(2, 10, 150);
		const slotC_militia = unit(3, 5, 180);

		const best = selectBestGuard([slotA_tank, slotB_infantry, slotC_militia], cityOwnerSettings);
		expect(best).toBe(slotA_tank);
	});

	it('tank on shared slot vs infantry on main slot: city owner minimize → infantry wins', () => {
		const cityOwnerSettings: GuardSettings = { value: false, health: false };

		const mainSlot_infantry = unit(1, 10, 100); // cheaper, on main slot
		const sharedSlot_tank = unit(2, 50, 200); // expensive, on shared slot

		const best = selectBestGuard([mainSlot_infantry, sharedSlot_tank], cityOwnerSettings);
		expect(best).toBe(mainSlot_infantry); // City owner wants cheap → infantry
	});

	it('tank on shared slot vs infantry on main slot: city owner maximize → tank wins', () => {
		const cityOwnerSettings: GuardSettings = { value: true, health: true };

		const mainSlot_infantry = unit(1, 10, 100);
		const sharedSlot_tank = unit(2, 50, 200);

		const best = selectBestGuard([mainSlot_infantry, sharedSlot_tank], cityOwnerSettings);
		expect(best).toBe(sharedSlot_tank); // City owner wants expensive → tank
	});

	it('all units same logical owner but different slots — behaves identically', () => {
		// All 3 units belong to same player but distributed across shared slots
		const settings: GuardSettings = { value: true, health: true };

		const onSlot0 = unit(1, 30, 150);
		const onSlot1 = unit(2, 30, 200); // same value, higher health
		const onSlot2 = unit(3, 30, 100);

		const best = selectBestGuard([onSlot0, onSlot1, onSlot2], settings);
		expect(best).toBe(onSlot1); // highest health at same value
	});

	it('settings consistency: all candidates compared with identical settings', () => {
		// The bug: production code might use different settings per unit
		// because it looks up from unit owner instead of city owner.
		// Here we verify pure logic always uses the SAME settings for all.
		const citySettings: GuardSettings = { value: false, health: true };

		const candidates = [
			unit(1, 50, 100), // expensive
			unit(2, 10, 200), // cheap + healthy
			unit(3, 10, 50), // cheap + damaged
			unit(4, 25, 150), // mid-range
		];

		// With minimize value: candidates 2 and 3 are cheapest (value=10)
		// Tiebreaker maximize health: candidate 2 (hp=200) wins
		const best = selectBestGuard(candidates, citySettings);
		expect(best).toBe(candidates[1]);
	});

	it('demonstrates the bug: per-unit settings would give wrong answer', () => {
		// Suppose each shared slot owner has different settings (the bug)
		// Slot A owner wants maximize value, Slot B owner wants minimize value.
		// If per-unit lookup is used, comparison becomes inconsistent.

		const tank = unit(1, 50, 200); // owned by slot A
		const infantry = unit(2, 10, 150); // owned by slot B

		// Bug behavior: compare tank using slot A's settings (maximize)
		// → tank wins because it has higher value
		const buggyResult = compareByValue(infantry, tank, MAXIMIZE);
		expect(buggyResult).toBe(tank);

		// Fixed behavior: always use CITY OWNER settings (minimize)
		// → infantry wins because it has lower value
		const fixedResult = compareByValue(infantry, tank, MINIMIZE);
		expect(fixedResult).toBe(infantry);

		// These two results differ — proving the bug
		expect(buggyResult).not.toBe(fixedResult);
	});

	it('guard selection from large group with varied shared slot owners', () => {
		// 12 units spread across 4 shared slots, city owner wants minimize
		const citySettings: GuardSettings = { value: false, health: true };

		const candidates: GuardCandidate[] = [
			// Slot A units
			unit(1, 50, 200), // tank
			unit(2, 30, 180), // knight
			unit(3, 10, 160), // rifleman
			// Slot B units
			unit(4, 50, 190), // tank
			unit(5, 15, 170), // footman
			unit(6, 5, 140), // militia
			// Slot C units
			unit(7, 25, 200), // dragoon
			unit(8, 5, 190), // militia
			unit(9, 10, 130), // rifleman
			// Main slot units
			unit(10, 5, 200), // militia (best: cheapest + highest health)
			unit(11, 20, 110), // archer
			unit(12, 40, 220), // elite
		];

		const best = selectBestGuard(candidates, citySettings);
		// Cheapest units (value=5): ids 6, 8, 10
		// Health tiebreaker (maximize): id=10 (hp=200) > id=8 (hp=190) > id=6 (hp=140)
		expect(best).toBe(candidates[9]); // unit id=10
		expect(best!.pointValue).toBe(5);
		expect(best!.health).toBe(200);
	});
});
