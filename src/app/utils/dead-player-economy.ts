import { ActivePlayer } from '../player/types/active-player';
import { SettingsContext } from '../settings/settings-context';

/**
 * In every team game an eliminated player - dead (e.g. forfeited with -ff), left or muted (STFU) -
 * keeps a normal economy: they still earn income and gold, and their income and gold columns keep
 * working. They just cannot control their own units anymore, their teammates use them through
 * shared control.
 *
 * Only FFA keeps the regular behavior where elimination ends the player's economy.
 */
export function keepsEconomyWhenEliminated(player: ActivePlayer): boolean {
	if (!player.status.isEliminated()) return false;

	return !SettingsContext.getInstance().isFFA();
}

/**
 * Whether the player currently earns income and gold: alive or nomad players, plus eliminated players in team games.
 */
export function hasEconomy(player: ActivePlayer): boolean {
	return player.status.isActive() || keepsEconomyWhenEliminated(player);
}
