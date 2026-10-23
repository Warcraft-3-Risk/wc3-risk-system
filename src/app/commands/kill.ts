import { GlobalGameData } from '../game/state/global-game-state';
import { ChatManager } from '../managers/chat-manager';
import { NameManager } from '../managers/names/name-manager';
import { PlayerManager } from '../player/player-manager';
import { EVENT_ON_PLAYER_FORFEIT } from '../utils/events/event-constants';
import { EventEmitter } from '../utils/events/event-emitter';
import { ErrorMsg } from '../utils/messages';
import { EDITOR_DEVELOPER_MODE } from 'src/configs/game-settings';
import { isSingleplayer } from '../utils/singleplayer';

/**
 * Developer-only command that eliminates the given player as if they had forfeited.
 * Only registered in developer builds (EDITOR_DEVELOPER_MODE) or single-player games.
 * Usage: -kill <color/name>
 */
export function KillCommand(chatManager: ChatManager, nameManager: NameManager, playerManager: PlayerManager) {
	if (!EDITOR_DEVELOPER_MODE && !isSingleplayer()) return;

	chatManager.addCmd(['-kill'], () => {
		if (GlobalGameData.matchState != 'inProgress') return;

		const sender: player = GetTriggerPlayer();
		const arg: string = GetEventPlayerChatString().split(' ')[1];

		if (!arg) {
			ErrorMsg(sender, 'Usage: -kill <color/name>');
			return;
		}

		const players: player[] = nameManager.getPlayersByAnyName(arg);

		if (players.length >= 2) {
			ErrorMsg(sender, 'Multiple players found, be more specific!');
		} else if (players.length <= 0) {
			ErrorMsg(sender, 'Player not found!');
		} else {
			const target = playerManager.players.get(players[0]);

			if (!target || target.status.isEliminated()) {
				ErrorMsg(sender, 'Player is already eliminated!');
				return;
			}

			EventEmitter.getInstance().emit(EVENT_ON_PLAYER_FORFEIT, target);
		}
	});
}
