import { File } from 'w3ts';
import { ChatManager } from '../managers/chat-manager';

export function UICommand(chatManager: ChatManager) {
	chatManager.addCmd(['-ui'], () => {
		const player: player = GetTriggerPlayer();

		const healthButton = BlzGetFrameByName('GuardButton', GetPlayerId(player));
		const valueButton = BlzGetFrameByName('GuardButton', GetPlayerId(player) + 100);
		const labelButton = BlzGetFrameByName('GuardButton', GetPlayerId(player) + 200);

		let isHidden: boolean = BlzFrameIsVisible(healthButton);

		if (isHidden) {
			if (player == GetLocalPlayer()) {
				File.write('risk/ui.pld', `false`);

				BlzFrameSetVisible(healthButton, false);
				BlzFrameSetVisible(valueButton, false);
				BlzFrameSetVisible(labelButton, false);
			}
		} else {
			if (player == GetLocalPlayer()) {
				File.write('risk/ui.pld', `true`);
			}

			BlzFrameSetVisible(healthButton, true);
			BlzFrameSetVisible(valueButton, true);
			BlzFrameSetVisible(labelButton, true);
		}
	});
}
