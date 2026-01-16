import { ChatManager } from '../managers/chat-manager';
import { HexColors } from '../utils/hex-colors';

export function Advanced(chatManager: ChatManager) {
	chatManager.addCmd(['-advanced', '-adv'], () => {
		const player: player = GetTriggerPlayer();

		let description: string = `
		${HexColors.GREEN}Overtime|r When Overtime is active, each turn after the configured time reduces the required number of cities to win by one.
		${HexColors.GREEN}One-Manning|r To kill a city guard with a single Rifleman (1g), engage from the south, weaken the guard, retreat to your city, then use the Barracks ability "Swap Position".
		${HexColors.GREEN}South Advantage|r Since guard towers are always on the north side of cities, players attacking from the south have a combat advantage. 
		${HexColors.GREEN}Knight Rush|r The Knight is the fastest unit in the game and is often used to quickly capture the remaining cities needed to win.
		${HexColors.GREEN}Denying|r If you attack and kill your own units (e.g., an SS Ship or a Tank), the enemy will not receive a fight bonus.
		${HexColors.GREEN}Pirate Buffering|r In some situations, using pirates as a buffer between you and a potential backstabber can be a good choice.`

		DisplayTimedTextToPlayer(player, 0, 0, 8, description);
	});
}
