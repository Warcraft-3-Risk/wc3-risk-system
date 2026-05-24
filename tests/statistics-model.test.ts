/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubGlobal('FourCC', (_str: string) => 0);
vi.stubGlobal('os', {
	date: (_format: string) => {
		const d = new Date();
		const pad = (n: number) => (n < 10 ? '0' + n : n);
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
	},
});

vi.mock('src/configs/unit-id', () => ({
	UNIT_ID: {},
}));

// Mocks
vi.mock('w3ts', () => ({
	File: class {
		public static write() {}
		public static read() {}
	},
	Unit: class {},
}));

vi.mock('w3ts/system/file', () => ({
	File: class {
		public static write() {}
		public static read() {}
	},
}));

vi.mock('src/app/ui/player-preference-buttons', () => ({}));

vi.mock('src/app/utils/player-colors', () => ({
	PLAYER_COLORS: [],
}));

vi.mock('src/app/rating/rating-manager', () => ({
	RatingManager: {
		getInstance: () => ({
			getRatingResults: () => new Map(),
			isRankedGame: () => false,
		}),
	},
}));

vi.mock('src/app/managers/settings/settings-manager', () => ({
	settingsManager: {
		getSettings: () => ({
			Overtime: { option: 1 },
			Fog: 0,
		}),
	},
}));

vi.mock('src/app/utils/utils', () => ({
	MAP_TYPE: 'risk',
	MAP_VERSION: '1.0.0',
	PLAYER_COLOR_CODES: [],
	AddLeadingZero: (v: number) => (v < 10 ? '0' + v : v),
}));

vi.mock('src/app/managers/names/name-manager', () => ({
	NameManager: {
		getInstance: () => ({
			getDisplayName: (p: unknown) => `Player${(p as { id: number })?.id ?? 0}`,
			getAcct: (p: unknown) => `acct${(p as { id: number })?.id ?? 0}`,
			getBtag: (p: unknown) => `btag#${(p as { id: number })?.id ?? 0}`,
			getOriginalColorCode: () => '|cFFFFFFFF',
			getDisplayColorCode: () => '|cFFFFFFFF',
		}),
	},
}));

vi.mock('src/app/game/state/global-game-state', () => ({
	GlobalGameData: {
		turnCount: 10,
		tickCounter: 60,
	},
}));

vi.mock('src/configs/game-settings', () => ({
	TURN_DURATION_IN_SECONDS: 60,
	DEBUG_PRINTS: { master: false },
	MAP_NAME: 'risk',
	MAP_VERSION: '1.0',
	W3C_MODE_ENABLED: false,
}));

let mockGetTeams: any[] = [];
let mockGetTeamFromPlayer: any = null;

vi.mock('src/app/teams/team-manager', () => ({
	TeamManager: {
		getInstance: () => ({
			getTeams: () => mockGetTeams,
			getTeamFromPlayer: mockGetTeamFromPlayer,
		}),
	},
}));

// WC3 globabl stubs
/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).Player = (id: number) => ({ id });
(globalThis as any).GetLocalPlayer = () => ({ id: 0 });
(globalThis as any).GetPlayerId = (p: any) => p?.id ?? 0;
(globalThis as any).GetPlayerState = () => 100;
(globalThis as any).PLAYER_STATE_RESOURCE_GOLD = 'gold';
(globalThis as any).BlzFrameGetText = () => '10';
(globalThis as any).BlzGetFrameByName = () => ({});
(globalThis as any).FourCC = (_str: string) => 0;
(globalThis as any).os = {
	date: (_format: string) => {
		const d = new Date();
		const pad = (n: number) => (n < 10 ? '0' + n : n);
		// simple mock for os.date('%Y-%m-%d %H:%M:%S')
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
	},
};

import { StatisticsModel } from '../src/app/statistics/statistics-model';
import type { ActivePlayer } from '../src/app/player/types/active-player';
import type { Team } from '../src/app/teams/team';

describe('StatisticsModel', () => {
	const createFakeActivePlayer = (id: number, isEliminated: boolean, turnDied: number): ActivePlayer => {
		const handle = { id };
		return {
			getPlayer: () => handle,
			trackedData: {
				turnDied,
				cities: { max: 10 },
				income: { max: 100 },
				killsDeaths: new Map(),
				bounties: 50,
				bonus: 20,
			},
			status: {
				isEliminated: () => isEliminated,
			},
		} as unknown as ActivePlayer;
	};

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 3, 28, 22, 14, 7)); // April 28 2026, 22:14:07

		const p1 = createFakeActivePlayer(1, false, 0); // survived
		const p2 = createFakeActivePlayer(2, true, 5); // died turn 5
		const p3 = createFakeActivePlayer(3, true, 8); // died turn 8
		const p4 = createFakeActivePlayer(4, true, 2); // died turn 2

		const teamA = {
			getNumber: () => 1,
			getMembers: () => [p1, p2],
		} as unknown as Team;

		const teamB = {
			getNumber: () => 2,
			getMembers: () => [p3, p4],
		} as unknown as Team;

		mockGetTeams = [teamA, teamB];
		mockGetTeamFromPlayer = (player: any) => (player.id === 1 || player.id === 2 ? teamA : teamB);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should append OS Time to the formatted game time', () => {
		const model = new StatisticsModel(new Map());
		model.setGameTime();

		// Using our fixed system time: '2026-04-28 22:14:07'
		expect(model.getTimePlayed()).toContain('OS Time:|r 2026-04-28 22:14:07');
		expect(model.getTimePlayed()).toContain('Game Time:|r');
	});

	it('should correctly sort teams by longest survival time based on max turnDied when no teams survived', () => {
		// all eliminated scenario
		const p1 = createFakeActivePlayer(1, true, 10);
		const p2 = createFakeActivePlayer(2, true, 5);
		const p3 = createFakeActivePlayer(3, true, 8);
		const p4 = createFakeActivePlayer(4, true, 2);
		p1.trackedData.cities = { cities: [] };
		p2.trackedData.cities = { cities: [] };
		p3.trackedData.cities = { cities: [] };
		p4.trackedData.cities = { cities: [] };

		const teamA = {
			getNumber: () => 1,
			getMembers: () => [p1, p2],
		} as unknown as Team;

		const teamB = {
			getNumber: () => 2,
			getMembers: () => [p3, p4],
		} as unknown as Team;

		mockGetTeams = [teamA, teamB];

		const model = new StatisticsModel([]);

		// Call private sortTeamsByRank bypassing encapsulation
		const sortedPlayers = (model as any).sortTeamsByRank(mockGetTeams);

		// sortedPlayers will be the flattened players of teamA followed by teamB
		// Team A survived until turn 10. Team B survived until turn 8.
		// Sort is descending, so Team A should be first.
		expect(sortedPlayers[0].getPlayer().id).toBe(1);
		expect(sortedPlayers[1].getPlayer().id).toBe(2);
		expect(sortedPlayers[2].getPlayer().id).toBe(3);
		expect(sortedPlayers[3].getPlayer().id).toBe(4);
	});

	it('should correctly sort teams with someone still alive (lives to 999999 turns)', () => {
		// p1 alive (teamA longest life 999999)
		// teamB max life is turn 8 (p3)
		const p1 = createFakeActivePlayer(1, false, 0); // alive
		const p2 = createFakeActivePlayer(2, true, 5);
		const p3 = createFakeActivePlayer(3, true, 8);
		const p4 = createFakeActivePlayer(4, true, 2);

		p1.trackedData.cities = { cities: [] };
		p2.trackedData.cities = { cities: [] };
		p3.trackedData.cities = { cities: [] };
		p4.trackedData.cities = { cities: [] };

		const teamA = {
			getNumber: () => 1,
			getMembers: () => [p1, p2],
		} as unknown as Team;

		const teamB = {
			getNumber: () => 2,
			getMembers: () => [p3, p4],
		} as unknown as Team;

		mockGetTeams = [teamB, teamA]; // intentionally reverse order array

		const model = new StatisticsModel([]);
		const sortedPlayers = (model as any).sortTeamsByRank(mockGetTeams);

		// Team A should be first because one member survived until the end.
		expect(sortedPlayers[0].getPlayer().id).toBe(1);
		expect(sortedPlayers[1].getPlayer().id).toBe(2);
		expect(sortedPlayers[2].getPlayer().id).toBe(3);
		expect(sortedPlayers[3].getPlayer().id).toBe(4);
	});
});
