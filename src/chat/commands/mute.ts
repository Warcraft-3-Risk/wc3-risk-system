// import { MatchData } from '../game/state/match-state';
// import { ChatManager } from '../managers/chat-manager';
// import { NameManager } from '../managers/names/name-manager';
// import { PlayerManager } from '../player/player-manager';
// import { PLAYER_STATUS } from '../player/status/status-enum';
// import { ErrorMsg } from '../utils/messages';

// export function MuteCommand(chatManager: ChatManager, nameManager: NameManager, playerManager: PlayerManager) {
// 	chatManager.addCmd(['-stfu', '-mute'], () => {
// 		if (MatchData.matchState != 'inProgress') return;

// 		const players: player[] = nameManager.getPlayersByAnyName(GetEventPlayerChatString().split(' ')[1]);
// 		const player: player = GetTriggerPlayer();

// 		if (players.length >= 2) {
// 			ErrorMsg(player, 'Multiple players found, be more specific!');
// 		} else if (players.length <= 0) {
// 			ErrorMsg(player, 'Player not found!', 2);
// 		} else if (playerManager.players.get(players[0]).isAdmin()) {
// 			ErrorMsg(player, "You can't mute that player! :P");
// 		} else {
// 			playerManager.players.get(players[0]).status.set(PLAYER_STATUS.STFU);
// 		}
// 	});
// }
