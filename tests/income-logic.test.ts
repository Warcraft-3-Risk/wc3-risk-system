import { describe, it, expect, beforeEach } from 'vitest';
import {
	applyIncome,
	updateIncomeForCountryChange,
	updateIncomeForRegionChange,
	incomeFromCountryCapture,
	incomeFromCountryLoss,
	type GoldState,
	type IncomeState,
} from '../src/app/managers/income-logic';

describe('Income Logic', () => {
	describe('incomeFromCountryCapture', () => {
		it('should return city count as income', () => {
			expect(incomeFromCountryCapture(5)).toBe(5);
		});

		it('should return 1 for single-city country', () => {
			expect(incomeFromCountryCapture(1)).toBe(1);
		});
	});

	describe('incomeFromCountryLoss', () => {
		it('should return city count as loss', () => {
			expect(incomeFromCountryLoss(5)).toBe(5);
		});
	});

	describe('applyIncome', () => {
		let goldState: GoldState;

		beforeEach(() => {
			goldState = { earned: 0, max: 0, currentGold: 0 };
		});

		it('should add income to current gold', () => {
			const newGold = applyIncome(10, 5, goldState);
			expect(newGold).toBe(15);
			expect(goldState.currentGold).toBe(15);
		});

		it('should track earned gold for positive income', () => {
			applyIncome(0, 10, goldState);
			expect(goldState.earned).toBe(10);
		});

		it('should not track earned gold for income less than 1', () => {
			applyIncome(10, 0, goldState);
			expect(goldState.earned).toBe(0);
		});

		it('should update max gold when new total exceeds current max', () => {
			goldState.max = 5;
			applyIncome(0, 10, goldState);
			expect(goldState.max).toBe(10);
		});

		it('should not update max when total is below current max', () => {
			goldState.max = 20;
			applyIncome(0, 5, goldState);
			expect(goldState.max).toBe(20);
		});

		it('should accumulate earned gold across multiple calls', () => {
			applyIncome(0, 5, goldState);
			applyIncome(5, 3, goldState);
			expect(goldState.earned).toBe(8);
		});

		it('should track max across multiple income rounds', () => {
			applyIncome(0, 10, goldState); // gold: 10, max: 10
			applyIncome(10, 5, goldState); // gold: 15, max: 15
			applyIncome(5, 2, goldState); // gold: 7, max: 15 (player spent some)
			expect(goldState.max).toBe(15);
		});
	});

	describe('updateIncomeForCountryChange', () => {
		let incomeState: IncomeState;

		beforeEach(() => {
			incomeState = { income: 4, delta: 0 };
		});

		it('should increase income when gaining a country', () => {
			updateIncomeForCountryChange(incomeState, 5, true);
			expect(incomeState.income).toBe(9);
			expect(incomeState.delta).toBe(5);
		});

		it('should decrease income when losing a country', () => {
			updateIncomeForCountryChange(incomeState, 3, false);
			expect(incomeState.income).toBe(1);
			expect(incomeState.delta).toBe(-3);
		});

		it('should accumulate delta across multiple changes', () => {
			updateIncomeForCountryChange(incomeState, 5, true); // +5
			updateIncomeForCountryChange(incomeState, 3, false); // -3
			expect(incomeState.income).toBe(6);
			expect(incomeState.delta).toBe(2);
		});

		it('should handle income going negative', () => {
			updateIncomeForCountryChange(incomeState, 10, false);
			expect(incomeState.income).toBe(-6);
		});
	});

	describe('updateIncomeForRegionChange', () => {
		let incomeState: IncomeState;

		beforeEach(() => {
			incomeState = { income: 10, delta: 0 };
		});

		it('should increase income when gaining a region', () => {
			updateIncomeForRegionChange(incomeState, 3, true);
			expect(incomeState.income).toBe(13);
			expect(incomeState.delta).toBe(3);
		});

		it('should decrease income when losing a region', () => {
			updateIncomeForRegionChange(incomeState, 3, false);
			expect(incomeState.income).toBe(7);
			expect(incomeState.delta).toBe(-3);
		});
	});
});
