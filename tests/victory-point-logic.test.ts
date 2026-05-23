import { describe, expect, it } from 'vitest';
import { calculateEffectiveCityCount, shouldAwardVictoryPoint } from 'src/app/managers/victory-point-logic';

describe('Victory Point Logic', () => {
	it('awards a point when city count is at threshold', () => {
		expect(shouldAwardVictoryPoint(70, 70)).toBe(true);
	});

	it('does not award a point when city count is below threshold', () => {
		expect(shouldAwardVictoryPoint(69, 70)).toBe(false);
	});

	it('calculates effective city count from cities plus victory points', () => {
		expect(calculateEffectiveCityCount(100, 4)).toBe(104);
	});
});
