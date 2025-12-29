import { ActivePlayer } from '../player/types/active-player';

/**
 * IncomeManager handles the distribution of periodic income to players.
 */
export class IncomeManager {
	private constructor() {
		// Private constructor to enforce singleton-like usage through static methods
	}

	/**
	 * Gives income to a player.
	 *
	 * @param player - The player to give income to
	 */
	public static giveIncome(player: ActivePlayer): void {
		player.giveGold();
	}
}
