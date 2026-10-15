import { File } from 'w3ts';
import { ChatManager } from '../managers/chat-manager';
import { isCameraPositionButtonAvailable } from '../ui/camera-position-button';

export function UICommand(chatManager: ChatManager) {
	chatManager.addCmd(['-ui'], () => {
		const player: player = GetTriggerPlayer();

		// Observers only have observer buttons, which always stay visible regardless of -ui
		if (IsPlayerObserver(player)) return;

		// Every client builds every player's buttons, but each player's buttons are only ever visible to
		// that player. Visibility is purely local, so only the player who typed the command changes it -
		// otherwise everyone else's client would start showing this player's buttons on top of their own.
		if (player !== GetLocalPlayer()) return;

		const id: number = GetPlayerId(player);
		const healthButton: framehandle = BlzGetFrameByName('GuardButton', id);
		const buttons: framehandle[] = [];

		// Some buttons only exist depending on settings (rating system, developer mode), so skip missing ones
		const addButton = (frame: framehandle) => {
			if (frame) buttons.push(frame);
		};

		addButton(healthButton);
		addButton(BlzGetFrameByName('GuardButton', id + 100)); // Guard value
		addButton(BlzGetFrameByName('GuardButton', id + 200)); // Country labels
		addButton(BlzGetFrameByName('GuardButton', id + 300)); // Ranked stats
		addButton(BlzGetFrameByName('GuardButton', id + 500)); // Cancel all orders
		// Camera positions - only in team games with allies (or developer mode), never in FFA
		if (isCameraPositionButtonAvailable(player)) addButton(BlzGetFrameByName('CameraPositionButtonBackdrop', id + 400));

		const show: boolean = !BlzFrameIsVisible(healthButton);

		File.write('risk/ui.pld', `${show}`);

		for (let i = 0; i < buttons.length; i++) {
			BlzFrameSetVisible(buttons[i], show);
		}
	});
}
