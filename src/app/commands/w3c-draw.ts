import { ChatManager } from '../managers/chat-manager';
import { W3CDrawManager } from '../managers/w3c-draw-manager';
import { SettingsContext } from '../settings/settings-context';

export function W3CDrawCommand(chatManager: ChatManager) {
	chatManager.addCmd(['-draw'], () => {
		if (!SettingsContext.getInstance().isW3CMode()) return;

		const player: player = GetTriggerPlayer();
		W3CDrawManager.getInstance().startDrawVote(player);
	});
}
