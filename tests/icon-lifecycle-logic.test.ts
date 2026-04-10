import { describe, it, expect } from 'vitest';
import { shouldTrackUnit, shouldRetrack, isUnitDead, expectedPoolSize, type TrackableUnit } from '../src/app/utils/icon-lifecycle-logic';

// ─── Helpers ────────────────────────────────────────────────────────

function makeUnit(overrides: Partial<TrackableUnit> = {}): TrackableUnit {
	return {
		typeId: 1000, // non-zero = valid
		hp: 100,
		isSpawn: true,
		isGuard: false,
		alive: true,
		isLoaded: false,
		...overrides,
	};
}

// ─── shouldTrackUnit ────────────────────────────────────────────────

describe('shouldTrackUnit', () => {
	it('returns true for a valid alive SPAWN unit', () => {
		expect(shouldTrackUnit(makeUnit())).toBe(true);
	});

	it('returns false when unit is dead', () => {
		expect(shouldTrackUnit(makeUnit({ alive: false }))).toBe(false);
	});

	it('returns false when unit is not SPAWN type', () => {
		expect(shouldTrackUnit(makeUnit({ isSpawn: false }))).toBe(false);
	});

	it('returns false when unit is a GUARD', () => {
		expect(shouldTrackUnit(makeUnit({ isGuard: true }))).toBe(false);
	});

	it('returns false when unit is dead SPAWN', () => {
		expect(shouldTrackUnit(makeUnit({ alive: false, isSpawn: true }))).toBe(false);
	});

	it('returns false when unit is alive GUARD SPAWN (guard takes precedence)', () => {
		expect(shouldTrackUnit(makeUnit({ isGuard: true, isSpawn: true }))).toBe(false);
	});
});

// ─── shouldRetrack ──────────────────────────────────────────────────

describe('shouldRetrack', () => {
	it('returns true for alive non-guard non-loaded unit', () => {
		expect(shouldRetrack(makeUnit())).toBe(true);
	});

	it('returns false when unit died during delay', () => {
		expect(shouldRetrack(makeUnit({ alive: false }))).toBe(false);
	});

	it('returns false when unit became guard during delay', () => {
		expect(shouldRetrack(makeUnit({ isGuard: true }))).toBe(false);
	});

	it('returns false when unit was reloaded during delay', () => {
		expect(shouldRetrack(makeUnit({ isLoaded: true }))).toBe(false);
	});

	it('returns false when unit died AND became guard (multiple conditions)', () => {
		expect(shouldRetrack(makeUnit({ alive: false, isGuard: true }))).toBe(false);
	});

	it('returns false when unit is loaded and guard simultaneously', () => {
		expect(shouldRetrack(makeUnit({ isGuard: true, isLoaded: true }))).toBe(false);
	});
});

// ─── isUnitDead ─────────────────────────────────────────────────────

describe('isUnitDead', () => {
	it('returns true when typeId is 0 (removed from game)', () => {
		expect(isUnitDead(0, 100)).toBe(true);
	});

	it('returns true when hp is at death threshold (0.405)', () => {
		expect(isUnitDead(1000, 0.405)).toBe(true);
	});

	it('returns true when hp is below death threshold', () => {
		expect(isUnitDead(1000, 0.1)).toBe(true);
		expect(isUnitDead(1000, 0)).toBe(true);
		expect(isUnitDead(1000, -1)).toBe(true);
	});

	it('returns false when unit is alive and valid', () => {
		expect(isUnitDead(1000, 100)).toBe(false);
	});

	it('returns false when hp is just above death threshold', () => {
		expect(isUnitDead(1000, 0.406)).toBe(false);
	});

	it('returns true when both typeId is 0 AND hp is 0', () => {
		expect(isUnitDead(0, 0)).toBe(true);
	});
});

// ─── expectedPoolSize ───────────────────────────────────────────────

describe('expectedPoolSize', () => {
	it('pool unchanged when no operations', () => {
		expect(expectedPoolSize(2000, 0, 0)).toBe(2000);
	});

	it('pool shrinks with registrations', () => {
		expect(expectedPoolSize(2000, 10, 0)).toBe(1990);
	});

	it('pool grows with unregistrations', () => {
		expect(expectedPoolSize(2000, 0, 5)).toBe(2005);
	});

	it('pool returns to original after register + unregister cycle', () => {
		expect(expectedPoolSize(2000, 10, 10)).toBe(2000);
	});

	it('pool is correct after mixed operations', () => {
		expect(expectedPoolSize(2000, 50, 30)).toBe(1980);
	});

	it('frame pool accounting: load/unload lifecycle', () => {
		const initial = 2000;
		// 5 units spawn → register (pool: 2000-5=1995)
		expect(expectedPoolSize(initial, 5, 0)).toBe(1995);
		// 3 load into transport → unregister (pool: 2000-5+3=1998)
		expect(expectedPoolSize(initial, 5, 3)).toBe(1998);
		// 3 unload → register again (pool: 2000-8+3=1995)
		expect(expectedPoolSize(initial, 8, 3)).toBe(1995);
		// 2 die → cleanup → unregister (pool: 2000-8+5=1997)
		expect(expectedPoolSize(initial, 8, 5)).toBe(1997);
	});

	it('complete transport lifecycle: all units return to pool', () => {
		const initial = 2000;
		// Spawn 10 → register 10
		// Load 10 into transport → unregister 10
		// Unload 10 → register 10
		// All 10 die → unregister 10
		// Net: 20 registrations, 20 unregistrations
		expect(expectedPoolSize(initial, 20, 20)).toBe(initial);
	});

	it('orphan icon scenario: unregister called without matching register', () => {
		// This represents the bug — if unregister is somehow called extra,
		// pool gets a surplus frame back. Pool should be >= initial.
		expect(expectedPoolSize(2000, 5, 6)).toBe(2001); // one surplus frame
	});
});
