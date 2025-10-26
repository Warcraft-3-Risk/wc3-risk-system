import { ActivePlayer } from '../player/types/active-player';
import { BASE_GOLD_CAP, GOLD_CAP_PER_CITY } from 'src/configs/game-settings';

/**
 * IncomeManager handles the distribution of periodic income to players with a soft gold cap.
 *
 * The soft cap formula is: Gold cap = BASE_GOLD_CAP + (cityCount * GOLD_CAP_PER_CITY)
 * Default: 100 + (cityCount * 10)
 *
 * - Regular income (from cities/countries) is capped - players won't receive income if at or above the cap
 * - Bounty and bonus gold are NOT capped - players can exceed the cap through kills and combat bonuses
 */
export class IncomeManager {
	private constructor() {
		// Private constructor to enforce singleton-like usage through static methods
	}

	/**
	 * Calculates the gold cap for a player based on their city count.
	 * Formula: BASE_GOLD_CAP + (cityCount * GOLD_CAP_PER_CITY)
	 *
	 * @param player - The player to calculate the gold cap for
	 * @returns The gold cap for the player
	 */
	public static calculateGoldCap(player: ActivePlayer): number {
		const cityCount = player.trackedData.cities.cities.length;
		return BASE_GOLD_CAP + cityCount * GOLD_CAP_PER_CITY;
	}

	/**
	 * Gives income to a player, respecting the soft gold cap.
	 *
	 * If the player's current gold is at or above their cap, no income is given.
	 * If giving full income would exceed the cap, only gives enough to reach the cap.
	 * Otherwise, the player receives their full income amount.
	 *
	 * Note: This only affects periodic income. Bounty and bonus gold bypass this cap
	 * by calling player.giveGold() directly with specific amounts.
	 *
	 * @param player - The player to give income to
	 */
	public static giveIncome(player: ActivePlayer): void {
		const currentGold = GetPlayerState(player.getPlayer(), PLAYER_STATE_RESOURCE_GOLD);
		const goldCap = this.calculateGoldCap(player);
		const incomeAmount = player.trackedData.income.income;

		// Soft cap: only prevent income if at or above cap
		if (currentGold >= goldCap) {
			// Player is at or above their gold cap, don't give income
			return;
		}

		// Calculate how much gold would put them over the cap
		const goldAfterIncome = currentGold + incomeAmount;

		if (goldAfterIncome > goldCap) {
			// Would exceed cap, only give enough to reach the cap
			const cappedAmount = goldCap - currentGold;
			player.giveGold(cappedAmount);
		} else {
			// Give the player their full regular income
			player.giveGold();
		}
	}
}
