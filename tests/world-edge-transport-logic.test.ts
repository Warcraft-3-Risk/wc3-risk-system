import { describe, it, expect } from 'vitest';
import { calculateWrappedYPosition } from 'src/app/utils/world-edge-transport-logic';

describe('World Edge Transport Logic', () => {
	it('should proportionately map Y from a small height to a large height (density spread)', () => {
		const enterMinY = 0;
		const enterMaxY = 100;
		const leaveMinY = 0;
		const leaveMaxY = 1000;

		// Middle
		expect(calculateWrappedYPosition(50, enterMinY, enterMaxY, leaveMinY, leaveMaxY)).toBe(500);

		// Bottom
		expect(calculateWrappedYPosition(0, enterMinY, enterMaxY, leaveMinY, leaveMaxY)).toBe(0);

		// Top
		expect(calculateWrappedYPosition(100, enterMinY, enterMaxY, leaveMinY, leaveMaxY)).toBe(1000);
	});

	it('should proportionately map Y from a large height to a small height (density squeeze)', () => {
		const enterMinY = 1000;
		const enterMaxY = 2000;
		const leaveMinY = 50;
		const leaveMaxY = 150;

		// 25% progress
		expect(calculateWrappedYPosition(1250, enterMinY, enterMaxY, leaveMinY, leaveMaxY)).toBe(75);

		// 75% progress
		expect(calculateWrappedYPosition(1750, enterMinY, enterMaxY, leaveMinY, leaveMaxY)).toBe(125);
	});

	it('should handle entering Y out of bounds by clamping to region bounds', () => {
		const enterMinY = 100;
		const enterMaxY = 200;
		const leaveMinY = 1000;
		const leaveMaxY = 2000;

		expect(calculateWrappedYPosition(50, enterMinY, enterMaxY, leaveMinY, leaveMaxY)).toBe(1000);
		expect(calculateWrappedYPosition(500, enterMinY, enterMaxY, leaveMinY, leaveMaxY)).toBe(2000);
	});

	it('should handle zero enter height gracefully by defaulting to middle of leave height', () => {
		const enterMinY = 100;
		const enterMaxY = 100;
		const leaveMinY = 1000;
		const leaveMaxY = 2000;

		expect(calculateWrappedYPosition(100, enterMinY, enterMaxY, leaveMinY, leaveMaxY)).toBe(1500);
	});

	it('should handle negative coordinates correctly', () => {
		const enterMinY = -500;
		const enterMaxY = 500;
		const leaveMinY = -1000;
		const leaveMaxY = 0;

		// 75% progress => 250 in entering region => -250 in leaving region
		expect(calculateWrappedYPosition(250, enterMinY, enterMaxY, leaveMinY, leaveMaxY)).toBe(-250);
	});
});
