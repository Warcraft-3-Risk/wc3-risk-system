import { debugPrint } from '../utils/debug-print';
import { NameManager } from './names/name-manager';
import { GlobalMessage } from '../utils/messages';
import { PlayerManager } from '../player/player-manager';
import { getElapsedTime } from 'w3ts';

/**
 * Singleton class responsible for managing draw.
 */
export class W3CDrawManager {
	private static instance: W3CDrawManager;
	private playersVoted: Set<player> = new Set();

	private constructor() {}

	static getInstance(): W3CDrawManager {
		if (!W3CDrawManager.instance) {
			W3CDrawManager.instance = new W3CDrawManager();
		}
		return W3CDrawManager.instance;
	}

	startDrawVote(triggeringPlayer: player): void {
		if (getElapsedTime() > 120) {
			DisplayTextToPlayer(
				triggeringPlayer,
				0,
				0,
				`|cff00ff00[W3C]:|r The|cffffff00 -draw|r command is disabled after two minutes of gameplay.`
			);
			return;
		}

		if (this.playersVoted.has(triggeringPlayer)) {
			debugPrint('[DrawManager] Player already voted for draw.');
			return;
		}

		// Player has voted
		this.playersVoted.add(triggeringPlayer);

		const remainingPlayers = PlayerManager.getInstance().getCurrentActiveHumanPlayers();
		let remainingPlayerVoteCount = remainingPlayers.length - this.playersVoted.size;

		if (this.playersVoted.size == 1) {
			print(
				`|cff00ff00[W3C]:|r|cffFF4500 ${NameManager.getInstance().getDisplayName(triggeringPlayer)}|r is proposing to cancel this game. \nType|cffffff00 -draw|r to cancel the game. ${remainingPlayerVoteCount} player(s) remaining.`
			);
		} else {
			print(
				`|cff00ff00[W3C]:|r|cffFF4500 ${NameManager.getInstance().getDisplayName(triggeringPlayer)}|r votes to cancel this game. ${remainingPlayerVoteCount} player(s) remaining.`
			);
		}

		// Check if all remaining players agreed
		if (remainingPlayerVoteCount === 0) {
			for (const player of remainingPlayers) {
				RemovePlayerPreserveUnitsBJ(player.getPlayer(), PLAYER_GAME_RESULT_NEUTRAL, false);
			}
		}
	}
}
