import { beforeEach, describe, expect, it, vi } from 'vitest';
import './helpers/wc3-integration-shim';

/* eslint-disable @typescript-eslint/no-explicit-any */

const sharedSlotManagerMock = vi.hoisted(() => ({
	evaluateAndRedistribute: vi.fn(() => false),
	debugPrintSlotCounts: vi.fn(),
	getOwnerOfUnit: vi.fn((unit: any) => unit?.owner),
}));

const allyColorFilterMock = vi.hoisted(() => ({
	refreshAll: vi.fn(),
	refreshPlayerAndUnitColors: vi.fn(),
}));

vi.mock('w3ts', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));

vi.mock('w3ts/system/file', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));

vi.mock('src/app/country/country-map', () => ({
	StringToCountry: new Map(),
	CityToCountry: new Map(),
}));

vi.mock('src/app/game/game-mode/utillity/update-ui', () => ({
	updateTickUI: vi.fn(),
}));

vi.mock('src/app/game/announcer/announce', () => ({
	AnnounceOnLocation: vi.fn(),
}));

vi.mock('src/app/game/game-mode/utillity/on-player-status', () => ({
	onPlayerAliveHandle: vi.fn(),
	onPlayerDeadHandle: vi.fn(),
	onPlayerLeftHandle: vi.fn(),
	onPlayerNomadHandle: vi.fn(),
	onPlayerSTFUHandle: vi.fn(),
	applyEliminatedBuff: vi.fn(),
}));

vi.mock('src/app/game/services/shared-slot-manager', () => ({
	SharedSlotManager: {
		getInstance: () => sharedSlotManagerMock,
	},
}));

vi.mock('src/app/managers/ally-color-filter-manager', () => ({
	AllyColorFilterManager: {
		getInstance: () => allyColorFilterMock,
	},
}));

vi.mock('src/app/managers/income-manager', () => ({
	IncomeManager: { giveIncome: vi.fn() },
}));

vi.mock('src/app/managers/fog-manager', () => ({
	FogManager: {
		getInstance: () => ({
			turnFogOff: vi.fn(),
			turnFogOn: vi.fn(),
		}),
	},
}));

vi.mock('src/app/managers/victory-manager', () => ({
	VictoryManager: {
		GAME_VICTORY_STATE: 'UNDECIDED',
		getInstance: () => ({
			haveAllOpponentsBeenEliminated: vi.fn(),
			updateAndGetGameState: vi.fn(),
			getOwnershipByThresholdDescending: () => [],
			getCityCountWin: () => 10,
		}),
	},
}));

vi.mock('src/app/scoreboard/scoreboard-manager', () => ({
	ScoreboardManager: {
		getInstance: () => ({
			updateFull: vi.fn(),
			updatePartial: vi.fn(),
			updateScoreboardTitle: vi.fn(),
			destroyBoards: vi.fn(),
			getSessionBoard: () => null,
			showSessionBoard: vi.fn(),
		}),
	},
}));

vi.mock('src/app/statistics/statistics-controller', () => ({
	StatisticsController: {
		getInstance: () => ({
			getModel: () => ({ setData: vi.fn(), getRanks: () => [] }),
			refreshView: vi.fn(),
			setViewVisibility: vi.fn(),
			writeStatisticsData: vi.fn(),
		}),
	},
}));

vi.mock('src/app/statistics/replay-manager', () => ({
	ReplayManager: {
		getInstance: () => ({
			onRoundStart: vi.fn(),
			onTurnStart: vi.fn(),
			onRoundEnd: vi.fn(),
		}),
	},
}));

vi.mock('src/app/rating/rating-manager', () => ({
	RatingManager: {
		getInstance: () => ({
			isRankedGame: () => false,
			captureInitialGameData: vi.fn(),
			saveRatingsInProgress: vi.fn(),
			finalizePlayerRating: vi.fn(),
		}),
	},
}));

vi.mock('src/app/player/player-manager', () => ({
	PlayerManager: {
		getInstance: vi.fn(),
	},
}));

vi.mock('src/app/settings/settings-context', () => ({
	SettingsContext: {
		getInstance: vi.fn(),
	},
}));

vi.mock('src/app/managers/names/name-manager', () => ({
	NameManager: {
		getInstance: () => ({
			setColor: vi.fn(),
			setName: vi.fn(),
			getOriginalColor: () => 0,
			getDisplayName: () => 'Player',
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

vi.mock('src/app/utils/messages', () => ({
	GlobalMessage: vi.fn(),
	LocalMessage: vi.fn(),
}));

vi.mock('src/app/utils/utils', () => ({
	PlayLocalSound: vi.fn(),
}));

vi.mock('src/app/utils/player-colors', () => ({
	PLAYER_COLOR_CODES_MAP: new Map(),
}));

import { GameLoopState } from 'src/app/game/game-mode/base-game-mode/game-loop-state';
import { GameOverState } from 'src/app/game/game-mode/base-game-mode/game-over-state';
import { GlobalGameData } from 'src/app/game/state/global-game-state';
import { PlayerManager } from 'src/app/player/player-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { EVENT_ON_PLAYER_RESTART } from 'src/app/utils/events/event-constants';
import { EventEmitter } from 'src/app/utils/events/event-emitter';

describe('immediate restart after match end', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		GlobalGameData.resetInstance();
		EventEmitter.resetInstance();

		vi.mocked(PlayerManager.getInstance).mockReturnValue({
			getHumanPlayersCount: () => 2,
			activePlayersThatAreAlive: new Map(),
		} as any);

		vi.mocked(SettingsContext.getInstance).mockReturnValue({
			isFFA: () => false,
			isPromode: () => true,
			isChaosPromode: () => false,
			isRandomTeams: () => false,
			isNightFogOn: () => false,
		} as any);
		sharedSlotManagerMock.evaluateAndRedistribute.mockReturnValue(false);
	});

	it('exits the game loop and replays -ng when -ff already moved matchState to postMatch', () => {
		const state = new GameLoopState();
		state.stateData = {};
		const order: string[] = [];
		state.nextState = vi.fn(() => order.push('game-over-entered'));
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_RESTART, () => order.push('restart-replayed'));
		GlobalGameData.matchState = 'postMatch';

		state.onPlayerRestart({} as any);

		expect(state.nextState).toHaveBeenCalledTimes(1);
		expect(state.nextState).toHaveBeenCalledWith(state.stateData);
		expect(order).toEqual(['game-over-entered', 'restart-replayed']);
	});

	it('guards the game-loop exit so repeated -ng cannot double-advance the state machine', () => {
		const state = new GameLoopState();
		state.stateData = {};
		state.nextState = vi.fn();
		GlobalGameData.matchState = 'postMatch';

		state.onPlayerRestart({} as any);
		state.onPlayerRestart({} as any);

		expect(state.nextState).toHaveBeenCalledTimes(1);
	});

	it('replayed -ng can be handled by GameOverState after end-of-match work runs', () => {
		const loopState = new GameLoopState();
		const gameOverState = new GameOverState();
		const stateData = {};
		const order: string[] = [];

		loopState.stateData = stateData;
		gameOverState.stateData = stateData;
		loopState.nextState = vi.fn(() => {
			order.push('game-over-entered');
			gameOverState.onEnterState();
		});
		gameOverState.nextState = vi.fn(() => order.push('reset-started'));
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_RESTART, (player) => gameOverState.onPlayerRestart(player));

		GlobalGameData.matchState = 'postMatch';

		loopState.onPlayerRestart({} as any);

		expect(order).toEqual(['game-over-entered', 'reset-started']);
		expect(gameOverState.nextState).toHaveBeenCalledWith(stateData);
	});

	it('refreshes player and unit colors when shared slot redistribution changes ownership', () => {
		sharedSlotManagerMock.evaluateAndRedistribute.mockReturnValueOnce(true);
		const state = new GameLoopState();

		state.onStartTurn(1);

		expect(allyColorFilterMock.refreshPlayerAndUnitColors).toHaveBeenCalledTimes(1);
		expect(allyColorFilterMock.refreshAll).not.toHaveBeenCalled();
	});
});
