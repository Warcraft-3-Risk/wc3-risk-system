// import { MatchData } from '../game/state/match-state';
// import { ChatManager } from '../managers/chat-manager';
// import { PlayerManager } from '../player/player-manager';
// import { EVENT_ON_PLAYER_FORFEIT } from '../utils/events/event-constants';
// import { EventEmitter } from '../utils/events/event-emitter';

// export function ForfeitCommand(chatManager: ChatManager, playerManager: PlayerManager) {
// 	chatManager.addCmd(['-ff', '-forfeit'], () => {
// 		if (MatchData.matchState != 'inProgress') return;
// 		EventEmitter.getInstance().emit(EVENT_ON_PLAYER_FORFEIT, playerManager.players.get(GetTriggerPlayer()));
// 	});
// }
