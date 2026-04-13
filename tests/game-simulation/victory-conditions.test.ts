/**
 * Integration tests for victory conditions.
 *
 * Tests the ACTUAL production code in VictoryManager.updateAndGetGameState()
 * using real singleton setup, not a parallel reimplementation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './helpers/wc3-integration-shim';
import { resetAllSingletons, configureSettings, createFakeActivePlayer, setupPlayerManager } from './helpers/setup';

// ─── Module Mocks ───────────────────────────────────────────────────
vi.mock('w3ts', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));
vi.mock('w3ts/system/file', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
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
			finalizePlayerRating: vi.fn(),
		}),
	},
}));
vi.mock('src/app/game/services/shared-slot-manager', () => ({
	SharedSlotManager: {
		getInstance: () => ({
			evaluateAndRedistribute: () => false,
			debugPrintSlotCounts: vi.fn(),
		}),
	},
}));
vi.mock('src/app/managers/income-manager', () => ({
	IncomeManager: { giveIncome: vi.fn() },
}));
vi.mock('src/app/country/country-map', () => ({
	StringToCountry: new Map(),
	CityToCountry: new Map(),
	RegionToCity: new Map(),
}));
vi.mock('src/app/game/game-mode/utillity/update-ui', () => ({
	updateTickUI: vi.fn(),
}));
vi.mock('src/app/game/announcer/announce', () => ({
	AnnounceOnLocation: vi.fn(),
	AnnounceOnUnitObserverOnlyTintedByPlayer: vi.fn(),
}));
vi.mock('src/app/game/game-mode/utillity/on-player-status', () => ({
	onPlayerAliveHandle: vi.fn(),
	onPlayerDeadHandle: vi.fn(),
	onPlayerLeftHandle: vi.fn(),
	onPlayerNomadHandle: vi.fn(),
	onPlayerSTFUHandle: vi.fn(),
	applyEliminatedBuff: vi.fn(),
}));
vi.mock('src/app/quests/quests', () => ({
	Quests: { getInstance: () => ({ updatePlayersQuest: vi.fn() }) },
}));
vi.mock('src/app/ui/player-preference-buttons', () => ({
	buildGuardHealthButton: vi.fn(() => ({})),
	buildGuardValueButton: vi.fn(() => ({})),
	buildLabelToggleButton: vi.fn(() => ({})),
	buildRatingStatsButton: vi.fn(() => ({})),
}));
vi.mock('src/app/ui/rating-stats-ui', () => ({
	RatingStatsUI: vi.fn(),
}));
vi.mock('src/app/player/bonus/fight-bonus', () => ({
	FightBonus: vi.fn(() => ({
		reset: vi.fn(),
		add: () => 0,
		hideUI: vi.fn(),
	})),
}));
vi.mock('src/app/managers/names/name-manager', () => ({
	NameManager: {
		getInstance: () => ({
			getDisplayName: (p: any) => `Player ${p?.id ?? '?'}`,
			getBtag: () => 'test#0000',
			setName: vi.fn(),
			setColor: vi.fn(),
			getOriginalColor: () => 0,
			getDisplayColorCode: () => '|cFFFFFFFF',
		}),
	},
}));
vi.mock('src/app/managers/overtime-manager', () => ({
	OvertimeManager: {
		isOvertimeEnabled: () => false,
		getOvertimeSettingValue: () => 999,
		getTurnCountPostOvertime: () => 0,
	},
}));
vi.mock('src/app/city/city-map', () => {
	// Simulate a map with 100 cities so win threshold is non-trivial
	const fakeCityMap = new Map();
	for (let i = 0; i < 100; i++) {
		fakeCityMap.set(`region_${i}`, { name: `City ${i}` });
	}
	return { RegionToCity: fakeCityMap };
});

// ─── Import ACTUAL production code ──────────────────────────────────
import { VictoryManager } from 'src/app/managers/victory-manager';
import { GlobalGameData } from 'src/app/game/state/global-game-state';
import { PLAYER_STATUS } from 'src/app/player/status/status-enum';

// ─── Tests ──────────────────────────────────────────────────────────

describe('VictoryManager.updateAndGetGameState (production code)', () => {
	beforeEach(() => {
		resetAllSingletons();
		configureSettings({ diplomacy: 0 }); // FFA
	});

	afterEach(() => {
		resetAllSingletons();
	});

	describe('FFA elimination victory', () => {
		it('returns DECIDED when only 1 player alive', () => {
			const p1 = createFakeActivePlayer(0);
			const p2 = createFakeActivePlayer(1);
			p2.status.set(PLAYER_STATUS.DEAD);
			setupPlayerManager([p1, p2]);

			GlobalGameData.matchState = 'inProgress';
			const result = VictoryManager.getInstance().updateAndGetGameState();
			expect(result).toBe('DECIDED');
		});

		it('returns UNDECIDED when multiple players alive with no city threshold met', () => {
			const p1 = createFakeActivePlayer(0);
			const p2 = createFakeActivePlayer(1);
			const p3 = createFakeActivePlayer(2);
			setupPlayerManager([p1, p2, p3]);

			GlobalGameData.matchState = 'inProgress';
			const result = VictoryManager.getInstance().updateAndGetGameState();
			expect(result).toBe('UNDECIDED');
		});

		it('returns DECIDED when 0 players alive', () => {
			const p1 = createFakeActivePlayer(0);
			p1.status.set(PLAYER_STATUS.DEAD);
			setupPlayerManager([p1]);

			GlobalGameData.matchState = 'inProgress';
			const result = VictoryManager.getInstance().updateAndGetGameState();
			// With 0 alive, haveAllOpponentsBeenEliminated fires (size <= 1)
			expect(result).toBe('DECIDED');
		});
	});

	describe('leader tracking', () => {
		it('sets the leader to the remaining player on elimination victory', () => {
			const p1 = createFakeActivePlayer(0);
			const p2 = createFakeActivePlayer(1);
			p2.status.set(PLAYER_STATUS.DEAD);
			setupPlayerManager([p1, p2]);

			GlobalGameData.matchState = 'inProgress';
			VictoryManager.getInstance().updateAndGetGameState();
			expect(GlobalGameData.leader).toBe(p1);
		});
	});

	describe('VictoryManager state persistence', () => {
		it('GAME_VICTORY_STATE is persisted as a static', () => {
			const p1 = createFakeActivePlayer(0);
			const p2 = createFakeActivePlayer(1);
			p2.status.set(PLAYER_STATUS.DEAD);
			setupPlayerManager([p1, p2]);

			GlobalGameData.matchState = 'inProgress';
			VictoryManager.getInstance().updateAndGetGameState();
			expect(VictoryManager.GAME_VICTORY_STATE).toBe('DECIDED');
		});

		it('reset() resets GAME_VICTORY_STATE to UNDECIDED', () => {
			VictoryManager.GAME_VICTORY_STATE = 'DECIDED';
			VictoryManager.getInstance().reset();
			expect(VictoryManager.GAME_VICTORY_STATE).toBe('UNDECIDED');
		});
	});
});
