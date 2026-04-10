import { describe, it, expect } from 'vitest';
import {
	shouldExpandPool,
	calculateExpansionSize,
	trackHighWaterMark,
	detectFrameLeak,
	shouldShrinkPool,
	simulateCombat,
} from '../src/app/utils/minimap-frame-pool-logic';

// ─── shouldExpandPool ───────────────────────────────────────────────

describe('shouldExpandPool', () => {
	it('returns true when pool is empty and frames are needed', () => {
		expect(shouldExpandPool(0, 1)).toBe(true);
	});

	it('returns true when pool has fewer frames than needed', () => {
		expect(shouldExpandPool(5, 10)).toBe(true);
	});

	it('returns false when pool has enough frames', () => {
		expect(shouldExpandPool(200, 1)).toBe(false);
	});

	it('returns false when pool exactly matches need', () => {
		expect(shouldExpandPool(1, 1)).toBe(false);
	});

	it('returns false when nothing is needed', () => {
		expect(shouldExpandPool(100, 0)).toBe(false);
	});
});

// ─── calculateExpansionSize ─────────────────────────────────────────

describe('calculateExpansionSize', () => {
	it('returns full batch when well below cap', () => {
		expect(calculateExpansionSize(2000, 200, 3000)).toBe(200);
	});

	it('returns 0 when already at cap', () => {
		expect(calculateExpansionSize(3000, 200, 3000)).toBe(0);
	});

	it('returns 0 when above cap', () => {
		expect(calculateExpansionSize(3100, 200, 3000)).toBe(0);
	});

	it('returns partial batch when close to cap', () => {
		expect(calculateExpansionSize(2900, 200, 3000)).toBe(100);
	});

	it('returns 1 when exactly 1 below cap', () => {
		expect(calculateExpansionSize(2999, 200, 3000)).toBe(1);
	});

	it('handles initial expansion from zero', () => {
		expect(calculateExpansionSize(0, 2000, 3000)).toBe(2000);
	});
});

// ─── trackHighWaterMark ─────────────────────────────────────────────

describe('trackHighWaterMark', () => {
	it('returns current when it exceeds previous', () => {
		expect(trackHighWaterMark(500, 400)).toBe(500);
	});

	it('returns previous when current is lower', () => {
		expect(trackHighWaterMark(300, 400)).toBe(400);
	});

	it('returns either when they are equal', () => {
		expect(trackHighWaterMark(400, 400)).toBe(400);
	});

	it('tracks across a combat spike', () => {
		let hwm = 0;
		hwm = trackHighWaterMark(100, hwm); // ramp up
		hwm = trackHighWaterMark(500, hwm); // peak
		hwm = trackHighWaterMark(200, hwm); // deaths
		hwm = trackHighWaterMark(800, hwm); // second peak
		hwm = trackHighWaterMark(150, hwm); // cooldown
		expect(hwm).toBe(800);
	});
});

// ─── detectFrameLeak ────────────────────────────────────────────────

describe('detectFrameLeak', () => {
	it('returns 0 in healthy state (pool + tracked = total)', () => {
		// 2000 created, 500 tracked, 1500 in pool
		expect(detectFrameLeak(1500, 500, 2000)).toBe(0);
	});

	it('detects 1 leaked frame', () => {
		// 2000 created but pool(1499) + tracked(500) = 1999 → 1 leaked
		expect(detectFrameLeak(1499, 500, 2000)).toBe(1);
	});

	it('detects multiple leaked frames', () => {
		// 2200 created, pool(1500) + tracked(600) = 2100 → 100 leaked
		expect(detectFrameLeak(1500, 600, 2200)).toBe(100);
	});

	it('returns 0 when surplus exists (impossible in real code, but safe)', () => {
		// More accounted than created — clamped to 0
		expect(detectFrameLeak(1600, 500, 2000)).toBe(0);
	});

	it('returns 0 with empty pool and all frames tracked', () => {
		expect(detectFrameLeak(0, 2000, 2000)).toBe(0);
	});

	it('models double-registration leak: each overwrites old frame', () => {
		// Start: 2000 created, 0 tracked, pool = 2000
		// Register unit A: pool = 1999, tracked = 1 (frame #1 in use)
		// Register unit A again (double!): pool = 1998, tracked = 1 (frame #2 in use, frame #1 leaked)
		// Total: 2000 created, pool = 1998, tracked = 1 → leak = 1
		expect(detectFrameLeak(1998, 1, 2000)).toBe(1);
	});
});

// ─── shouldShrinkPool ───────────────────────────────────────────────

describe('shouldShrinkPool', () => {
	it('suggests shrinking when pool exceeds minimum', () => {
		// Pool has 1800 free, minimum is 500 → can release 1300
		expect(shouldShrinkPool(1800, 200, 500)).toBe(1300);
	});

	it('suggests 0 when pool is at minimum', () => {
		expect(shouldShrinkPool(500, 200, 500)).toBe(0);
	});

	it('suggests 0 when pool is below minimum', () => {
		expect(shouldShrinkPool(300, 200, 500)).toBe(0);
	});

	it('never suggests negative shrinking', () => {
		expect(shouldShrinkPool(0, 2000, 500)).toBe(0);
	});
});

// ─── simulateCombat ─────────────────────────────────────────────────

describe('simulateCombat', () => {
	it('no events: pool stays at initial size', () => {
		const result = simulateCombat(2000, 200, 3000, [], []);
		expect(result.poolSize).toBe(2000);
		expect(result.trackedCount).toBe(0);
		expect(result.totalCreated).toBe(2000);
		expect(result.highWaterMark).toBe(0);
		expect(result.expansions).toBe(0);
	});

	it('spawns within pool capacity: no expansion', () => {
		const result = simulateCombat(2000, 200, 3000, [{ tick: 1, count: 500 }], []);
		expect(result.poolSize).toBe(1500);
		expect(result.trackedCount).toBe(500);
		expect(result.totalCreated).toBe(2000);
		expect(result.expansions).toBe(0);
	});

	it('spawns exhaust pool: triggers expansion', () => {
		const result = simulateCombat(2000, 200, 3000, [{ tick: 1, count: 2100 }], []);
		expect(result.trackedCount).toBe(2100);
		expect(result.totalCreated).toBe(2200); // 1 expansion of 200
		expect(result.expansions).toBe(1);
		expect(result.poolSize).toBe(100); // 2200 - 2100
	});

	it('deaths return frames to pool', () => {
		const result = simulateCombat(2000, 200, 3000, [{ tick: 1, count: 500 }], [{ tick: 2, count: 300 }]);
		expect(result.trackedCount).toBe(200);
		expect(result.poolSize).toBe(1800);
		expect(result.expansions).toBe(0);
	});

	it('5-minute combat scenario: pool growth stays bounded', () => {
		// 12 players, 8 units each per turn (60s), 5 turns
		// Stagger spawns across turns; deaths lag behind by 1 turn
		const spawns = [
			{ tick: 1, count: 96 }, // Turn 1: 12*8 = 96 spawned
			{ tick: 2, count: 96 }, // Turn 2
			{ tick: 3, count: 96 }, // Turn 3
			{ tick: 4, count: 96 }, // Turn 4
			{ tick: 5, count: 96 }, // Turn 5
		];
		const deaths = [
			{ tick: 2, count: 40 }, // Deaths from turn 1 combat
			{ tick: 3, count: 50 }, // Deaths from turn 2 combat
			{ tick: 4, count: 60 }, // Deaths from turn 3
			{ tick: 5, count: 50 }, // Deaths from turn 4
		];

		const result = simulateCombat(2000, 200, 3000, spawns, deaths);

		// Total spawned: 480, total deaths: 200 → ~280 net tracked
		expect(result.trackedCount).toBe(280);
		expect(result.totalCreated).toBe(2000); // No expansion needed
		expect(result.expansions).toBe(0);
		expect(result.highWaterMark).toBeLessThanOrEqual(2000);
	});

	it('pool respects max cap across multiple expansions', () => {
		// Many spawns, low cap → can't expand past 2500
		const result = simulateCombat(
			2000,
			200,
			2500,
			[
				{ tick: 1, count: 2200 }, // Exceeds pool, 1 expansion
				{ tick: 2, count: 400 }, // Exceeds again, partial expansion
			],
			[]
		);
		expect(result.totalCreated).toBeLessThanOrEqual(2500);
		// Some units may not get frames if cap is hit
		expect(result.trackedCount).toBeLessThanOrEqual(2500);
	});

	it('rapid expand/contract cycles stay within cap', () => {
		const spawns: { tick: number; count: number }[] = [];
		const deaths: { tick: number; count: number }[] = [];

		// 10 cycles of 300 spawn then 250 die
		for (let i = 0; i < 10; i++) {
			spawns.push({ tick: i * 2, count: 300 });
			deaths.push({ tick: i * 2 + 1, count: 250 });
		}

		const result = simulateCombat(2000, 200, 3000, spawns, deaths);

		// Net: 500 tracked (300-250 = 50 per cycle × 10)
		expect(result.trackedCount).toBe(500);
		expect(result.totalCreated).toBeLessThanOrEqual(3000);
	});
});
