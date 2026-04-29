import { describe, it, expect } from 'vitest';
import {
	calculateCityCountWin,
	determineVictoryState,
	getOwnershipByThresholdDescending,
	findVictors,
} from 'src/app/managers/victory-logic';

describe('Victory Logic', () => {
	describe('calculateCityCountWin', () => {
		it('should calculate base city count without overtime', () => {
			// 100 cities * 0.6 ratio = 60
			expect(calculateCityCountWin(100, 0.6, false, 0, 0)).toBe(60);
		});

		it('should round up fractional city counts', () => {
			// 10 cities * 0.6 ratio = 6
			expect(calculateCityCountWin(10, 0.6, false, 0, 0)).toBe(6);
			// 7 cities * 0.6 ratio = 4.2 → 5
			expect(calculateCityCountWin(7, 0.6, false, 0, 0)).toBe(5);
		});

		it('should reduce threshold during overtime', () => {
			// 100 cities * 0.6 = 60, minus 1 modifier * 5 turns = 55
			expect(calculateCityCountWin(100, 0.6, true, 1, 5)).toBe(55);
		});

		it('should not go below 1 during extended overtime', () => {
			// 10 cities * 0.6 = 6, minus 1 * 100 turns = -94 → clamped to 1
			expect(calculateCityCountWin(10, 0.6, true, 1, 100)).toBe(1);
		});

		it('should not apply overtime if overtime is disabled', () => {
			expect(calculateCityCountWin(100, 0.6, false, 1, 5)).toBe(60);
		});

		it('should not apply overtime if turns in overtime is 0', () => {
			expect(calculateCityCountWin(100, 0.6, true, 1, 0)).toBe(60);
		});

		it('should handle large overtime modifier', () => {
			// 100 * 0.6 = 60, minus 10 * 3 = 30
			expect(calculateCityCountWin(100, 0.6, true, 10, 3)).toBe(30);
		});

		it('should handle 100% win ratio', () => {
			expect(calculateCityCountWin(50, 1.0, false, 0, 0)).toBe(50);
		});

		it('should handle small map with few cities', () => {
			// 3 cities * 0.6 = 1.8 → 2
			expect(calculateCityCountWin(3, 0.6, false, 0, 0)).toBe(2);
		});
	});

	describe('determineVictoryState', () => {
		it('should return UNDECIDED when no candidates', () => {
			expect(determineVictoryState(0)).toBe('UNDECIDED');
		});

		it('should return DECIDED when exactly one candidate', () => {
			expect(determineVictoryState(1)).toBe('DECIDED');
		});

		it('should return TIE when multiple candidates', () => {
			expect(determineVictoryState(2)).toBe('TIE');
			expect(determineVictoryState(5)).toBe('TIE');
		});
	});

	describe('getOwnershipByThresholdDescending', () => {
		const participants = [
			{ id: 'A', cityCount: 10 },
			{ id: 'B', cityCount: 30 },
			{ id: 'C', cityCount: 20 },
			{ id: 'D', cityCount: 5 },
		];

		it('should filter participants below threshold', () => {
			const result = getOwnershipByThresholdDescending(participants, 15);
			expect(result).toHaveLength(2);
			expect(result.map((p) => p.id)).toEqual(['B', 'C']);
		});

		it('should sort by city count descending', () => {
			const result = getOwnershipByThresholdDescending(participants, 0);
			expect(result.map((p) => p.id)).toEqual(['B', 'C', 'A', 'D']);
		});

		it('should include participants at exactly the threshold', () => {
			const result = getOwnershipByThresholdDescending(participants, 10);
			expect(result).toHaveLength(3);
			expect(result.map((p) => p.id)).toEqual(['B', 'C', 'A']);
		});

		it('should return empty array when no participants meet threshold', () => {
			const result = getOwnershipByThresholdDescending(participants, 100);
			expect(result).toHaveLength(0);
		});

		it('should return empty array for empty participants', () => {
			const result = getOwnershipByThresholdDescending([], 1);
			expect(result).toHaveLength(0);
		});
	});

	describe('findVictors', () => {
		it('should return the single victor with most cities above threshold', () => {
			const participants = [
				{ id: 'A', cityCount: 30, isEliminated: false },
				{ id: 'B', cityCount: 20, isEliminated: false },
				{ id: 'C', cityCount: 10, isEliminated: false },
			];
			const result = findVictors(participants, 25);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('A');
		});

		it('should return multiple victors in case of a tie', () => {
			const participants = [
				{ id: 'A', cityCount: 30, isEliminated: false },
				{ id: 'B', cityCount: 30, isEliminated: false },
				{ id: 'C', cityCount: 20, isEliminated: false },
			];
			const result = findVictors(participants, 25);
			expect(result).toHaveLength(2);
			expect(result.map((p) => p.id)).toEqual(['A', 'B']);
		});

		it('should return empty array when nobody meets threshold', () => {
			const participants = [
				{ id: 'A', cityCount: 10, isEliminated: false },
				{ id: 'B', cityCount: 5, isEliminated: false },
			];
			const result = findVictors(participants, 25);
			expect(result).toHaveLength(0);
		});

		it('should exclude eliminated players even if they have enough cities', () => {
			const participants = [
				{ id: 'A', cityCount: 30, isEliminated: true },
				{ id: 'B', cityCount: 25, isEliminated: false },
			];
			const result = findVictors(participants, 25);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('B');
		});

		it('should return empty when all qualifying players are eliminated', () => {
			const participants = [
				{ id: 'A', cityCount: 30, isEliminated: true },
				{ id: 'B', cityCount: 30, isEliminated: true },
			];
			const result = findVictors(participants, 25);
			expect(result).toHaveLength(0);
		});

		it('should handle empty participants array', () => {
			const result = findVictors([], 10);
			expect(result).toHaveLength(0);
		});

		it('should handle all players eliminated', () => {
			const participants = [
				{ id: 'A', cityCount: 50, isEliminated: true },
				{ id: 'B', cityCount: 40, isEliminated: true },
			];
			const result = findVictors(participants, 10);
			expect(result).toHaveLength(0);
		});
	});
});
