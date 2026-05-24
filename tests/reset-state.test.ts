/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import './game-simulation/helpers/wc3-integration-shim';

const treeResetMock = vi.hoisted(() => vi.fn());
const removeUnitsMock = vi.hoisted(() => vi.fn());
const resetCountriesMock = vi.hoisted(() => vi.fn());
const waitMock = vi.hoisted(() => vi.fn());
const minimapReinitializeMock = vi.hoisted(() => vi.fn());

vi.mock('w3ts', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));

vi.mock('w3ts/system/file', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));

vi.mock('src/app/game/services/tree-service', () => ({
	TreeManager: {
		getInstance: () => ({
			reset: treeResetMock,
		}),
	},
}));

vi.mock('src/app/game/game-mode/utillity/remove-units', () => ({
	removeUnits: removeUnitsMock,
}));

vi.mock('src/app/game/game-mode/utillity/reset-countries', () => ({
	resetCountries: resetCountriesMock,
}));

vi.mock('src/app/utils/wait', () => ({
	Wait: {
		forSeconds: waitMock,
	},
}));

vi.mock('src/app/statistics/statistics-controller', () => ({
	StatisticsController: {
		getInstance: () => ({
			setViewVisibility: vi.fn(),
		}),
	},
}));

vi.mock('src/app/managers/fog-manager', () => ({
	FogManager: {
		getInstance: () => ({
			turnFogOff: vi.fn(),
		}),
	},
}));

vi.mock('src/app/game/services/shared-slot-manager', () => ({
	SharedSlotManager: {
		getInstance: () => ({
			reset: vi.fn(),
		}),
	},
}));

vi.mock('src/app/teams/team-manager', () => ({
	TeamManager: {
		getInstance: () => ({
			getTeams: () => [],
		}),
	},
}));

vi.mock('src/app/utils/participant-entity', () => ({
	ParticipantEntityManager: {
		getParticipantEntities: () => [],
		executeByParticipantEntities: vi.fn(),
	},
}));

vi.mock('src/app/managers/unit-kill-tracker', () => ({
	UnitKillTracker: {
		getInstance: () => ({
			reset: vi.fn(),
		}),
	},
}));

vi.mock('src/app/managers/minimap-icon-manager', () => ({
	MinimapIconManager: {
		getInstance: () => ({
			reinitialize: minimapReinitializeMock,
		}),
	},
}));

vi.mock('src/app/country/country-map', () => ({
	CityToCountry: new Map(),
}));

import { ResetState } from 'src/app/game/game-mode/base-game-mode/reset-state';
import { GlobalGameData } from 'src/app/game/state/global-game-state';

describe('ResetState', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		GlobalGameData.resetInstance();

		(globalThis as any).print = vi.fn();
		(globalThis as any).SetTimeOfDayScale = vi.fn();
		(globalThis as any).SetTimeOfDay = vi.fn();

		removeUnitsMock.mockResolvedValue(undefined);
		resetCountriesMock.mockResolvedValue(undefined);
		waitMock.mockResolvedValue(undefined);
		minimapReinitializeMock.mockResolvedValue(undefined);
	});

	it('does not block the mode restart on a long-running tree reset', async () => {
		treeResetMock.mockReturnValue(new Promise<void>(() => {}));
		GlobalGameData.prepareMatchData([makePlayer()]);

		const state = new ResetState();
		state.stateData = {};
		state.nextState = vi.fn();

		const result = await Promise.race([
			state.runAsync().then(() => 'completed'),
			new Promise((resolve) => setTimeout(() => resolve('timed-out'), 0)),
		]);

		expect(result).toBe('completed');
		expect(treeResetMock).toHaveBeenCalledTimes(1);
		expect(state.nextState).toHaveBeenCalledWith(state.stateData);
	});

	function makePlayer(): any {
		return {
			trackedData: {
				reset: vi.fn(),
				setKDMaps: vi.fn(),
			},
		};
	}
});
