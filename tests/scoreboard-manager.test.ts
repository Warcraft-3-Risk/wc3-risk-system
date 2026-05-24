import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('w3ts', () => ({ File: {} }));
vi.mock('w3ts/system/file', () => ({
	File: class {
		static read() {
			return '';
		}
		static write() {}
	},
}));
vi.mock('w3ts/handles', () => ({ Timer: {} }));
vi.mock('src/app/utils/messages', () => ({ GlobalMessage: vi.fn(), ErrorMsg: vi.fn() }));

vi.mock('src/app/utils/utils', () => ({
	NEUTRAL_HOSTILE: {},
	GetPlayerId: (p: any) => p?.id ?? 0,
	GetLocalPlayer: () => ({ id: 0 }),
}));

vi.mock('src/app/utils/player-colors', () => ({
	PLAYER_COLORS: [],
	PLAYER_COLORS_BLIZZARD: [],
	getBlizzardColorByPlayerId: () => 0,
	getCustomColorByInt: () => 0,
	colorByInt: () => '|cFFFFFFFF',
}));

vi.mock('src/app/managers/names/name-manager', () => ({
	NameManager: {
		getInstance: () => ({
			getDisplayName: () => 'Player',
			getAcct: () => 'acct',
			getBtag: () => 'btag#0000',
			getOriginalColorCode: () => '|cFFFFFFFF',
		}),
	},
}));

vi.mock('src/configs/unit-id', () => ({ UNIT_ID: {} }));
vi.mock('src/app/utils/unit-types', () => ({ UnitTypeMap: {} }));
vi.mock('src/configs/map-info', () => ({ GameOptions: { GameType: 'risk' } }));

const renderFullMock = vi.fn();
const renderPartialMock = vi.fn();
const setVisibilityMock = vi.fn();

vi.mock('src/app/scoreboard/player-renderer', () => ({
	PlayerRenderer: class {
		renderFull = renderFullMock;
		renderPartial = renderPartialMock;
		setVisibility = setVisibilityMock;
		setTitle = vi.fn();
	},
}));

vi.mock('src/app/managers/victory-manager', () => ({
	VictoryManager: {
		getInstance: () => ({ getOwnershipByThresholdDescending: () => [], getCityCountWin: () => 50 }),
	},
}));

vi.mock('src/app/game/state/global-game-state', () => ({
	GlobalGameData: { turnCount: 5, tickCounter: 30, leader: undefined },
}));

vi.mock('src/app/utils/game-status', () => ({
	isReplay: () => false,
	getReplayObservedPlayer: () => null,
}));

// WC3 STUBS
(globalThis as any).GetLocalPlayer = () => ({ id: 0 });
(globalThis as any).GetPlayerId = (p: any) => p?.id ?? 0;
(globalThis as any).GetPlayerState = () => 100;
(globalThis as any).PLAYER_STATE_RESOURCE_GOLD = 'gold';
(globalThis as any).Player = (id: number) => ({ id });
(globalThis as any).PLAYER_NEUTRAL_AGGRESSIVE = 24;

import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { ScoreboardDataModel } from 'src/app/scoreboard/scoreboard-data-model';

describe('ScoreboardManager decoupling', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		ScoreboardManager.resetInstance();
	});

	it('should pass injected players to data model during updateFull', () => {
		const sm = ScoreboardManager.getInstance();

		// Spy on data model
		const rawModel = (sm as any).dataModel as ScoreboardDataModel;
		const refreshSpy = vi.spyOn(rawModel, 'refresh');

		sm.ffaSetup([], []); // Needs to take players and observers

		const dummyPlayer = {
			getPlayer: () => ({ id: 1 }),
			trackedData: {
				killsDeaths: new Map(),
				lastCombat: 0,
				turnDied: -1,
				cities: { cities: [] },
				income: { income: 50, delta: 0 },
			},
			status: {
				isAlive: () => true,
				isEliminated: () => false,
				isNomad: () => false,
				isSTFU: () => false,
				status: 'Alive',
				statusDuration: 0,
			},
		} as unknown as ActivePlayer;

		// Push new data using injected parameters
		sm.updateFull([dummyPlayer], true, []);

		// Should have been passed directly to data model
		expect(refreshSpy).toHaveBeenCalledWith([dummyPlayer], true);
	});
});
