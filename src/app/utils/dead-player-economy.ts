import { ActivePlayer } from '../player/types/active-player';
import { SettingsContext } from '../settings/settings-context';

/**
 * In team promode (ProMode or Chaos with teams) a dead player - e.g. one who forfeited
 * with -ff - keeps a normal economy: they still earn income and gold, and their income and gold
 * columns keep working. They just cannot control their own units anymore.
 *
 * Every other mode, FFA included, keeps the regular behavior where death ends the player's economy.
 */
export function keepsEconomyWhenDead(player: ActivePlayer): boolean {
	if (!player.status.isDead()) return false;

	const settings = SettingsContext.getInstance();

	if (settings.isFFA()) return false;

	return settings.isPromode() || settings.isChaosPromode();
}

/**
 * Whether the player currently earns income and gold: alive or nomad players, plus dead players in team promode.
 */
export function hasEconomy(player: ActivePlayer): boolean {
	return player.status.isActive() || keepsEconomyWhenDead(player);
}
