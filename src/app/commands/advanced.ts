import { ChatManager } from '../managers/chat-manager';
import { HexColors } from '../utils/hex-colors';

export function Advanced(chatManager: ChatManager) {
	chatManager.addCmd(['-advanced', '-adv'], () => {
		const player: player = GetTriggerPlayer();

		let description: string = `
		${HexColors.GREEN}Overtime|r When Overtime is configured, once the configured time is hit, every turn the required amount of cities to win is reduced by one.
		${HexColors.GREEN}One-Manning|r To kill a guard of a city with only one riflemen(1g), engage the guard from the south side, damage him a little, run back to the city you own and use the barracks ability "swap position".
		${HexColors.GREEN}South Advantage|r As all guard towers are placed on the north side of each city, players fighting from the south have an advantage in combat. 
		${HexColors.GREEN}Knight Rush|r The Knight is the fastest unit in the game so it is often used to get the remaining amount of cities to win the game quickly.
		${HexColors.GREEN}Denying|r By attacking and killing your own units like an SS Ship or a Tank, the enemy will not receive any fight bonus for it.
		${HexColors.GREEN}Pirate Buffering|r In some situations it can be a good choice to use pirates as a buffer between you and someone that could potentially backstab you.`

		DisplayTimedTextToPlayer(player, 0, 0, 8, description);
	});
}
