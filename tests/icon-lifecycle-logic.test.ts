import { describe, it, expect } from 'vitest';
import {
	shouldTrackUnit,
	shouldRetrack,
	isUnitDead,
	expectedPoolSize,
	wouldDoubleRegister,
	countLeakedFrames,
	simulateTransportQueueProcessing,
	type TrackableUnit,
} from '../src/app/utils/icon-lifecycle-logic';

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

// ─── Transport / Port Edge Cases ────────────────────────────────────
//
// These tests model the timing-sensitive lifecycle around port transports
// where icons can become orphaned if the delayed re-track queue and the
// frame pool interact incorrectly.

describe('transport lifecycle at ports', () => {
	it('rapid load then immediate unload: unit should be retrackable', () => {
		// Unit loads into transport → unregistered → added to delayed queue
		// Unit unloads before queue fires → should still be retrackable
		const unit = makeUnit();
		// After load, unit was unregistered. After immediate unload:
		expect(shouldRetrack(unit)).toBe(true);
		expect(shouldTrackUnit(unit)).toBe(true);
	});

	it('rapid load then immediate unload: pool accounting stays consistent', () => {
		const initial = 2000;
		// Spawn unit → register (pool: 1999)
		// Load → unregister (pool: 2000)
		// Unload → register (pool: 1999)
		// Net: 2 registers, 1 unregister
		expect(expectedPoolSize(initial, 2, 1)).toBe(1999);
	});

	it('unit dies while loaded in transport (transport destroyed at port)', () => {
		const unit = makeUnit({ alive: false, isLoaded: true });
		// Unit was unregistered when loaded. Transport dies.
		// Delayed queue fires but unit is dead → should NOT retrack
		expect(shouldRetrack(unit)).toBe(false);
		// Also should not be eligible for regular tracking
		expect(shouldTrackUnit(unit)).toBe(false);
	});

	it('unit dies while loaded — pool gets frame back and no orphan', () => {
		const initial = 2000;
		// Spawn → register (pool: 1999)
		// Load → unregister (pool: 2000)
		// Unit dies while loaded — never re-registered. Pool stays at 2000.
		expect(expectedPoolSize(initial, 1, 1)).toBe(2000);
	});

	it('multiple transports unload simultaneously at same port', () => {
		// Two transports each with 3 units unload at same tick
		// All 6 units enter delayed queue simultaneously
		const units = Array.from({ length: 6 }, () => makeUnit());
		// All should be retrackable
		expect(units.every((u) => shouldRetrack(u))).toBe(true);
		// Pool should handle 6 registrations in one batch
		const initial = 2000;
		// Before: 6 were tracked (registered), then loaded (unregistered): pool = 2000
		// After unload: 6 re-register: pool = 1994
		expect(expectedPoolSize(initial, 6, 0)).toBe(1994);
	});

	it('unit transfers between transports before delayed queue fires', () => {
		// Unit unloads from transport A → enters delayed queue
		// Before queue fires, unit loads into transport B
		const unit = makeUnit({ isLoaded: true });
		// shouldRetrack check: isLoaded = true → skip
		expect(shouldRetrack(unit)).toBe(false);
		// This prevents the orphaned icon — unit stays unregistered since it's
		// loaded again, and will get a new retrack opportunity when it unloads from B
	});

	it('guard promotion during transport delay window', () => {
		// Unit unloads from transport at port
		// Before delayed queue fires, unit becomes guard (replaces city guard)
		const unit = makeUnit({ isGuard: true });
		// shouldRetrack: isGuard → false (guards have separate icon management)
		expect(shouldRetrack(unit)).toBe(false);
		// shouldTrackUnit also rejects guards
		expect(shouldTrackUnit(unit)).toBe(false);
	});

	it('pool exhaustion during batch unload triggers expansion', () => {
		// Start with tiny pool, unload many units
		const tinyPool = 5;
		// 10 units need to register but only 5 frames available
		// After 5 registrations pool hits 0, expansion needed
		expect(expectedPoolSize(tinyPool, 5, 0)).toBe(0);
		// After expansion (+200 frames) and 5 more registrations:
		expect(expectedPoolSize(tinyPool + 200, 10, 0)).toBe(195);
	});

	it('complete port lifecycle: units load, travel, unload, some die', () => {
		const initial = 2000;
		// Phase 1: 8 units spawned and tracked
		const afterSpawn = expectedPoolSize(initial, 8, 0); // 1992
		expect(afterSpawn).toBe(1992);

		// Phase 2: 8 units load into transport → unregistered
		const afterLoad = expectedPoolSize(initial, 8, 8); // 2000
		expect(afterLoad).toBe(2000);

		// Phase 3: Transport travels to port, 6 survive, 2 die in transit
		// 6 unload → delayed queue → retrack (register 6 more)
		// 2 dead units skipped by shouldRetrack
		const afterUnload = expectedPoolSize(initial, 14, 8); // 1994
		expect(afterUnload).toBe(1994);

		// Phase 4: 2 dead unit frames already returned during load (step 2)
		// No extra action needed for dead units — frames are in pool
		// Final tracked: 6 alive units
		// Pool should be: 2000 - 6 = 1994 ✓
		expect(afterUnload).toBe(initial - 6);
	});

	it('double-unregister safety: calling unregister twice does not corrupt pool', () => {
		const initial = 2000;
		// Register 1 → pool: 1999
		// Unregister 1 → pool: 2000
		// Unregister again (bug) → pool: 2001 (surplus!)
		const afterDoubleUnregister = expectedPoolSize(initial, 1, 2);
		expect(afterDoubleUnregister).toBe(2001);
		// This detects the bug: pool should never exceed initial + expansion count
		// The test documents the invariant violation
		expect(afterDoubleUnregister).toBeGreaterThan(initial);
	});

	it('interleaved load/unload across multiple ports', () => {
		// Simulate units cycling through ports repeatedly
		const initial = 2000;
		// 4 units spawned
		// Load at port A → unregister 4
		// Unload at port B → register 4
		// Load at port B → unregister 4
		// Unload at port C → register 4
		// Net: 12 registers (4 spawn + 4 + 4), 8 unregisters (4 + 4)
		const result = expectedPoolSize(initial, 12, 8);
		expect(result).toBe(1996); // 4 currently tracked at port C
	});
});

// ─── wouldDoubleRegister ────────────────────────────────────────────

describe('wouldDoubleRegister', () => {
	it('returns true when unit is already tracked → frame would leak', () => {
		expect(wouldDoubleRegister(true)).toBe(true);
	});

	it('returns false when unit is not yet tracked → safe to register', () => {
		expect(wouldDoubleRegister(false)).toBe(false);
	});
});

// ─── countLeakedFrames ──────────────────────────────────────────────

describe('countLeakedFrames', () => {
	it('healthy state: 10 registers, 5 unregisters, 5 tracked → 0 leaks', () => {
		expect(countLeakedFrames(10, 5, 5)).toBe(0);
	});

	it('double-register leaks exactly 1 frame per occurrence', () => {
		// 11 register calls, 5 unregisters, 5 tracked → 1 leaked
		expect(countLeakedFrames(11, 5, 5)).toBe(1);
	});

	it('10 double-registers: 10 leaks', () => {
		// 20 registers, 5 unregisters, 5 tracked → 10 leaked
		expect(countLeakedFrames(20, 5, 5)).toBe(10);
	});

	it('no operations: 0 leaks', () => {
		expect(countLeakedFrames(0, 0, 0)).toBe(0);
	});

	it('all unregistered: 0 leaks', () => {
		expect(countLeakedFrames(10, 10, 0)).toBe(0);
	});
});

// ─── simulateTransportQueueProcessing ───────────────────────────────

describe('simulateTransportQueueProcessing', () => {
	function makeQueuedUnit(
		overrides: Partial<TrackableUnit & { isAlreadyTracked: boolean }> = {}
	): TrackableUnit & { isAlreadyTracked: boolean } {
		return {
			typeId: 1000,
			hp: 100,
			isSpawn: true,
			isGuard: false,
			alive: true,
			isLoaded: false,
			isAlreadyTracked: false,
			...overrides,
		};
	}

	it('3 clean units: 3 tracked, 0 leaks', () => {
		const units = [makeQueuedUnit(), makeQueuedUnit(), makeQueuedUnit()];
		const result = simulateTransportQueueProcessing(units);
		expect(result.trackedCount).toBe(3);
		expect(result.leakedFrames).toBe(0);
	});

	it('1 already-tracked unit: 1 leak', () => {
		const units = [makeQueuedUnit({ isAlreadyTracked: true })];
		const result = simulateTransportQueueProcessing(units);
		expect(result.registerCalls).toBe(1);
		expect(result.leakedFrames).toBe(1);
	});

	it('10 rapid load/unload cycles without guard: leaks accumulate', () => {
		// All 10 units are already tracked by another code path
		const units = Array.from({ length: 10 }, () => makeQueuedUnit({ isAlreadyTracked: true }));
		const result = simulateTransportQueueProcessing(units);
		expect(result.leakedFrames).toBe(10);
	});

	it('10 rapid cycles with proper guard: 0 leaks', () => {
		// None are pre-tracked → clean registrations
		const units = Array.from({ length: 10 }, () => makeQueuedUnit({ isAlreadyTracked: false }));
		const result = simulateTransportQueueProcessing(units);
		expect(result.leakedFrames).toBe(0);
		expect(result.trackedCount).toBe(10);
	});

	it('mixed queue: some alive, some dead, some reloaded', () => {
		const units = [
			makeQueuedUnit(), // valid → tracked
			makeQueuedUnit({ alive: false }), // dead → skipped
			makeQueuedUnit({ isLoaded: true }), // reloaded → skipped
			makeQueuedUnit({ isGuard: true }), // became guard → skipped
			makeQueuedUnit(), // valid → tracked
		];
		const result = simulateTransportQueueProcessing(units);
		expect(result.trackedCount).toBe(2); // only 2 valid units
		expect(result.leakedFrames).toBe(0);
	});

	it('queue processes same unit twice (simulated) — second is already tracked', () => {
		// First entry: not tracked → registers fine
		// Second entry: same logical unit, now marked as already tracked → leak
		const units = [
			makeQueuedUnit({ isAlreadyTracked: false }),
			makeQueuedUnit({ isAlreadyTracked: true }), // "same unit" queued again
		];
		const result = simulateTransportQueueProcessing(units);
		expect(result.registerCalls).toBe(2);
		expect(result.leakedFrames).toBe(1); // second call leaks
	});

	it('empty queue: nothing happens', () => {
		const result = simulateTransportQueueProcessing([]);
		expect(result.trackedCount).toBe(0);
		expect(result.registerCalls).toBe(0);
		expect(result.leakedFrames).toBe(0);
	});
});
