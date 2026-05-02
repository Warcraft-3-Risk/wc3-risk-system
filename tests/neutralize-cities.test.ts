import { describe, it, expect, vi, beforeEach } from 'vitest';
import './fixtures/wc3-shim';

vi.mock('src/app/utils/hex-colors', () => ({ HexColors: {} }));
vi.mock('w3ts', () => ({ File: class {} }));
vi.mock('w3ts/system/file', () => ({ File: class {} }));
vi.mock('src/app/utils/wait', () => ({ Wait: { forSeconds: vi.fn() } }));

import { neutralizeCities } from 'src/app/game/game-mode/utillity/neutralize-cities';
import { CityToCountry } from 'src/app/country/country-map';
import { ORDER_ID } from 'src/configs/order-id';

describe('neutralizeCities', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		CityToCountry.clear();
	});

	it('should issue cancel order and remove guards up-front', async () => {
		const mockCancelQueue = vi.fn();
		global.IssueImmediateOrderById = mockCancelQueue;

		const mockGuardRemove = vi.fn();
		const mockCity = {
			getOwner: () => {
				return { id: 0 };
			}, // Not neutral hostile
			barrack: { unit: { id: 'barracks' } },
			guard: { unit: { id: 'guard_unit' }, remove: mockGuardRemove },
			cop: { id: 'cop_unit' },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		CityToCountry.set(mockCity, {} as any);

		await neutralizeCities(25, 0.1);

		expect(mockCancelQueue).toHaveBeenCalledWith(mockCity.barrack.unit, ORDER_ID.CANCEL);
		expect(mockGuardRemove).toHaveBeenCalled();
	});
});
