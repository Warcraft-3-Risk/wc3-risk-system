/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import './helpers/wc3-integration-shim';

const mocks = vi.hoisted(() => ({
	onUnitTrain: vi.fn(),
	trackUnit: vi.fn(),
	applyColorFilter: vi.fn(),
	playerManager: {
		players: new Map<any, any>(),
	},
	sharedSlotManager: {
		getOwnerOfUnit: vi.fn(),
		getSlotWithLowestUnitCount: vi.fn(),
		incrementUnitCount: vi.fn(),
	},
}));

vi.mock('w3ts', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));

vi.mock('w3ts/system/file', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));

vi.mock('../../src/app/city/city-map', () => ({
	UnitToCity: {
		get: () => ({
			onUnitTrain: mocks.onUnitTrain,
		}),
	},
}));

vi.mock('../../src/app/game/services/unit-lag-manager', () => ({
	UnitLagManager: {
		getInstance: () => ({
			trackUnit: mocks.trackUnit,
		}),
	},
}));

vi.mock('../../src/app/managers/ally-color-filter-manager', () => ({
	AllyColorFilterManager: {
		getInstance: () => ({
			applyColorFilter: mocks.applyColorFilter,
		}),
	},
}));

vi.mock('../../src/app/player/player-manager', () => ({
	PlayerManager: {
		getInstance: () => mocks.playerManager,
	},
}));

vi.mock('../../src/app/game/services/shared-slot-manager', () => ({
	SharedSlotManager: {
		getInstance: () => mocks.sharedSlotManager,
	},
}));

import { GlobalGameData } from '../../src/app/game/state/global-game-state';
import { HumanPlayer } from '../../src/app/player/types/human-player';
import { UnitTrainedEvent } from '../../src/app/triggers/unit-trained-event';
import { UNIT_TYPE } from '../../src/app/utils/unit-types';

describe('Transport tracked data lifecycle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.playerManager.players = new Map<any, any>();
		mocks.sharedSlotManager.getOwnerOfUnit.mockReset();
		mocks.sharedSlotManager.getSlotWithLowestUnitCount.mockReset();
		mocks.sharedSlotManager.incrementUnitCount.mockReset();

		GlobalGameData.resetInstance();
		GlobalGameData.prepareMatchData([]);
		GlobalGameData.matchState = 'inProgress';

		(globalThis as any).TriggerAddCondition = (_trigger: any, condition: () => boolean) => {
			condition();
		};
		(globalThis as any).GetTriggerUnit = () => ({ id: 'port-city' });
		(globalThis as any).GetOwningPlayer = (unit: any) => unit.owner;
		(globalThis as any).SetUnitOwner = (unit: any, owner: any) => {
			unit.owner = owner;
		};
		(globalThis as any).IsUnitType = (unit: any, unitType: any) => unit.typeIds?.includes(unitType) ?? false;
		(globalThis as any).ORIGIN_FRAME_GAME_UI = {};
		(globalThis as any).BlzFrameSetValue = () => {};
	});

	it('adds trained transports to the real owner transport set without counting them as survival units', () => {
		const realOwner = Player(0);
		const sharedTrainingSlot = Player(12);
		const trainedTransport = { id: 'transport', owner: sharedTrainingSlot, typeIds: [UNIT_TYPE.TRANSPORT] };
		const trackedData = { units: new Set<any>(), transports: new Set<any>() };

		mocks.sharedSlotManager.getOwnerOfUnit.mockReturnValue(realOwner);
		mocks.playerManager.players.set(realOwner, { trackedData });
		(globalThis as any).GetTrainedUnit = () => trainedTransport;

		UnitTrainedEvent();

		expect(trackedData.transports.has(trainedTransport)).toBe(true);
		expect(trackedData.units.has(trainedTransport)).toBe(false);
		expect(trainedTransport.owner).toBe(realOwner);
	});

	it('removes dead transports from the owner transport set without touching survival units', () => {
		const owner = Player(0);
		const deadTransport = { id: 'dead-transport', owner, typeIds: [UNIT_TYPE.TRANSPORT] };
		const survivingUnit = { id: 'surviving-unit', owner };
		const activePlayer = new HumanPlayer(owner);

		activePlayer.trackedData.transports.add(deadTransport as any);
		activePlayer.trackedData.units.add(survivingUnit as any);

		activePlayer.onDeath(owner, deadTransport as any, false);

		expect(activePlayer.trackedData.transports.has(deadTransport as any)).toBe(false);
		expect(activePlayer.trackedData.units.has(survivingUnit as any)).toBe(true);
	});
});
