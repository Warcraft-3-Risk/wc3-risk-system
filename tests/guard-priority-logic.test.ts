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
