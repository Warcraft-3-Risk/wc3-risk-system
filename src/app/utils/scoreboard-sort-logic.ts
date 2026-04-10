/**
 * Pure scoreboard sorting and combat-detection logic extracted for testing.
 *
 * Operates on plain data interfaces that mirror the relevant fields of
 * `PlayerRow` and `TeamRow` from `scoreboard-data-model.ts`.
 */

export interface SortablePlayer {
	/** Unique player identifier for tie-breaking. */
	playerId: number;
	/** Current income value (higher = better). */
	income: number;
	/** Whether the player has been eliminated. */
	isEliminated: boolean;
	/** Turn number on which the player was eliminated (0 if alive). */
	turnDied: number;
}

export interface SortableTeam {
	/** Unique team number for tie-breaking. */
	teamNumber: number;
	/** Total team income (higher = better). */
	totalIncome: number;
}

/**
 * Sort players for the scoreboard:
 *   1. Active players come before eliminated players.
 *   2. Among active players: higher income first, tie-break by player ID ascending.
 *   3. Among eliminated players: most recently died first, tie-break by player ID ascending.
 *
 * Returns a new sorted array (does not mutate the input).
 */
export function sortPlayers(players: SortablePlayer[]): SortablePlayer[] {
	return [...players].sort((a, b) => {
		if (!a.isEliminated && b.isEliminated) return -1;
		if (a.isEliminated && !b.isEliminated) return 1;

		if (a.isEliminated && b.isEliminated) {
			if (a.turnDied > b.turnDied) return -1;
			if (a.turnDied < b.turnDied) return 1;
			return a.playerId - b.playerId;
		}

		if (a.income < b.income) return 1;
		if (a.income > b.income) return -1;
		return a.playerId - b.playerId;
	});
}

/**
 * Sort teams for the scoreboard:
 *   1. Higher total income first.
 *   2. Tie-break by team number ascending.
 *
 * Returns a new sorted array (does not mutate the input).
 */
export function sortTeams(teams: SortableTeam[]): SortableTeam[] {
	return [...teams].sort((a, b) => {
		if (a.totalIncome < b.totalIncome) return 1;
		if (a.totalIncome > b.totalIncome) return -1;
		return a.teamNumber - b.teamNumber;
	});
}

/**
 * Determine whether a player is "in combat" on the scoreboard.
 *
 * @param gameTimeInSeconds - Elapsed game time in seconds.
 * @param lastCombat - Timestamp (in seconds) of the player's last combat event.
 * @param combatWindow - Duration (in seconds) after last combat during which the player is still considered in combat. Default 15.
 * @param gracePeriod - Early-game grace period (in seconds) before combat detection activates. Default 15.
 */
export function isInCombat(
	gameTimeInSeconds: number,
	lastCombat: number,
	combatWindow: number = 15,
	gracePeriod: number = 15
): boolean {
	return gameTimeInSeconds > gracePeriod && gameTimeInSeconds - lastCombat <= combatWindow;
}
