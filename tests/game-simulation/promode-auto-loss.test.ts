/**
 * Integration tests for promode auto-loss.
 *
 * Tests the ACTUAL production code in ProModeGameLoopState.onEndTurn()
 * using real ParticipantEntityManager logic with FFA and team modes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './helpers/wc3-integration-shim';
import { resetAllSingletons, configureSettings, createFakeActivePlayer, setupPlayerManager, setupTeams } from './helpers/setup';

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
vi.mock('src/app/country/country-map', () => ({
	StringToCountry: new Map(),
	CityToCountry: new Map(),
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
vi.mock('src/app/utils/messages', () => ({
	LocalMessage: vi.fn(),
	GlobalMessage: vi.fn(),
	CountdownMessage: vi.fn(),
}));

// Mock only localMessage and getDisplayName on ParticipantEntityManager to handle
// fake players that aren't real ActivePlayer instances, while preserving
// the actual getCityCount, getParticipantEntities, and executeByParticipantEntity logic.
vi.mock('src/app/utils/participant-entity', async (importOriginal) => {
	const actual = (await importOriginal()) as any;
	const OriginalPEM = actual.ParticipantEntityManager;

	// Create a subclass that overrides only the problematic methods
	class TestableParticipantEntityManager extends OriginalPEM {
		static localMessage = vi.fn();
		static getDisplayName(entity: any, _preferName = true): string {
			if (entity?.getPlayer) return `Player ${entity.getPlayer()?.id ?? '?'}`;
			if (entity?.getNumber) return `Team ${entity.getNumber()}`;
			return 'Unknown';
		}
		// executeByParticipantEntity uses instanceof which fails with fakes.
		// For FFA tests, the participant is our fake (not a real ActivePlayer),
		// so instanceof fails → enters team branch which calls team methods.
		// We override to use duck typing instead.
		static executeByParticipantEntity(participantEntity: any, fnActivePlayer: (player: any) => void, fnTeam: (team: any) => void): void {
			if (participantEntity?.getPlayer && !participantEntity?.getMembers) {
				fnActivePlayer(participantEntity);
			} else if (participantEntity?.getMembers) {
				fnTeam(participantEntity);
			}
		}
	}

	return {
		...actual,
		ParticipantEntityManager: TestableParticipantEntityManager,
	};
});
vi.mock('src/app/city/city-map', () => {
	const fakeCityMap = new Map();
	for (let i = 0; i < 100; i++) {
		fakeCityMap.set(`region_${i}`, { name: `City ${i}` });
	}
	return { RegionToCity: fakeCityMap };
});

// ─── Import ACTUAL production code ──────────────────────────────────
import { ProModeGameLoopState } from 'src/app/game/game-mode/promode-game-mode/promode-game-loop-state';
import { GlobalGameData } from 'src/app/game/state/global-game-state';

// ─── Tests ──────────────────────────────────────────────────────────

describe('ProModeGameLoopState.onEndTurn (production code)', () => {
	let proGameLoop: ProModeGameLoopState;

	beforeEach(() => {
		resetAllSingletons();
		proGameLoop = new ProModeGameLoopState();
	});

	afterEach(() => {
		resetAllSingletons();
	});

	describe('FFA 1v1 auto-loss', () => {
		beforeEach(() => {
			configureSettings({ diplomacy: 0, promode: 1 }); // FFA promode
		});

		it('eliminates player when opponent has 2x their cities', () => {
			const p1 = createFakeActivePlayer(0);
			const p2 = createFakeActivePlayer(1);
			// p1 has 10 cities, p2 has 5 → p1 has 2x p2 → p2 eliminated
			for (let i = 0; i < 10; i++) p1.trackedData.cities.cities.push({});
			for (let i = 0; i < 5; i++) p2.trackedData.cities.cities.push({});
			setupPlayerManager([p1, p2]);
			GlobalGameData.matchState = 'inProgress';

			proGameLoop.onEndTurn(1);

			expect(p2.status.isDead()).toBe(true);
			expect(p1.status.isAlive()).toBe(true);
		});

		it('does NOT eliminate when less than 2x deficit', () => {
			const p1 = createFakeActivePlayer(0);
			const p2 = createFakeActivePlayer(1);
			// p1 has 9 cities, p2 has 5 → p1 has 1.8x p2 → not enough
			for (let i = 0; i < 9; i++) p1.trackedData.cities.cities.push({});
			for (let i = 0; i < 5; i++) p2.trackedData.cities.cities.push({});
			setupPlayerManager([p1, p2]);
			GlobalGameData.matchState = 'inProgress';

			proGameLoop.onEndTurn(1);

			expect(p1.status.isAlive()).toBe(true);
			expect(p2.status.isAlive()).toBe(true);
		});

		it('eliminates both players if both have exactly 0 cities', () => {
			const p1 = createFakeActivePlayer(0);
			const p2 = createFakeActivePlayer(1);
			// Both have 0 cities → 0 >= 0*2 = true for both
			setupPlayerManager([p1, p2]);
			GlobalGameData.matchState = 'inProgress';

			proGameLoop.onEndTurn(1);

			expect(p1.status.isDead()).toBe(true);
			expect(p2.status.isDead()).toBe(true);
		});
	});

	describe('Team promode 2v2 auto-loss', () => {
		beforeEach(() => {
			configureSettings({ diplomacy: 1, promode: 1 }); // Lobby teams + promode
		});

		it('eliminates all members of team when opponents have 2x cities', () => {
			const p1 = createFakeActivePlayer(0);
			const p2 = createFakeActivePlayer(1);
			const p3 = createFakeActivePlayer(2);
			const p4 = createFakeActivePlayer(3);

			// Team 1 (p1, p2): 20 cities total
			for (let i = 0; i < 12; i++) p1.trackedData.cities.cities.push({});
			for (let i = 0; i < 8; i++) p2.trackedData.cities.cities.push({});

			// Team 2 (p3, p4): 10 cities total → Team 1 has 2x Team 2
			for (let i = 0; i < 6; i++) p3.trackedData.cities.cities.push({});
			for (let i = 0; i < 4; i++) p4.trackedData.cities.cities.push({});

			setupPlayerManager([p1, p2, p3, p4]);
			setupTeams([
				[p1, p2],
				[p3, p4],
			]);
			GlobalGameData.matchState = 'inProgress';

			proGameLoop.onEndTurn(1);

			// Team 2 members should be eliminated
			expect(p3.status.isDead()).toBe(true);
			expect(p4.status.isDead()).toBe(true);
			// Team 1 members should survive
			expect(p1.status.isAlive()).toBe(true);
			expect(p2.status.isAlive()).toBe(true);
		});

		it('does NOT eliminate team when less than 2x deficit', () => {
			const p1 = createFakeActivePlayer(0);
			const p2 = createFakeActivePlayer(1);
			const p3 = createFakeActivePlayer(2);
			const p4 = createFakeActivePlayer(3);

			// Team 1: 18 cities, Team 2: 10 cities → 1.8x (not enough)
			for (let i = 0; i < 10; i++) p1.trackedData.cities.cities.push({});
			for (let i = 0; i < 8; i++) p2.trackedData.cities.cities.push({});
			for (let i = 0; i < 6; i++) p3.trackedData.cities.cities.push({});
			for (let i = 0; i < 4; i++) p4.trackedData.cities.cities.push({});

			setupPlayerManager([p1, p2, p3, p4]);
			setupTeams([
				[p1, p2],
				[p3, p4],
			]);
			GlobalGameData.matchState = 'inProgress';

			proGameLoop.onEndTurn(1);

			expect(p1.status.isAlive()).toBe(true);
			expect(p2.status.isAlive()).toBe(true);
			expect(p3.status.isAlive()).toBe(true);
			expect(p4.status.isAlive()).toBe(true);
		});
	});

	describe('Team promode 3v3 auto-loss', () => {
		beforeEach(() => {
			configureSettings({ diplomacy: 1, promode: 1 }); // Lobby teams + promode
		});

		it('eliminates weaker 3-player team', () => {
			const team1 = [createFakeActivePlayer(0), createFakeActivePlayer(1), createFakeActivePlayer(2)];
			const team2 = [createFakeActivePlayer(3), createFakeActivePlayer(4), createFakeActivePlayer(5)];

			// Team 1: 30 cities total (10 each)
			team1.forEach((p) => {
				for (let i = 0; i < 10; i++) p.trackedData.cities.cities.push({});
			});

			// Team 2: 15 cities total (5 each) → Team 1 has exactly 2x
			team2.forEach((p) => {
				for (let i = 0; i < 5; i++) p.trackedData.cities.cities.push({});
			});

			setupPlayerManager([...team1, ...team2]);
			setupTeams([team1, team2]);
			GlobalGameData.matchState = 'inProgress';

			proGameLoop.onEndTurn(1);

			// All team 2 members eliminated
			team2.forEach((p) => expect(p.status.isDead()).toBe(true));
			// All team 1 members survive
			team1.forEach((p) => expect(p.status.isAlive()).toBe(true));
		});

		it('survives when 3v3 deficit is less than 2x', () => {
			const team1 = [createFakeActivePlayer(0), createFakeActivePlayer(1), createFakeActivePlayer(2)];
			const team2 = [createFakeActivePlayer(3), createFakeActivePlayer(4), createFakeActivePlayer(5)];

			// Team 1: 28 cities, Team 2: 15 cities → 1.87x (not enough)
			for (let i = 0; i < 10; i++) team1[0].trackedData.cities.cities.push({});
			for (let i = 0; i < 10; i++) team1[1].trackedData.cities.cities.push({});
			for (let i = 0; i < 8; i++) team1[2].trackedData.cities.cities.push({});
			for (let i = 0; i < 5; i++) team2[0].trackedData.cities.cities.push({});
			for (let i = 0; i < 5; i++) team2[1].trackedData.cities.cities.push({});
			for (let i = 0; i < 5; i++) team2[2].trackedData.cities.cities.push({});

			setupPlayerManager([...team1, ...team2]);
			setupTeams([team1, team2]);
			GlobalGameData.matchState = 'inProgress';

			proGameLoop.onEndTurn(1);

			// Nobody eliminated
			[...team1, ...team2].forEach((p) => expect(p.status.isAlive()).toBe(true));
		});
	});

	describe('arbitrary team sizes (up to 23 players)', () => {
		beforeEach(() => {
			configureSettings({ diplomacy: 1, promode: 1 });
		});

		it('handles 4v4 with 2x deficit correctly', () => {
			const team1 = Array.from({ length: 4 }, (_, i) => createFakeActivePlayer(i));
			const team2 = Array.from({ length: 4 }, (_, i) => createFakeActivePlayer(i + 4));

			// Team 1: 40 cities (10 each), Team 2: 20 cities (5 each) → exactly 2x
			team1.forEach((p) => {
				for (let i = 0; i < 10; i++) p.trackedData.cities.cities.push({});
			});
			team2.forEach((p) => {
				for (let i = 0; i < 5; i++) p.trackedData.cities.cities.push({});
			});

			setupPlayerManager([...team1, ...team2]);
			setupTeams([team1, team2]);
			GlobalGameData.matchState = 'inProgress';

			proGameLoop.onEndTurn(1);

			team2.forEach((p) => expect(p.status.isDead()).toBe(true));
			team1.forEach((p) => expect(p.status.isAlive()).toBe(true));
		});

		it('handles uneven teams (3v2) correctly', () => {
			const team1 = Array.from({ length: 3 }, (_, i) => createFakeActivePlayer(i));
			const team2 = Array.from({ length: 2 }, (_, i) => createFakeActivePlayer(i + 3));

			// Team 1: 24 cities, Team 2: 12 cities → exactly 2x
			team1.forEach((p) => {
				for (let i = 0; i < 8; i++) p.trackedData.cities.cities.push({});
			});
			team2.forEach((p) => {
				for (let i = 0; i < 6; i++) p.trackedData.cities.cities.push({});
			});

			setupPlayerManager([...team1, ...team2]);
			setupTeams([team1, team2]);
			GlobalGameData.matchState = 'inProgress';

			proGameLoop.onEndTurn(1);

			team2.forEach((p) => expect(p.status.isDead()).toBe(true));
			team1.forEach((p) => expect(p.status.isAlive()).toBe(true));
		});

		it('handles large team game (11v11) with exactly 2x deficit', () => {
			const team1 = Array.from({ length: 11 }, (_, i) => createFakeActivePlayer(i));
			const team2 = Array.from({ length: 11 }, (_, i) => createFakeActivePlayer(i + 11));

			// Team 1: 44 cities (4 each), Team 2: 22 cities (2 each) → exactly 2x
			team1.forEach((p) => {
				for (let i = 0; i < 4; i++) p.trackedData.cities.cities.push({});
			});
			team2.forEach((p) => {
				for (let i = 0; i < 2; i++) p.trackedData.cities.cities.push({});
			});

			setupPlayerManager([...team1, ...team2]);
			setupTeams([team1, team2]);
			GlobalGameData.matchState = 'inProgress';

			proGameLoop.onEndTurn(1);

			team2.forEach((p) => expect(p.status.isDead()).toBe(true));
			team1.forEach((p) => expect(p.status.isAlive()).toBe(true));
		});

		it('handles 3-way team game', () => {
			const team1 = [createFakeActivePlayer(0), createFakeActivePlayer(1)];
			const team2 = [createFakeActivePlayer(2), createFakeActivePlayer(3)];
			const team3 = [createFakeActivePlayer(4), createFakeActivePlayer(5)];

			// Team 1: 20 cities, Team 2: 10, Team 3: 10
			// For team 2: opponents (team1 + team3) = 30 cities, team2 has 10 → 3x → eliminated
			// For team 3: opponents (team1 + team2) = 30 cities, team3 has 10 → 3x → eliminated
			team1.forEach((p) => {
				for (let i = 0; i < 10; i++) p.trackedData.cities.cities.push({});
			});
			team2.forEach((p) => {
				for (let i = 0; i < 5; i++) p.trackedData.cities.cities.push({});
			});
			team3.forEach((p) => {
				for (let i = 0; i < 5; i++) p.trackedData.cities.cities.push({});
			});

			setupPlayerManager([...team1, ...team2, ...team3]);
			setupTeams([team1, team2, team3]);
			GlobalGameData.matchState = 'inProgress';

			proGameLoop.onEndTurn(1);

			// Teams 2 and 3 face combined opposition ≥ 2x their cities
			team2.forEach((p) => expect(p.status.isDead()).toBe(true));
			team3.forEach((p) => expect(p.status.isDead()).toBe(true));
			team1.forEach((p) => expect(p.status.isAlive()).toBe(true));
		});
	});
});
