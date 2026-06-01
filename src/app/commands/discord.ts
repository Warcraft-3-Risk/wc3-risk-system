import { ChatManager } from '../managers/chat-manager';
import { HexColors } from '../utils/hex-colors';
import { QrCodeFrameRenderer } from '../ui/qr-code-frame-renderer';

let discordQrCodeFrame: QrCodeFrameRenderer | undefined;

export function DiscordCommand(chatManager: ChatManager): void {
	chatManager.addCmd(['-discord', '-qr'], () => {
		const player: player = GetTriggerPlayer();
		if (player !== GetLocalPlayer()) {
			return;
		}

		if (!discordQrCodeFrame) {
			discordQrCodeFrame = QrCodeFrameRenderer.createDiscordInvite();
		}

		const isVisible = discordQrCodeFrame.toggle();
		DisplayTimedTextToPlayer(
			player,
			0,
			0,
			2,
			isVisible
				? `${HexColors.TANGERINE}Discord QR shown.|r Type -discord again to hide it.`
				: `${HexColors.TANGERINE}Discord QR hidden.|r`
		);
	});
}
