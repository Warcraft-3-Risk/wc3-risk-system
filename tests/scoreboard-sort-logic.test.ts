import { describe, it, expect } from 'vitest';
import { sortPlayers, sortTeams, isInCombat, type SortablePlayer, type SortableTeam } from '../src/app/utils/scoreboard-sort-logic';

// ─── Helpers ────────────────────────────────────────────────────────

function player(id: number, income: number, isEliminated = false, turnDied = 0): SortablePlayer {
	return { playerId: id, income, isEliminated, turnDied };
}

function team(number: number, totalIncome: number): SortableTeam {
	return { teamNumber: number, totalIncome };
}

// ─── sortPlayers ────────────────────────────────────────────────────

describe('sortPlayers', () => {
	it('does not mutate the input array', () => {
		const input = [player(2, 100), player(1, 200)];
		const copy = [...input];
		sortPlayers(input);
		expect(input).toEqual(copy);
	});

	it('active players come before eliminated players', () => {
		const result = sortPlayers([player(1, 50, true, 3), player(2, 10)]);
		expect(result[0].playerId).toBe(2);
		expect(result[1].playerId).toBe(1);
	});

	it('active players sorted by income descending', () => {
		const result = sortPlayers([player(1, 50), player(2, 200), player(3, 100)]);
		expect(result.map((p) => p.playerId)).toEqual([2, 3, 1]);
	});

	it('active players tie-break by player ID ascending', () => {
		const result = sortPlayers([player(3, 100), player(1, 100), player(2, 100)]);
		expect(result.map((p) => p.playerId)).toEqual([1, 2, 3]);
	});

	it('eliminated players sorted by turn died descending (most recent first)', () => {
		const result = sortPlayers([player(1, 0, true, 2), player(2, 0, true, 5), player(3, 0, true, 3)]);
		expect(result.map((p) => p.playerId)).toEqual([2, 3, 1]);
	});

	it('eliminated players tie-break by player ID when same turn died', () => {
		const result = sortPlayers([player(3, 0, true, 5), player(1, 0, true, 5), player(2, 0, true, 5)]);
		expect(result.map((p) => p.playerId)).toEqual([1, 2, 3]);
	});

	it('mixed active and eliminated — full sort', () => {
		const result = sortPlayers([
			player(1, 50, true, 2), // eliminated turn 2
			player(2, 200), // active, high income
			player(3, 0, true, 5), // eliminated turn 5
			player(4, 100), // active, medium income
			player(5, 200), // active, high income (tie with p2)
		]);
		expect(result.map((p) => p.playerId)).toEqual([2, 5, 4, 3, 1]);
	});

	it('all eliminated players', () => {
		const result = sortPlayers([player(1, 0, true, 1), player(2, 0, true, 3), player(3, 0, true, 2)]);
		expect(result.map((p) => p.playerId)).toEqual([2, 3, 1]);
	});

	it('single player', () => {
		const result = sortPlayers([player(1, 100)]);
		expect(result).toHaveLength(1);
		expect(result[0].playerId).toBe(1);
	});

	it('empty array', () => {
		expect(sortPlayers([])).toEqual([]);
	});

	it('24 players — stress test', () => {
		const players: SortablePlayer[] = [];
		for (let i = 0; i < 24; i++) {
			const isElim = i >= 12;
			players.push(player(i, isElim ? 0 : (i * 13 + 7) % 500, isElim, isElim ? i : 0));
		}
		const result = sortPlayers(players);
		expect(result).toHaveLength(24);

		// All active come before all eliminated
		const firstElimIdx = result.findIndex((p) => p.isEliminated);
		const lastActiveIdx = result.findLastIndex((p) => !p.isEliminated);
		if (firstElimIdx !== -1 && lastActiveIdx !== -1) {
			expect(lastActiveIdx).toBeLessThan(firstElimIdx);
		}
	});

	it('sort is stable for equal elements', () => {
		// Players with identical income should maintain ID-based ordering
		const input = Array.from({ length: 10 }, (_, i) => player(i, 100));
		const result = sortPlayers(input);
		expect(result.map((p) => p.playerId)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});
});

// ─── sortTeams ──────────────────────────────────────────────────────

describe('sortTeams', () => {
	it('does not mutate the input array', () => {
		const input = [team(2, 100), team(1, 200)];
		const copy = [...input];
		sortTeams(input);
		expect(input).toEqual(copy);
	});

	it('sorts by income descending', () => {
		const result = sortTeams([team(1, 100), team(2, 300), team(3, 200)]);
		expect(result.map((t) => t.teamNumber)).toEqual([2, 3, 1]);
	});

	it('tie-breaks by team number ascending', () => {
		const result = sortTeams([team(3, 100), team(1, 100), team(2, 100)]);
		expect(result.map((t) => t.teamNumber)).toEqual([1, 2, 3]);
	});

	it('single team', () => {
		const result = sortTeams([team(1, 100)]);
		expect(result).toHaveLength(1);
	});

	it('empty array', () => {
		expect(sortTeams([])).toEqual([]);
	});
});

// ─── isInCombat ─────────────────────────────────────────────────────

describe('isInCombat', () => {
	it('returns true when recently in combat', () => {
		expect(isInCombat(30, 20)).toBe(true); // 30-20=10 <= 15
	});

	it('returns false when combat was too long ago', () => {
		expect(isInCombat(50, 20)).toBe(false); // 50-20=30 > 15
	});

	it('returns false during grace period (gameTime <= 15)', () => {
		expect(isInCombat(10, 5)).toBe(false);
		expect(isInCombat(15, 10)).toBe(false);
	});

	it('returns true at exactly grace period + 1 with recent combat', () => {
		expect(isInCombat(16, 10)).toBe(true); // 16>15 && 16-10=6<=15
	});

	it('returns true at exactly combat window boundary', () => {
		expect(isInCombat(30, 15)).toBe(true); // 30-15=15 <= 15
	});

	it('returns false just past combat window boundary', () => {
		expect(isInCombat(31, 15)).toBe(false); // 31-15=16 > 15
	});

	it('returns false when lastCombat is 0 (never fought) and game is young', () => {
		expect(isInCombat(5, 0)).toBe(false);
	});

	it('returns true when lastCombat is 0 but game time is within window (edge case)', () => {
		// gameTime=16, lastCombat=0 → 16-0=16 > 15 → false
		expect(isInCombat(16, 0)).toBe(false);
		// gameTime=16, lastCombat=5 → 16-5=11 <= 15 → true
		expect(isInCombat(16, 5)).toBe(true);
	});

	it('supports custom combat window', () => {
		expect(isInCombat(30, 20, 5)).toBe(false); // 30-20=10 > 5
		expect(isInCombat(30, 28, 5)).toBe(true); // 30-28=2 <= 5
	});

	it('supports custom grace period', () => {
		expect(isInCombat(20, 15, 15, 25)).toBe(false); // gameTime 20 <= gracePeriod 25
		expect(isInCombat(30, 25, 15, 25)).toBe(true); // gameTime 30 > 25 && 30-25=5<=15
	});
});
