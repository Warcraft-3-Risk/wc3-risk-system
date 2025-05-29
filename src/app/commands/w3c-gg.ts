import { ChatManager } from '../managers/chat-manager';
import { PlayerManager } from '../player/player-manager';
import { SettingsContext } from '../settings/settings-context';
import { EVENT_ON_PLAYER_LEFT } from '../utils/events/event-constants';
import { EventEmitter } from '../utils/events/event-emitter';

export function W3CGGCommand(chatManager: ChatManager) {
	chatManager.addCmd(['-gg'], () => {
		if (!SettingsContext.getInstance().isW3CMode()) return;

		const player: player = GetTriggerPlayer();
		CustomDefeatBJ(player, 'You have been defeated!');
		EventEmitter.getInstance().emit(EVENT_ON_PLAYER_LEFT, player);

		const remainingPlayers = PlayerManager.getInstance().getCurrentActiveHumanPlayers().filter(x => x.getPlayer() !== player);

		if (remainingPlayers.length === 1) {
			CustomVictoryBJ(remainingPlayers[0].getPlayer(), true, true);
			ClearTextMessages();
		}
	});
}
