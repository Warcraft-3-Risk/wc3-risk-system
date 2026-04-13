/**
 * Integration tests for capitals game mode.
 *
 * Tests the ACTUAL production code in CapitalsGameLoopState.onCityCapture()
 * to verify that capturing a capital eliminates the owner.
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
vi.mock('src/app/country/country-map', () => {
	const fakeCountry = {
		getSpawn: () => ({
			setMultiplier: vi.fn(),
		}),
	};
	const fakeCityMap = new Map();
	for (let i = 0; i < 100; i++) {
		fakeCityMap.set(`region_${i}`, { name: `City ${i}` });
	}
	// CityToCountry returns a mock country for any city via a Proxy
	const cityToCountryProxy = new Proxy(new Map(), {
		get(target, prop) {
			if (prop === 'get') return () => fakeCountry;
			if (prop === 'has') return () => true;
			if (prop === 'size') return 100;
			return Reflect.get(target, prop);
		},
	});
	return {
		StringToCountry: new Map(),
		CityToCountry: cityToCountryProxy,
		RegionToCity: fakeCityMap,
	};
});
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
			getDisplayName: (p: unknown) => `Player ${(p as Record<string, unknown>)?.id ?? '?'}`,
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
vi.mock('src/app/utils/messages', () => ({
	LocalMessage: vi.fn(),
	GlobalMessage: vi.fn(),
	CountdownMessage: vi.fn(),
}));
vi.mock('src/app/city/city-map', () => {
	const fakeCityMap = new Map();
	for (let i = 0; i < 100; i++) {
		fakeCityMap.set(`region_${i}`, { name: `City ${i}` });
	}
	return { RegionToCity: fakeCityMap };
});

// ─── Import ACTUAL production code ──────────────────────────────────
import { CapitalsGameLoopState } from 'src/app/game/game-mode/capital-game-mode/capitals-game-loop-state';
import { GlobalGameData } from 'src/app/game/state/global-game-state';
import { PLAYER_STATUS } from 'src/app/player/status/status-enum';
import { UNIT_ID } from 'src/configs/unit-id';

// ─── Helpers ────────────────────────────────────────────────────────

function createFakeCity(name: string): { name: string; barrack: { unit: number }; onCast: () => void } {
	return {
		name,
		barrack: { unit: 0 },
		onCast: vi.fn(),
	};
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('CapitalsGameLoopState.onCityCapture (production code)', () => {
	let capitalsLoop: CapitalsGameLoopState;

	beforeEach(() => {
		resetAllSingletons();
		configureSettings({ gameType: 1, diplomacy: 0 }); // Capitals + FFA
		capitalsLoop = new CapitalsGameLoopState();

		// Set up stateData with a capitals map
		GlobalGameData.stateData = {
			playerCapitalSelections: new Map(),
			capitals: new Map(),
		};
	});

	afterEach(() => {
		resetAllSingletons();
	});

	describe('capital capture → elimination', () => {
		it('eliminates the owner when their capital is captured', () => {
			const p1 = createFakeActivePlayer(0);
			const p2 = createFakeActivePlayer(1);
			setupPlayerManager([p1, p2]);
			GlobalGameData.matchState = 'inProgress';

			const capital = createFakeCity('Berlin');
			(GlobalGameData.stateData as Record<string, unknown>).capitals = new Map([[p2.getPlayer(), capital]]);

			// p1 captures p2's capital
			capitalsLoop.onCityCapture(capital as never, p2 as never, p1 as never);

			expect(p2.status.isDead()).toBe(true);
			expect(p1.status.isAlive()).toBe(true);
		});

		it('does NOT eliminate when a non-capital city is captured', () => {
			const p1 = createFakeActivePlayer(0);
			const p2 = createFakeActivePlayer(1);
			setupPlayerManager([p1, p2]);
			GlobalGameData.matchState = 'inProgress';

			const capital = createFakeCity('Berlin');
			const otherCity = createFakeCity('Munich');
			(GlobalGameData.stateData as Record<string, unknown>).capitals = new Map([[p2.getPlayer(), capital]]);

			// p1 captures p2's non-capital city
			capitalsLoop.onCityCapture(otherCity as never, p2 as never, p1 as never);

			expect(p2.status.isAlive()).toBe(true);
			expect(p1.status.isAlive()).toBe(true);
		});

		it('does NOT eliminate when self-capture (same owner)', () => {
			const p1 = createFakeActivePlayer(0);
			setupPlayerManager([p1]);
			GlobalGameData.matchState = 'inProgress';

			const capital = createFakeCity('Berlin');
			(GlobalGameData.stateData as Record<string, unknown>).capitals = new Map([[p1.getPlayer(), capital]]);

			// p1 captures their own capital (shouldn't happen but must be safe)
			capitalsLoop.onCityCapture(capital as never, p1 as never, p1 as never);

			expect(p1.status.isAlive()).toBe(true);
		});

		it('handles nil preOwner gracefully (neutral city)', () => {
			const p1 = createFakeActivePlayer(0);
			setupPlayerManager([p1]);
			GlobalGameData.matchState = 'inProgress';

			const neutralCity = createFakeCity('Neutral Town');

			// Capturing a neutral city should not throw
			expect(() => {
				capitalsLoop.onCityCapture(neutralCity as never, null as never, p1 as never);
			}).not.toThrow();

			expect(p1.status.isAlive()).toBe(true);
		});

		it('converts barracks to conquered capital when unit type is CAPITAL', () => {
			const p1 = createFakeActivePlayer(0);
			const p2 = createFakeActivePlayer(1);
			setupPlayerManager([p1, p2]);
			GlobalGameData.matchState = 'inProgress';

			const mockBarrackUnit = { id: 'barrack_unit' };
			const capital = createFakeCity('Berlin');
			capital.barrack.unit = mockBarrackUnit as never;
			(GlobalGameData.stateData as Record<string, unknown>).capitals = new Map([[p2.getPlayer(), capital]]);

			// Mock GetUnitTypeId to return CAPITAL for our barracks unit
			const origGetUnitTypeId = (globalThis as Record<string, unknown>).GetUnitTypeId as (u: unknown) => number;
			const origIssueOrder = (globalThis as Record<string, unknown>).IssueImmediateOrderById;
			const issueOrderSpy = vi.fn();

			try {
				(globalThis as Record<string, unknown>).GetUnitTypeId = (u: unknown) =>
					u === mockBarrackUnit ? UNIT_ID.CAPITAL : origGetUnitTypeId(u);
				(globalThis as Record<string, unknown>).IssueImmediateOrderById = issueOrderSpy;

				capitalsLoop.onCityCapture(capital as never, p2 as never, p1 as never);

				expect(issueOrderSpy).toHaveBeenCalledWith(mockBarrackUnit, UNIT_ID.CONQUERED_CAPITAL);
			} finally {
				(globalThis as Record<string, unknown>).GetUnitTypeId = origGetUnitTypeId;
				(globalThis as Record<string, unknown>).IssueImmediateOrderById = origIssueOrder;
			}
		});
	});

	describe('already eliminated player', () => {
		it('does NOT re-eliminate an already dead player', () => {
			const p1 = createFakeActivePlayer(0);
			const p2 = createFakeActivePlayer(1);
			p2.status.set(PLAYER_STATUS.DEAD);
			setupPlayerManager([p1, p2]);
			GlobalGameData.matchState = 'inProgress';

			const capital = createFakeCity('Berlin');
			(GlobalGameData.stateData as Record<string, unknown>).capitals = new Map([[p2.getPlayer(), capital]]);

			// p1 captures dead p2's capital — should still trigger but p2 is already dead
			capitalsLoop.onCityCapture(capital as never, p2 as never, p1 as never);

			expect(p2.status.isDead()).toBe(true); // Still dead
		});
	});

	describe('multiple capitals game', () => {
		it('only eliminates the player whose capital is captured, not others', () => {
			const p1 = createFakeActivePlayer(0);
			const p2 = createFakeActivePlayer(1);
			const p3 = createFakeActivePlayer(2);
			setupPlayerManager([p1, p2, p3]);
			GlobalGameData.matchState = 'inProgress';

			const cap2 = createFakeCity('Berlin');
			const cap3 = createFakeCity('Paris');
			(GlobalGameData.stateData as Record<string, unknown>).capitals = new Map([
				[p2.getPlayer(), cap2],
				[p3.getPlayer(), cap3],
			]);

			// p1 captures p2's capital
			capitalsLoop.onCityCapture(cap2 as never, p2 as never, p1 as never);

			expect(p2.status.isDead()).toBe(true);
			expect(p3.status.isAlive()).toBe(true); // p3 unaffected
			expect(p1.status.isAlive()).toBe(true);
		});
	});
});
