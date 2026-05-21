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
		const cameraPanButton = BlzGetFrameByName('GuardButton', GetPlayerId(player) + 600);
		const largeCityIndicatorsButton = BlzGetFrameByName('GuardButton', GetPlayerId(player) + 700);

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
				if (cameraPanButton) BlzFrameSetVisible(cameraPanButton, false);
				if (largeCityIndicatorsButton) BlzFrameSetVisible(largeCityIndicatorsButton, false);
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
			if (cameraPanButton) BlzFrameSetVisible(cameraPanButton, true);
			if (largeCityIndicatorsButton) BlzFrameSetVisible(largeCityIndicatorsButton, true);
		}
	});
}
