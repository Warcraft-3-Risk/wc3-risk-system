import { File } from 'w3ts';
import { ChatManager } from '../managers/chat-manager';

export function UICommand(chatManager: ChatManager) {
	chatManager.addCmd(['-ui'], () => {
		const player: player = GetTriggerPlayer();

		const healthButton = BlzGetFrameByName('GuardButton', GetPlayerId(player));
		const valueButton = BlzGetFrameByName('GuardButton', GetPlayerId(player) + 100);
		const labelButton = BlzGetFrameByName('GuardButton', GetPlayerId(player) + 200);
		const ratingButton = BlzGetFrameByName('GuardButton', GetPlayerId(player) + 300);
		const colorblindButton = BlzGetFrameByName('GuardButton', GetPlayerId(player) + 400);
		const colorContrastButton = BlzGetFrameByName('GuardButton', GetPlayerId(player) + 500);
		const signalButton = BlzGetFrameByName('GuardButton', GetPlayerId(player) + 600);

		let isHidden: boolean = BlzFrameIsVisible(healthButton);

		if (isHidden) {
			if (player === GetLocalPlayer()) {
				File.write('risk/ui.pld', `false`);

				BlzFrameSetVisible(healthButton, false);
				BlzFrameSetVisible(valueButton, false);
				BlzFrameSetVisible(labelButton, false);
				if (ratingButton) BlzFrameSetVisible(ratingButton, false);
				if (colorblindButton) BlzFrameSetVisible(colorblindButton, false);
				if (colorContrastButton) BlzFrameSetVisible(colorContrastButton, false);
				if (signalButton) BlzFrameSetVisible(signalButton, false);
			}
		} else {
			if (player === GetLocalPlayer()) {
				File.write('risk/ui.pld', `true`);
			}

			BlzFrameSetVisible(healthButton, true);
			BlzFrameSetVisible(valueButton, true);
			BlzFrameSetVisible(labelButton, true);
			if (ratingButton) BlzFrameSetVisible(ratingButton, true);
			if (colorblindButton) BlzFrameSetVisible(colorblindButton, true);
			if (colorContrastButton) BlzFrameSetVisible(colorContrastButton, true);
			if (signalButton) BlzFrameSetVisible(signalButton, true);
		}
	});
}
