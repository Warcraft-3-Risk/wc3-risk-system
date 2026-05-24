/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import './game-simulation/helpers/wc3-integration-shim';

const treeResetMock = vi.hoisted(() => vi.fn());

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

vi.mock('src/app/managers/victory-manager', () => ({
	VictoryManager: {
		getInstance: () => ({
			reset: vi.fn(),
		}),
	},
}));

vi.mock('src/app/player/player-manager', () => ({
	PlayerManager: {
		getInstance: () => ({
			playersAndObservers: new Map(),
			observers: new Map(),
		}),
	},
}));

vi.mock('src/app/scoreboard/scoreboard-manager', () => ({
	ScoreboardManager: {
		getInstance: () => ({
			getSessionBoard: () => undefined,
			sessionSetup: vi.fn(),
			hideSessionBoard: vi.fn(),
			ffaSetup: vi.fn(),
			teamSetup: vi.fn(),
			obsSetup: vi.fn(),
			updateScoreboardTitle: vi.fn(),
		}),
	},
}));

vi.mock('src/app/settings/settings-context', () => ({
	SettingsContext: {
		getInstance: () => ({
			isPromode: () => false,
			isChaosPromode: () => false,
			isRandomTeams: () => false,
			isFFA: () => true,
			applyStrategy: vi.fn(),
		}),
	},
}));

vi.mock('src/app/statistics/statistics-controller', () => ({
	StatisticsController: {
		getInstance: () => ({
			setViewVisibility: vi.fn(),
			useCurrentActivePlayers: vi.fn(),
		}),
	},
}));

vi.mock('src/app/quests/quests', () => ({
	Quests: {
		getInstance: () => ({
			updatePlayersQuest: vi.fn(),
		}),
	},
}));

vi.mock('src/app/game/game-mode/utillity/update-ui', () => ({
	clearTickUI: vi.fn(),
}));

vi.mock('src/app/teams/team-manager', () => ({
	TeamManager: {
		getInstance: () => ({
			getTeams: () => [],
		}),
	},
}));

vi.mock('src/app/statistics/replay-manager', () => ({
	ReplayManager: {
		getInstance: () => ({
			initialize: vi.fn(),
		}),
	},
}));

vi.mock('src/app/utils/messages', () => ({
	CountdownMessage: vi.fn(),
}));

vi.mock('src/app/managers/ally-color-filter-manager', () => ({
	AllyColorFilterManager: {
		getInstance: () => ({
			refreshPlayerAndUnitColors: vi.fn(),
		}),
	},
}));

vi.mock('src/app/ui/player-preference-buttons', () => ({
	restoreOptionButtonsForPlayers: vi.fn(),
}));

import { SetupState } from 'src/app/game/game-mode/base-game-mode/setup-state';
import { GlobalGameData } from 'src/app/game/state/global-game-state';

describe('SetupState tree reset', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		GlobalGameData.resetInstance();

		(globalThis as any).DisplayTimedTextToPlayer = vi.fn();
		(globalThis as any).PauseCompAI = vi.fn();
		(globalThis as any).EnableSelect = vi.fn();
		(globalThis as any).EnableDragSelect = vi.fn();
	});

	it('does not block restarted matches on setup tree reset', async () => {
		treeResetMock.mockReturnValue(new Promise<void>(() => {}));
		GlobalGameData.prepareMatchData([]);
		GlobalGameData.prepareMatchData([]);

		const state = new SetupState();
		state.stateData = {};
		state.nextState = vi.fn();

		const result = await Promise.race([
			state.runAsync().then(() => 'completed'),
			new Promise((resolve) => setTimeout(() => resolve('timed-out'), 0)),
		]);

		expect(result).toBe('completed');
		expect(treeResetMock).not.toHaveBeenCalled();
		expect(state.nextState).toHaveBeenCalledWith(state.stateData);
	});
});
