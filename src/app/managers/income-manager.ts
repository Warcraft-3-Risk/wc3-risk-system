import { ActivePlayer } from '../player/types/active-player';
import { RandomEventManager } from '../events/random-event-manager';
import { STARTING_INCOME, CHAOS_STARTING_INCOME } from 'src/configs/game-settings';
import { SettingsContext } from '../settings/settings-context';

/**
 * IncomeManager handles the distribution of periodic income to players.
 */
export class IncomeManager {
	private constructor() {
		// Private constructor to enforce singleton-like usage through static methods
	}

	/**
	 * Gives income to a player.
	 * When random events modify the income multiplier, the bonus portion of income
	 * (country/region bonuses) is scaled while base income remains unchanged.
	 *
	 * @param player - The player to give income to
	 */
	public static giveIncome(player: ActivePlayer): void {
		const multiplier = RandomEventManager.getInstance().incomeMultiplier;

		if (multiplier === 1.0) {
			player.giveGold();
			return;
		}

		const totalIncome = player.trackedData.income.income;
		const baseIncome = SettingsContext.getInstance().isChaosPromode() ? CHAOS_STARTING_INCOME : STARTING_INCOME;
		const bonusPortion = Math.max(0, totalIncome - baseIncome);
		const adjustedIncome = baseIncome + Math.floor(bonusPortion * multiplier);

		player.giveGold(adjustedIncome);
	}
}
