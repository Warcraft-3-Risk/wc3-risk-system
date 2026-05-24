import { describe, it, expect } from 'vitest';
import { computeSpawnAmount } from '../src/app/spawner/spawner-logic';

describe('computeSpawnAmount', () => {
	// ── regression: stale spawnMap between games ───────────────────────────────
	// If spawnMap is not cleared on reset, currentCount carries over from game 1.
	// A country at 10/10 in game 1 would yield 0 spawns in game 2 — exactly the
	// bug introduced by commit 178ac57 that removed spawn.reset() from Country.reset().

	it('returns 0 when current count equals the cap (full country — should not spawn)', () => {
		expect(computeSpawnAmount(10, 10, 3)).toBe(0);
	});

	it('returns 0 when current count exceeds the cap (stale state after hypothetical over-count)', () => {
		expect(computeSpawnAmount(12, 10, 3)).toBe(0);
	});

	it('returns perStep when there is plenty of room', () => {
		expect(computeSpawnAmount(0, 10, 3)).toBe(3);
	});

	it('returns remaining capacity when less than a full step is needed', () => {
		// 8 / 10 present, step is 3 → only 2 more needed to hit cap
		expect(computeSpawnAmount(8, 10, 3)).toBe(2);
	});

	it('returns 1 when exactly one slot is open', () => {
		expect(computeSpawnAmount(9, 10, 3)).toBe(1);
	});

	it('returns perStep when count is 0 (fresh country after reset)', () => {
		expect(computeSpawnAmount(0, 5, 2)).toBe(2);
	});

	it('handles a step size larger than the cap gracefully', () => {
		expect(computeSpawnAmount(0, 3, 10)).toBe(3);
	});
});
