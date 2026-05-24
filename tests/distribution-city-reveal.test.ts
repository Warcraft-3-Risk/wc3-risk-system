/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import './game-simulation/helpers/wc3-integration-shim';

const settingsMock = vi.hoisted(() => ({
	isFogOff: false,
}));

const playerManagerMock = vi.hoisted(() => ({
	players: new Map<any, any>(),
}));

vi.mock('src/app/settings/settings-context', () => ({
	SettingsContext: {
		getInstance: () => ({
			isFogOff: () => settingsMock.isFogOff,
		}),
	},
}));

vi.mock('src/app/player/player-manager', () => ({
	PlayerManager: {
		getInstance: () => playerManagerMock,
	},
}));

vi.mock('src/app/game/services/shared-slot-manager', () => ({
	SharedSlotManager: {
		getInstance: () => ({
			incrementUnitCount: vi.fn(),
			getOwnerOfUnit: (unitHandle: any) => unitHandle.owner,
		}),
	},
}));

vi.mock('src/app/utils/debug-print', () => ({
	debugPrint: vi.fn(),
}));

vi.mock('src/app/utils/wait', () => ({
	Wait: {
		forSeconds: vi.fn(() => Promise.resolve()),
	},
}));

import { CityToCountry } from 'src/app/country/country-map';
import { GlobalGameData } from 'src/app/game/state/global-game-state';
import { StandardDistributionService } from 'src/app/game/services/distribution-service/standard-distribution-service';

describe('StandardDistributionService city reveal', () => {
	let ownerPlayer: any;
	let otherPlayer: any;
	let ownerActivePlayer: any;
	let otherActivePlayer: any;
	let city: any;

	class TestDistributionService extends StandardDistributionService {
		protected async distribute(): Promise<void> {
			this.changeCityOwner(city, ownerActivePlayer);
		}
	}

	beforeEach(() => {
		vi.restoreAllMocks();
		settingsMock.isFogOff = false;
		CityToCountry.clear();
		GlobalGameData.resetInstance();

		ownerPlayer = Player(0);
		otherPlayer = Player(1);
		ownerActivePlayer = makeActivePlayer(ownerPlayer);
		otherActivePlayer = makeActivePlayer(otherPlayer);
		playerManagerMock.players = new Map([
			[ownerPlayer, ownerActivePlayer],
			[otherPlayer, otherActivePlayer],
		]);
		GlobalGameData.prepareMatchData([ownerActivePlayer, otherActivePlayer]);

		city = makeCity();
		const otherCity = makeCity();
		const country = { getCities: () => [city, otherCity] };
		CityToCountry.set(city, country as any);
		CityToCountry.set(otherCity, country as any);

		(globalThis as any).IssueImmediateOrder = vi.fn();
		(globalThis as any).SetUnitInvulnerable = vi.fn();
		(globalThis as any).UnitShareVision = vi.fn();
	});

	it('shares and releases each distributed city component for every match player while fog is enabled', async () => {
		await runDistribution();

		const expectedTrueCalls = [
			[city.barrack.unit, ownerPlayer, true],
			[city.cop, ownerPlayer, true],
			[city.guard.unit, ownerPlayer, true],
			[city.barrack.unit, otherPlayer, true],
			[city.cop, otherPlayer, true],
			[city.guard.unit, otherPlayer, true],
		];
		const expectedFalseCalls = [
			[city.barrack.unit, ownerPlayer, false],
			[city.barrack.unit, otherPlayer, false],
			[city.cop, ownerPlayer, false],
			[city.cop, otherPlayer, false],
			[city.guard.unit, ownerPlayer, false],
			[city.guard.unit, otherPlayer, false],
		];

		expect((globalThis as any).UnitShareVision).toHaveBeenCalledTimes(12);
		expect((globalThis as any).UnitShareVision.mock.calls.slice(0, 6)).toEqual(expectedTrueCalls);
		expect((globalThis as any).UnitShareVision.mock.calls.slice(6)).toEqual(expectedFalseCalls);
	});

	it('does not share city vision when fog is off', async () => {
		settingsMock.isFogOff = true;

		await runDistribution();

		expect((globalThis as any).UnitShareVision).not.toHaveBeenCalled();
	});

	function runDistribution(): Promise<void> {
		return new Promise((resolve) => {
			new TestDistributionService().runDistro(resolve);
		});
	}

	function makeActivePlayer(playerHandle: player): any {
		return {
			getPlayer: () => playerHandle,
			trackedData: {
				countries: new Map(),
				cities: { cities: [] },
				units: new Set(),
			},
		};
	}

	function makeCity(): any {
		const barrackUnit = { owner: undefined };
		const cop = { owner: undefined };
		const guardUnit = { owner: undefined };

		return {
			barrack: { unit: barrackUnit },
			cop,
			guard: {
				unit: guardUnit,
				reposition: vi.fn(),
			},
			setOwner: vi.fn((playerHandle: player) => {
				barrackUnit.owner = playerHandle;
				cop.owner = playerHandle;
			}),
			refreshColorFilter: vi.fn(),
		};
	}
});
