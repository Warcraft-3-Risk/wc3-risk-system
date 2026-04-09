import { describe, it, expect } from 'vitest';
import {
	calculateMaxCitiesPerPlayer,
	isCityValidForPlayer,
	filterEligibleCities,
} from '../src/app/game/services/distribution-service/distribution-logic';

describe('Distribution Logic', () => {
	describe('calculateMaxCitiesPerPlayer', () => {
		it('should divide cities evenly among players', () => {
			expect(calculateMaxCitiesPerPlayer(100, 10, 22)).toBe(10);
		});

		it('should floor fractional results', () => {
			expect(calculateMaxCitiesPerPlayer(100, 7, 22)).toBe(14);
		});

		it('should respect the upper bound', () => {
			expect(calculateMaxCitiesPerPlayer(100, 2, 22)).toBe(22);
		});

		it('should return 0 when no players', () => {
			expect(calculateMaxCitiesPerPlayer(100, 0, 22)).toBe(0);
		});

		it('should handle fewer cities than players', () => {
			expect(calculateMaxCitiesPerPlayer(5, 10, 22)).toBe(0);
		});

		it('should handle equal cities and players', () => {
			expect(calculateMaxCitiesPerPlayer(10, 10, 22)).toBe(1);
		});

		it('should handle upper bound of 0', () => {
			expect(calculateMaxCitiesPerPlayer(100, 10, 0)).toBe(0);
		});
	});

	describe('isCityValidForPlayer', () => {
		it('should allow assignment when player owns no cities in the country', () => {
			expect(isCityValidForPlayer(0, 4)).toBe(true);
		});

		it('should allow assignment when player owns less than 50%', () => {
			// 4 cities in country, floor(4/2) = 2, player owns 1 → valid
			expect(isCityValidForPlayer(1, 4)).toBe(true);
		});

		it('should deny assignment when player would reach 50%', () => {
			// 4 cities in country, floor(4/2) = 2, player owns 2 → invalid
			expect(isCityValidForPlayer(2, 4)).toBe(false);
		});

		it('should deny assignment when player exceeds 50%', () => {
			expect(isCityValidForPlayer(3, 4)).toBe(false);
		});

		it('should handle odd number of country cities', () => {
			// 5 cities, floor(5/2) = 2, player owns 1 → valid
			expect(isCityValidForPlayer(1, 5)).toBe(true);
			// player owns 2 → invalid
			expect(isCityValidForPlayer(2, 5)).toBe(false);
		});

		it('should handle 2-city country', () => {
			// 2 cities, floor(2/2) = 1, player owns 0 → valid
			expect(isCityValidForPlayer(0, 2)).toBe(true);
			// player owns 1 → invalid
			expect(isCityValidForPlayer(1, 2)).toBe(false);
		});

		it('should handle large countries', () => {
			// 20 cities, floor(20/2) = 10
			expect(isCityValidForPlayer(9, 20)).toBe(true);
			expect(isCityValidForPlayer(10, 20)).toBe(false);
		});
	});

	describe('filterEligibleCities', () => {
		it('should exclude single-city countries', () => {
			const cities = [
				{ id: 1, countryCityCount: 1 },
				{ id: 2, countryCityCount: 3 },
				{ id: 3, countryCityCount: 1 },
				{ id: 4, countryCityCount: 5 },
			];
			const result = filterEligibleCities(cities);
			expect(result).toEqual([
				{ id: 2, countryCityCount: 3 },
				{ id: 4, countryCityCount: 5 },
			]);
		});

		it('should return empty array when all countries have 1 city', () => {
			const cities = [
				{ id: 1, countryCityCount: 1 },
				{ id: 2, countryCityCount: 1 },
			];
			expect(filterEligibleCities(cities)).toEqual([]);
		});

		it('should return all cities when all countries have multiple cities', () => {
			const cities = [
				{ id: 1, countryCityCount: 3 },
				{ id: 2, countryCityCount: 2 },
			];
			expect(filterEligibleCities(cities)).toHaveLength(2);
		});

		it('should return empty array for empty input', () => {
			expect(filterEligibleCities([])).toEqual([]);
		});
	});
});
