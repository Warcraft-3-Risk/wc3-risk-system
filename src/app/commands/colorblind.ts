import { ChatManager } from '../managers/chat-manager';
import { MinimapIconManager } from '../managers/minimap-icon-manager';
import { HexColors } from '../utils/hex-colors';

/**
 * Toggles colorblind mode for the custom promode minimap: with ally colors on, teammates show
 * yellow instead of teal. Only affects the player who typed it.
 */
export function ColorblindCommand(chatManager: ChatManager) {
	chatManager.addCmd(['-colorblind', '-cb'], () => {
		const player: player = GetTriggerPlayer();
		const minimapIcons = MinimapIconManager.getInstance();

		// The custom minimap only runs in promode, the command is silently ignored elsewhere
		if (!minimapIcons.isEnabled()) return;

		const enabled: boolean = minimapIcons.toggleColorblind(player);

		DisplayTextToPlayer(
			player,
			0,
			0,
			enabled
				? `Colorblind mode ${HexColors.GREEN}enabled|r. Teammates show ${HexColors.YELLOW}yellow|r on the minimap with ally colors on.`
				: `Colorblind mode ${HexColors.RED}disabled|r.`
		);
	});
}
