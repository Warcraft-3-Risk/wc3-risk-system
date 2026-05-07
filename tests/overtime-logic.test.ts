import { describe, it, expect } from 'vitest';
import {
	isOvertimeEnabled,
	isOvertimeActive,
	getTurnCountPostOvertime,
	getTurnsUntilOvertimeIsActivated,
} from 'src/app/managers/overtime-logic';

describe('Overtime Logic', () => {
	it('should return false for isOvertimeEnabled when no setting is provided', () => {
		expect(isOvertimeEnabled(undefined)).toBe(false);
	});

	it('should return true for isOvertimeEnabled when a setting is provided', () => {
		expect(isOvertimeEnabled(10)).toBe(true);
	});

	it('should properly calculate active status based on turn data', () => {
		expect(isOvertimeActive(5, 10)).toBe(false);
		expect(isOvertimeActive(10, 10)).toBe(true);
		expect(isOvertimeActive(15, 10)).toBe(true);
	});

	it('should calculate post overtime turns correctly', () => {
		expect(getTurnCountPostOvertime(15, 10)).toBe(5);
	});

	it('should calculate turns until overtime correctly', () => {
		expect(getTurnsUntilOvertimeIsActivated(8, 10)).toBe(2);
	});
});
