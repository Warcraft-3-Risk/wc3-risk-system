import { File } from 'w3ts';
import { ChatManager } from '../managers/chat-manager';
import { areOptionButtonsVisibleForPlayer, setOptionButtonsVisibleForPlayer } from 'src/app/ui/player-preference-buttons';

export function UICommand(chatManager: ChatManager) {
	chatManager.addCmd(['-ui'], () => {
		const player: player = GetTriggerPlayer();
		if (player !== GetLocalPlayer()) return;

		if (areOptionButtonsVisibleForPlayer(player)) {
			File.write('risk/ui.pld', `false`);
			setOptionButtonsVisibleForPlayer(player, false);
		} else {
			File.write('risk/ui.pld', `true`);
			setOptionButtonsVisibleForPlayer(player, true);
		}
	});
}
