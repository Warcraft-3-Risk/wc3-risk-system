import { GlobalGameData } from '../game/state/global-game-state';
import { SessionBoard } from '../scoreboard/session-board';

/**
 * Adds the current match's kill/death values to the running session totals.
 *
 * Tracked data is reset between matches, so this has to run at the end of every match - or the
 * earlier matches' kills are lost.
 */
export function recordSessionKillsDeaths(sessionBoard: SessionBoard): void {
	GlobalGameData.matchPlayers.forEach((player) => {
		const killsDeaths = player.trackedData.killsDeaths.get(player.getPlayer());

		if (killsDeaths) {
			sessionBoard.recordKillsDeaths(player, killsDeaths.killValue, killsDeaths.deathValue);
		}
	});
}
