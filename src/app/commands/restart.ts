import { GlobalGameData } from '../game/state/global-game-state';
import { ChatManager } from '../managers/chat-manager';
import { EventEmitter } from '../utils/events/event-emitter';
import { EVENT_ON_PLAYER_RESTART } from '../utils/events/event-constants';
import { PlayerManager } from '../player/player-manager';

export function RestartCommand(chatManager: ChatManager) {
	chatManager.addCmd(['-ng'], async () => {
		if (GlobalGameData.matchState != 'postMatch') return;
		EventEmitter.getInstance().emit(EVENT_ON_PLAYER_RESTART, PlayerManager.getInstance().players.get(GetTriggerPlayer()));
	});
}
