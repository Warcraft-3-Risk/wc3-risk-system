import { GlobalGameData } from '../game/state/global-game-state';
import { ChatManager } from '../managers/chat-manager';
import { PlayerManager } from '../player/player-manager';
import { EVENT_ON_PLAYER_FORFEIT } from '../utils/events/event-constants';
import { EventEmitter } from '../utils/events/event-emitter';

export function ForfeitCommand(chatManager: ChatManager, playerManager: PlayerManager) {
	chatManager.addCmd(['-gg', '-ff', '-forfeit'], () => {
		if (GlobalGameData.matchState === 'postMatch') return;
		const player = PlayerManager.getInstance().players.get(GetTriggerPlayer());
		EventEmitter.getInstance().emit(EVENT_ON_PLAYER_FORFEIT, player);
	});
}
