/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import './helpers/wc3-integration-shim';

vi.mock('src/app/game/services/shared-slot-manager', () => ({
	SharedSlotManager: {
		getInstance: () => ({
			getOwnerOfUnit: (unit: any) => unit.owner,
		}),
	},
}));

vi.mock('src/app/managers/ally-color-filter-manager', () => ({
	AllyColorFilterManager: {
		getInstance: vi.fn(),
	},
}));

import { City } from 'src/app/city/city';
import { AllyColorFilterManager } from 'src/app/managers/ally-color-filter-manager';

class TestCity extends City {
	isValidGuard(): boolean {
		return true;
	}

	onUnitTrain(): void {}

	onCast(): void {}

	isPort(): boolean {
		return false;
	}

	isCapital(): boolean {
		return false;
	}
}

describe('City color filter', () => {
	let applyCityColorFilter: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		applyCityColorFilter = vi.fn();
		vi.mocked(AllyColorFilterManager.getInstance).mockReturnValue({
			applyCityColorFilter,
		} as any);
	});

	it('reapplies the city-aware color filter synchronously when ownership changes', () => {
		const owner = Player(1);
		const barrackUnit = { owner: Player(24) };
		const cop = { owner: Player(24) };
		const guardUnit = { owner };
		const barrack = {
			unit: barrackUnit,
			defaultX: 0,
			defaultY: 0,
			setOwner: vi.fn((player: player) => {
				barrackUnit.owner = player;
			}),
		};
		const guard = { unit: guardUnit };
		const city = new TestCity(barrack as any, guard as any, cop as any);

		city.setOwner(owner);

		expect(applyCityColorFilter).toHaveBeenCalledTimes(1);
		expect(applyCityColorFilter).toHaveBeenCalledWith(city);
	});
});
