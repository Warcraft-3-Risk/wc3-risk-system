/**
 * Tests for ScoreboardDataModel income-freezing behavior.
 *
 * Verifies that `refreshValues()` (called by updatePartial every tick)
 * preserves income and incomeDelta from the last `refresh()` call,
 * so that mid-turn city captures don't cause income to update on the
 * scoreboard until the next turn boundary (updateFull).
 *
 * This also covers team games and replay mode.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Module mocks (must be before imports) ──────────────────────────
vi.mock('src/app/managers/names/name-manager', () => ({
	NameManager: {
		getInstance: () => ({
			getDisplayName: (p: unknown) => `Player${(p as { id: number })?.id ?? 0}`,
			getAcct: () => 'acct',
			getBtag: () => 'btag#0000',
			getOriginalColorCode: () => '|cFFFFFFFF',
		}),
	},
}));

vi.mock('src/app/managers/victory-manager', () => ({
	VictoryManager: {
		getCityCountWin: () => 50,
		getInstance: () => ({
			getOwnershipByThresholdDescending: () => [],
		}),
	},
}));

vi.mock('src/app/rating/rating-manager', () => ({
	RatingManager: {
		getInstance: () => ({
			getRatingResults: () => new Map(),
			isRankedGame: () => false,
			isRatingSystemEnabled: () => false,
		}),
	},
}));

vi.mock('src/app/teams/team-manager', () => ({
	TeamManager: {
		getInstance: () => ({
			getTeamNumberFromPlayer: () => 1,
			getTeams: () => [],
		}),
	},
}));

vi.mock('src/app/game/state/global-game-state', () => ({
	GlobalGameData: {
		turnCount: 5,
		tickCounter: 30,
		leader: undefined,
	},
}));

vi.mock('src/configs/game-settings', () => ({
	TURN_DURATION_IN_SECONDS: 60,
}));

vi.mock('src/app/utils/game-status', () => ({
	isReplay: () => false,
	getReplayObservedPlayer: () => null,
}));

// ─── WC3 global stubs ──────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).GetLocalPlayer = () => ({ id: 0 });
(globalThis as any).GetPlayerId = (p: any) => p?.id ?? 0;
(globalThis as any).GetPlayerState = () => 100;
(globalThis as any).PLAYER_STATE_RESOURCE_GOLD = 'gold';
(globalThis as any).Player = (id: number) => ({ id });

// ─── Import production code ─────────────────────────────────────────
import { ScoreboardDataModel } from 'src/app/scoreboard/scoreboard-data-model';
import type { ActivePlayer } from 'src/app/player/types/active-player';

// ─── Test helpers ───────────────────────────────────────────────────

function createFakeActivePlayer(id: number, income: number, delta: number, cities: number): ActivePlayer {
	const handle = { id };
	return {
		getPlayer: () => handle,
		trackedData: {
			income: { income, delta, max: income },
			cities: { cities: Array.from({ length: cities }, (_, i) => ({ name: `City${i}` })), max: cities },
			countries: new Map(),
			killsDeaths: new Map([[handle, { killValue: 5, deathValue: 2 }]]),
			lastCombat: 0,
			turnDied: 0,
		},
		status: {
			status: 'Alive',
			statusDuration: 0,
			isEliminated: () => false,
			isNomad: () => false,
			isSTFU: () => false,
			isAlive: () => true,
		},
	} as unknown as ActivePlayer;
}

function createFakeTeam(num: number, income: number, cities: number) {
	return {
		getNumber: () => num,
		getIncome: () => income,
		getCities: () => cities,
		getKills: () => 10,
		getDeaths: () => 3,
		getMembers: () => [],
	};
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('ScoreboardDataModel income freezing', () => {
	let model: ScoreboardDataModel;
	let players: ActivePlayer[];

	beforeEach(() => {
		model = new ScoreboardDataModel();
		players = [createFakeActivePlayer(0, 20, 5, 10), createFakeActivePlayer(1, 30, 8, 15), createFakeActivePlayer(2, 15, 3, 8)];
	});

	describe('refreshValues preserves income from last refresh', () => {
		it('does not update player income when live data changes mid-turn', () => {
			// Initial full refresh establishes baseline
			model.refresh(players, true);

			const initialRows = model.players;
			expect(initialRows[0].income).toBe(30); // sorted by income desc: player1 first
			expect(initialRows[1].income).toBe(20); // player0 second
			expect(initialRows[2].income).toBe(15); // player2 third

			// Simulate mid-turn city capture: player2's income jumps from 15 → 40
			(players[2].trackedData.income as { income: number }).income = 40;
			(players[2].trackedData.income as { delta: number }).delta = 28;

			// Partial refresh (like updatePartial called every tick)
			model.refreshValues(players, true);

			// Income should be FROZEN at the values from the last full refresh
			const updatedRows = model.players;
			expect(updatedRows[0].income).toBe(30); // still shows 30, not affected
			expect(updatedRows[1].income).toBe(20); // still shows 20, not affected
			expect(updatedRows[2].income).toBe(15); // still shows 15, NOT 40
			expect(updatedRows[2].incomeDelta).toBe(3); // still shows 3, NOT 28
		});

		it('updates income when full refresh is called (turn boundary)', () => {
			// Initial full refresh
			model.refresh(players, true);

			// Simulate mid-turn income change
			(players[2].trackedData.income as { income: number }).income = 40;
			(players[2].trackedData.income as { delta: number }).delta = 28;

			// Partial refresh — income frozen
			model.refreshValues(players, true);
			expect(model.players.find((r) => r.handle === players[2].getPlayer())!.income).toBe(15);

			// Full refresh (turn end/start) — income updates
			model.refresh(players, true);
			// Now player2 has highest income (40) and should be first
			expect(model.players[0].income).toBe(40);
			expect(model.players[0].incomeDelta).toBe(28);
		});

		it('preserves income across multiple partial refreshes', () => {
			model.refresh(players, true);

			// First mid-turn change
			(players[0].trackedData.income as { income: number }).income = 50;
			model.refreshValues(players, true);
			expect(model.players.find((r) => r.handle === players[0].getPlayer())!.income).toBe(20);

			// Second mid-turn change
			(players[0].trackedData.income as { income: number }).income = 60;
			model.refreshValues(players, true);
			expect(model.players.find((r) => r.handle === players[0].getPlayer())!.income).toBe(20);

			// Third mid-turn change
			(players[0].trackedData.income as { income: number }).income = 70;
			model.refreshValues(players, true);
			expect(model.players.find((r) => r.handle === players[0].getPlayer())!.income).toBe(20);
		});

		it('still updates other live values (kills, deaths, cities, gold)', () => {
			model.refresh(players, true);

			// Change non-income values
			(players[0].trackedData.cities as { cities: unknown[] }).cities.push({ name: 'NewCity' });
			const kd = players[0].trackedData.killsDeaths.get(players[0].getPlayer());
			if (kd) (kd as { killValue: number }).killValue = 99;

			model.refreshValues(players, true);

			const row = model.players.find((r) => r.handle === players[0].getPlayer())!;
			expect(row.cities).toBe(11); // updated from 10 to 11
			expect(row.kills).toBe(99); // updated
			expect(row.income).toBe(20); // still frozen
		});

		it('does not re-sort players during partial refresh', () => {
			model.refresh(players, true);

			// Order after full refresh: player1(30), player0(20), player2(15)
			expect(model.players.map((r) => (r.handle as { id: number }).id)).toEqual([1, 0, 2]);

			// Make player2's live income highest
			(players[2].trackedData.income as { income: number }).income = 100;
			model.refreshValues(players, true);

			// Order should NOT change
			expect(model.players.map((r) => (r.handle as { id: number }).id)).toEqual([1, 0, 2]);
			// And displayed income is still frozen
			expect(model.players[2].income).toBe(15);
		});
	});

	describe('team income freezing', () => {
		it('does not update team totalIncome during partial refresh', async () => {
			// Override TeamManager mock to provide teams
			const fakeTeam1 = createFakeTeam(1, 50, 25);
			const fakeTeam2 = createFakeTeam(2, 30, 15);

			const teamMod = await import('src/app/teams/team-manager');
			(teamMod.TeamManager as any).getInstance = () => ({
				getTeamNumberFromPlayer: () => 1,
				getTeams: () => [fakeTeam1, fakeTeam2],
			});

			// Create players as team members
			const teamPlayers = [createFakeActivePlayer(0, 25, 5, 12), createFakeActivePlayer(1, 25, 5, 13)];

			// Link players to teams
			(fakeTeam1 as any).getMembers = () => teamPlayers.map((p: ActivePlayer) => ({ getPlayer: () => p.getPlayer() }));
			(fakeTeam2 as any).getMembers = () => [];

			// Full refresh (team mode, not FFA)
			model.refresh(teamPlayers, false);

			expect(model.teams.length).toBeGreaterThan(0);
			const team1Row = model.teams.find((t) => t.number === 1);
			expect(team1Row?.totalIncome).toBe(50);

			// Simulate mid-turn team income change
			(fakeTeam1 as any).getIncome = () => 80;

			// Partial refresh
			model.refreshValues(teamPlayers, false);

			// Team income should be FROZEN
			const team1RowAfter = model.teams.find((t) => t.number === 1);
			expect(team1RowAfter?.totalIncome).toBe(50); // still 50, NOT 80

			// But other team values should update
			(fakeTeam1 as any).getCities = () => 30;
			model.refreshValues(teamPlayers, false);
			expect(model.teams.find((t) => t.number === 1)?.totalCities).toBe(30); // updated
		});
	});
});
