import { GlobalGameData } from '../game/state/global-game-state';
import { ChatManager } from '../managers/chat-manager';
import { NameManager } from '../managers/names/name-manager';
import { PlayerManager } from '../player/player-manager';
import { EVENT_ON_PLAYER_FORFEIT } from '../utils/events/event-constants';
import { EventEmitter } from '../utils/events/event-emitter';
import { ErrorMsg } from '../utils/messages';
import { EDITOR_DEVELOPER_MODE } from 'src/configs/game-settings';

export function KillCommand(chatManager: ChatManager, nameManager: NameManager, playerManager: PlayerManager) {
	if (!EDITOR_DEVELOPER_MODE) return;

	chatManager.addCmd(['-kill'], () => {
		if (GlobalGameData.matchState !== 'inProgress') return;

		const arg = GetEventPlayerChatString().split(' ')[1];

		if (!arg) {
			ErrorMsg(GetTriggerPlayer(), 'Usage: -kill <color/name>');
			return;
		}

		const players: player[] = nameManager.getPlayersByAnyName(arg);

		if (players.length >= 2) {
			ErrorMsg(GetTriggerPlayer(), 'Multiple players found, be more specific!');
		} else if (players.length <= 0) {
			ErrorMsg(GetTriggerPlayer(), 'Player not found!');
		} else {
			const target = playerManager.players.get(players[0]);

			if (!target || target.status.isEliminated()) {
				ErrorMsg(GetTriggerPlayer(), 'Player is already eliminated!');
				return;
			}

			EventEmitter.getInstance().emit(EVENT_ON_PLAYER_FORFEIT, target);
		}
	});
}
