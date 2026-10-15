import { PlayerManager } from '../player/player-manager';

/**
 * True when exactly one human is in the game (computer players do not count).
 * Used to unlock sandbox and testing commands such as -g, -kill, -dcap and -skip
 * without needing a special developer build.
 */
export function isSingleplayer(): boolean {
	return PlayerManager.getInstance().getHumanPlayersCount() === 1;
}
