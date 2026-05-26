import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/app/managers/names/name-manager', () => ({
	NameManager: {
		getInstance: () => ({
			getDisplayName: (handle: { id?: number }) => `Player${handle?.id ?? 0}`,
			getAcct: () => 'acct',
			getBtag: () => 'btag#0000',
			getOriginalColorCode: () => '|cffffffff',
		}),
	},
}));

vi.mock('src/app/rating/rating-manager', () => ({
	RatingManager: {
		getInstance: () => ({
			getRatingResults: () => new Map(),
			getShowRatingPreference: () => false,
			isRankedGame: () => false,
			isRatingSystemEnabled: () => false,
		}),
	},
}));

vi.mock('src/app/managers/victory-manager', () => ({
	VictoryManager: {
		getInstance: () => ({
			getCityCountWin: () => 50,
			updateLeader: vi.fn(),
		}),
	},
}));

vi.mock('src/app/game/state/global-game-state', () => ({
	GlobalGameData: {
		leader: undefined,
		tickCounter: 0,
		turnCount: 0,
	},
}));

vi.mock('src/app/utils/game-status', () => ({
	getReplayObservedPlayer: () => ({ id: 0 }),
	isReplay: () => false,
}));

vi.mock('src/app/utils/player-colors', () => ({
	PLAYER_COLORS: [],
	PLAYER_COLORS_BLIZZARD: [],
	colorByInt: () => '|cffffffff',
	getBlizzardColorByPlayerId: () => 0,
	getCustomColorByInt: () => 0,
}));

vi.mock('src/app/utils/utils', () => ({
	GetLocalPlayer: () => ({ id: 0 }),
	GetPlayerId: (handle: { id?: number }) => handle?.id ?? 0,
	NEUTRAL_HOSTILE: { id: 24 },
	PlayLocalSound: vi.fn(),
}));

vi.mock('src/app/utils/participant-entity', () => ({
	ParticipantEntityManager: {
		getCityCount: () => 0,
		getDisplayName: () => 'Player1',
	},
}));

vi.mock('src/configs/unit-id', () => ({ UNIT_ID: {} }));
vi.mock('src/app/utils/unit-types', () => ({ UNIT_TYPE: {}, UnitTypeMap: {} }));

vi.mock('src/app/settings/settings-context', () => ({
	SettingsContext: {
		getInstance: () => ({
			isFFA: () => true,
		}),
	},
}));

vi.mock('src/app/teams/team-manager', () => ({
	TeamManager: {
		getInstance: () => ({
			getTeamNumberFromPlayer: () => 1,
		}),
	},
}));

const setItemValueMock = vi.fn();

function installMultiboardStubs(): void {
	const wc3Global = globalThis as typeof globalThis & Record<string, unknown>;

	wc3Global.CreateMultiboard = vi.fn(() => ({}));
	wc3Global.MultiboardSetTitleText = vi.fn();
	wc3Global.MultiboardSetColumnCount = vi.fn();
	wc3Global.MultiboardGetRowCount = vi.fn(() => 0);
	wc3Global.MultiboardSetRowCount = vi.fn();
	wc3Global.MultiboardGetItem = vi.fn((_board: unknown, row: number, col: number) => ({ row, col }));
	wc3Global.MultiboardSetItemWidth = vi.fn();
	wc3Global.MultiboardReleaseItem = vi.fn();
	wc3Global.MultiboardSetItemValue = setItemValueMock;
	wc3Global.MultiboardSetItemsStyle = vi.fn();
	wc3Global.MultiboardMinimize = vi.fn();
	wc3Global.MultiboardDisplay = vi.fn();
	wc3Global.IsPlayerAlly = vi.fn(() => false);
	wc3Global.GetLocalPlayer = vi.fn(() => ({ id: 0 }));
	wc3Global.GetPlayerId = vi.fn((handle: { id?: number }) => handle?.id ?? 0);
	wc3Global.GetPlayerState = vi.fn(() => 100);
	wc3Global.PLAYER_STATE_RESOURCE_GOLD = 'gold';
	wc3Global.Player = vi.fn((id: number) => ({ id }));
}

import { ObserverRenderer } from 'src/app/scoreboard/observer-renderer';
import { PlayerRenderer } from 'src/app/scoreboard/player-renderer';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { TeamRenderer } from 'src/app/scoreboard/team-renderer';
import type { ActivePlayer } from 'src/app/player/types/active-player';

function createActivePlayer(handle: player): ActivePlayer {
	return {
		getPlayer: () => handle,
		status: {
			isAlive: () => true,
			isEliminated: () => false,
			isNomad: () => false,
			isSTFU: () => false,
			status: 'Alive',
			statusDuration: 0,
		},
		trackedData: {
			cities: { cities: [] },
			countries: new Map(),
			income: { delta: 0, income: 10 },
			killsDeaths: new Map([[handle, { deathValue: 0, killValue: 0 }]]),
			lastCombat: 0,
			turnDied: 0,
		},
	} as unknown as ActivePlayer;
}

describe('scoreboard capture alerts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		installMultiboardStubs();
		ScoreboardManager.resetInstance();
	});

	it('keeps the capture alert visible on the observer scoreboard', () => {
		const renderer = new ObserverRenderer(1);
		const playerHandle = { id: 1 } as player;

		setItemValueMock.mockClear();
		renderer.renderAlert(playerHandle, 'France');

		expect(setItemValueMock).toHaveBeenCalledWith({ row: 3, col: 0 }, 'Player1 claimed |cffffcc00France|r');
	});

	it('routes capture alerts to active scoreboards through the scoreboard manager', () => {
		const playerHandle = { id: 1 } as player;
		const observerHandle = { id: 24 } as player;
		const manager = ScoreboardManager.getInstance();

		manager.ffaSetup([createActivePlayer(playerHandle)]);
		manager.obsSetup([createActivePlayer(playerHandle)], [observerHandle]);

		setItemValueMock.mockClear();
		manager.setAlert(playerHandle, 'France');

		expect(setItemValueMock).toHaveBeenCalledTimes(2);
		expect(setItemValueMock).toHaveBeenCalledWith({ row: 3, col: 0 }, 'Player1 claimed |cffffcc00France|r');
	});

	it('keeps the capture alert visible on the FFA player scoreboard', () => {
		const renderer = new PlayerRenderer(1);
		const playerHandle = { id: 1 } as player;

		setItemValueMock.mockClear();
		renderer.renderAlert(playerHandle, 'France');

		expect(setItemValueMock).toHaveBeenCalledWith({ row: 3, col: 0 }, 'Player1 claimed |cffffcc00France|r');
	});

	it('keeps the capture alert visible on the team player scoreboard', () => {
		const renderer = new TeamRenderer([]);
		const playerHandle = { id: 1 } as player;

		setItemValueMock.mockClear();
		renderer.renderAlert(playerHandle, 'France');

		expect(setItemValueMock).toHaveBeenCalledWith({ row: 2, col: 0 }, 'Player1 claimed |cffffcc00France|r');
	});
});
