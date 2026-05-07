import { describe, it, expect } from 'vitest';
import {
	estimateNativeCallsPerTick,
	estimateCallsPerSecond,
	shouldUpdateCityColor,
	estimateSavingsWithDirtyFlag,
	suggestUpdateFrequency,
	CALLS_PER_CITY,
	CALLS_PER_UNIT,
} from '../src/app/utils/minimap-update-loop-logic';

// ─── estimateNativeCallsPerTick ─────────────────────────────────────

describe('estimateNativeCallsPerTick', () => {
	it('200 cities + 600 units → ~5,800 calls/tick', () => {
		const calls = estimateNativeCallsPerTick(200, 600);
		expect(calls).toBe(200 * CALLS_PER_CITY + 600 * CALLS_PER_UNIT); // 1000 + 4800 = 5800
	});

	it('200 cities + 1,000 units → ~9,000 calls/tick', () => {
		const calls = estimateNativeCallsPerTick(200, 1000);
		expect(calls).toBe(200 * CALLS_PER_CITY + 1000 * CALLS_PER_UNIT); // 1000 + 8000 = 9000
	});

	it('zero tracked units: only city cost remains', () => {
		const calls = estimateNativeCallsPerTick(200, 0);
		expect(calls).toBe(200 * CALLS_PER_CITY); // 1000
	});

	it('includes dead unit cleanup cost', () => {
		const calls = estimateNativeCallsPerTick(200, 600, 10);
		expect(calls).toBe(200 * 5 + 600 * 8 + 10 * 3); // 1000 + 4800 + 30 = 5830
	});

	it('zero cities, 500 units', () => {
		expect(estimateNativeCallsPerTick(0, 500)).toBe(500 * CALLS_PER_UNIT);
	});

	it('both zero: no cost', () => {
		expect(estimateNativeCallsPerTick(0, 0)).toBe(0);
	});
});

// ─── estimateCallsPerSecond ─────────────────────────────────────────

describe('estimateCallsPerSecond', () => {
	it('at 10 ticks/sec: 5,800 calls/tick → 58,000 calls/sec', () => {
		expect(estimateCallsPerSecond(5800, 10)).toBe(58000);
	});

	it('at 10 ticks/sec: 9,000 calls/tick → 90,000 calls/sec', () => {
		expect(estimateCallsPerSecond(9000, 10)).toBe(90000);
	});

	it('at 5 ticks/sec (0.2s interval): half the load', () => {
		expect(estimateCallsPerSecond(5800, 5)).toBe(29000);
	});

	it('at 3.3 ticks/sec (0.3s interval): one-third the load', () => {
		const result = estimateCallsPerSecond(9000, 3.3);
		expect(result).toBeCloseTo(29700, -1);
	});
});

// ─── shouldUpdateCityColor (dirty-flag) ─────────────────────────────

describe('shouldUpdateCityColor', () => {
	it('returns false when nothing changed (skip update)', () => {
		expect(shouldUpdateCityColor(1, 1, false, false)).toBe(false);
	});

	it('returns true when owner changed', () => {
		expect(shouldUpdateCityColor(2, 1, false, false)).toBe(true);
	});

	it('returns true when ally mode toggled', () => {
		expect(shouldUpdateCityColor(1, 1, true, false)).toBe(true);
	});

	it('returns true when fog visibility changed', () => {
		expect(shouldUpdateCityColor(1, 1, false, true)).toBe(true);
	});

	it('returns true when multiple things changed', () => {
		expect(shouldUpdateCityColor(3, 1, true, true)).toBe(true);
	});
});

// ─── estimateSavingsWithDirtyFlag ───────────────────────────────────

describe('estimateSavingsWithDirtyFlag', () => {
	it('all 200 cities unchanged: saves ~10,000 calls/sec', () => {
		const savings = estimateSavingsWithDirtyFlag(200, 0, 10);
		expect(savings).toBe(200 * CALLS_PER_CITY * 10); // 10,000
	});

	it('10 of 200 cities changed: saves 9,500 calls/sec', () => {
		const savings = estimateSavingsWithDirtyFlag(200, 10, 10);
		expect(savings).toBe(190 * CALLS_PER_CITY * 10); // 9,500
	});

	it('ally mode toggle: all 200 cities dirty, saves nothing', () => {
		const savings = estimateSavingsWithDirtyFlag(200, 200, 10);
		expect(savings).toBe(0);
	});

	it('5 Hz tick rate: savings scale down proportionally', () => {
		const savings = estimateSavingsWithDirtyFlag(200, 0, 5);
		expect(savings).toBe(200 * CALLS_PER_CITY * 5); // 5,000
	});
});

// ─── suggestUpdateFrequency ─────────────────────────────────────────

describe('suggestUpdateFrequency', () => {
	it('with 200 units + 200 cities: 0.1s stays feasible within 60K budget', () => {
		const interval = suggestUpdateFrequency(200, 200, 60000);
		// callsPerTick = 200*5 + 200*8 = 2600
		// maxTicks = 60000 / 2600 ≈ 23 → interval ≈ 0.043s
		// Clamped to 0.043s (within [0.03, 1.0])
		expect(interval).toBeLessThanOrEqual(0.1);
		expect(interval).toBeGreaterThanOrEqual(0.03);
	});

	it('with 1,000 units: suggests longer interval', () => {
		const interval = suggestUpdateFrequency(1000, 200, 60000);
		// callsPerTick = 200*5 + 1000*8 = 9000
		// maxTicks = 60000 / 9000 ≈ 6.67 → interval ≈ 0.15s
		expect(interval).toBeGreaterThan(0.1);
	});

	it('with 2,000 units: interval extends further', () => {
		const interval = suggestUpdateFrequency(2000, 200, 60000);
		// callsPerTick = 200*5 + 2000*8 = 17000
		// maxTicks = 60000 / 17000 ≈ 3.5 → interval ≈ 0.28s
		expect(interval).toBeGreaterThan(0.2);
	});

	it('zero units: defaults to fast interval', () => {
		const interval = suggestUpdateFrequency(0, 200, 60000);
		// Only city cost: 200*5 = 1000 → maxTicks = 60 → interval = 0.017 → clamped to 0.03
		expect(interval).toBe(0.03);
	});

	it('interval never exceeds 1.0s', () => {
		// Extreme scenario: 10,000 units, tiny budget
		const interval = suggestUpdateFrequency(10000, 200, 1000);
		expect(interval).toBe(1.0);
	});

	it('interval never goes below 0.03s', () => {
		// Tiny unit count, huge budget
		const interval = suggestUpdateFrequency(1, 1, 1000000);
		expect(interval).toBe(0.03);
	});
});
