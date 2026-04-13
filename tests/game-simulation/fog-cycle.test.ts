/**
 * Integration tests for the fog/day-night cycle.
 *
 * Tests the ACTUAL production code in GameLoopState.updateFogSettings().
 * If someone changes `(turn - 1) % 4` to `% 5` in game-loop-state.ts,
 * these tests will fail — unlike the old parallel-implementation tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTimeOfDay, isFogEnabled, resetTimeState } from './helpers/wc3-integration-shim';
import { resetAllSingletons, configureSettings } from './helpers/setup';

// ─── Module Mocks ───────────────────────────────────────────────────
// Mock heavy dependencies that GameLoopState imports but updateFogSettings doesn't use.
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
vi.mock('src/app/game/services/shared-slot-manager', () => ({
	SharedSlotManager: {
		getInstance: () => ({
			evaluateAndRedistribute: () => false,
			debugPrintSlotCounts: vi.fn(),
			getOwnerOfUnit: (u: any) => u?.owner,
		}),
	},
}));
vi.mock('src/app/managers/income-manager', () => ({
	IncomeManager: { giveIncome: vi.fn() },
}));
vi.mock('src/app/country/country-map', () => ({
	StringToCountry: new Map(),
	CityToCountry: new Map(),
}));
vi.mock('src/app/game/utillity/update-ui', () => ({
	updateTickUI: vi.fn(),
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

// ─── Import the ACTUAL production code ──────────────────────────────
import { GameLoopState } from 'src/app/game/game-mode/base-game-mode/game-loop-state';

// ─── Tests ──────────────────────────────────────────────────────────

describe('GameLoopState.updateFogSettings (production code)', () => {
	let gameLoopState: GameLoopState<any>;

	beforeEach(() => {
		resetAllSingletons();
		resetTimeState();
		// Enable night fog
		configureSettings({ fog: 2 });

		// Create a GameLoopState instance — we only call updateFogSettings,
		// not onEnterState, so the timer/loop machinery isn't exercised.
		gameLoopState = new GameLoopState();
	});

	afterEach(() => {
		resetAllSingletons();
	});

	describe('turn 0 is always day', () => {
		it('sets time of day to 12.0 (noon)', () => {
			gameLoopState.updateFogSettings(0);
			expect(getTimeOfDay()).toBe(12.0);
		});

		it('turns fog OFF', () => {
			gameLoopState.updateFogSettings(0);
			expect(isFogEnabled()).toBe(false);
		});
	});

	describe('4-turn cycle: dusk → night → dawn → day', () => {
		it('turn 1 → dusk: SetTimeOfDay(18.0), fog ON', () => {
			gameLoopState.updateFogSettings(1);
			expect(getTimeOfDay()).toBe(18.0);
			expect(isFogEnabled()).toBe(true);
		});

		it('turn 2 → night: SetTimeOfDay(0.0), fog ON', () => {
			gameLoopState.updateFogSettings(2);
			expect(getTimeOfDay()).toBe(0.0);
			expect(isFogEnabled()).toBe(true);
		});

		it('turn 3 → dawn: SetTimeOfDay(6.0), fog OFF', () => {
			gameLoopState.updateFogSettings(3);
			expect(getTimeOfDay()).toBe(6.0);
			expect(isFogEnabled()).toBe(false);
		});

		it('turn 4 → day: SetTimeOfDay(12.0), fog OFF', () => {
			gameLoopState.updateFogSettings(4);
			expect(getTimeOfDay()).toBe(12.0);
			expect(isFogEnabled()).toBe(false);
		});
	});

	describe('cycle repeats every 4 turns', () => {
		it('turn 5 repeats dusk (same as turn 1)', () => {
			gameLoopState.updateFogSettings(5);
			expect(getTimeOfDay()).toBe(18.0);
			expect(isFogEnabled()).toBe(true);
		});

		it('turn 6 repeats night (same as turn 2)', () => {
			gameLoopState.updateFogSettings(6);
			expect(getTimeOfDay()).toBe(0.0);
			expect(isFogEnabled()).toBe(true);
		});

		it('turn 7 repeats dawn (same as turn 3)', () => {
			gameLoopState.updateFogSettings(7);
			expect(getTimeOfDay()).toBe(6.0);
			expect(isFogEnabled()).toBe(false);
		});

		it('turn 8 repeats day (same as turn 4)', () => {
			gameLoopState.updateFogSettings(8);
			expect(getTimeOfDay()).toBe(12.0);
			expect(isFogEnabled()).toBe(false);
		});
	});

	describe('third cycle verification', () => {
		it('turn 9 = dusk', () => {
			gameLoopState.updateFogSettings(9);
			expect(getTimeOfDay()).toBe(18.0);
		});

		it('turn 10 = night', () => {
			gameLoopState.updateFogSettings(10);
			expect(getTimeOfDay()).toBe(0.0);
		});

		it('turn 11 = dawn', () => {
			gameLoopState.updateFogSettings(11);
			expect(getTimeOfDay()).toBe(6.0);
		});

		it('turn 12 = day', () => {
			gameLoopState.updateFogSettings(12);
			expect(getTimeOfDay()).toBe(12.0);
		});
	});

	describe('night fog disabled', () => {
		it('does nothing when fog setting is off (0)', () => {
			configureSettings({ fog: 0 });
			resetTimeState(); // Reset to noon
			gameLoopState.updateFogSettings(1);
			// Should remain at noon since fog is disabled
			expect(getTimeOfDay()).toBe(12.0);
			expect(isFogEnabled()).toBe(false);
		});

		it('does nothing when fog setting is always-on (1)', () => {
			configureSettings({ fog: 1 });
			resetTimeState();
			gameLoopState.updateFogSettings(1);
			expect(getTimeOfDay()).toBe(12.0);
		});
	});

	describe('high turn numbers maintain the cycle', () => {
		it('turn 100 = (100-1)%4 = 3 → day', () => {
			gameLoopState.updateFogSettings(100);
			expect(getTimeOfDay()).toBe(12.0);
			expect(isFogEnabled()).toBe(false);
		});

		it('turn 101 = (101-1)%4 = 0 → dusk', () => {
			gameLoopState.updateFogSettings(101);
			expect(getTimeOfDay()).toBe(18.0);
			expect(isFogEnabled()).toBe(true);
		});
	});
});
