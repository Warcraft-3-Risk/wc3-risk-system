import { ChatManager } from '../managers/chat-manager';
import { HexColors } from '../utils/hex-colors';

export function HowTo(chatManager: ChatManager) {
	chatManager.addCmd(['-howto', '-tut', '-tutorial'], () => {
		const player: player = GetTriggerPlayer();

		let description: string = `
		${HexColors.GREEN}What to do?|r The goal of the game is to conquer a specific amount of cities and hold them until the end of the turn.
		${HexColors.GREEN}How to get income?|r When you hold all cities in a country until the end of the turn you receive the amount of cities as income.
		${HexColors.GREEN}What are spawns?|r When you hold all cities in a country until the end of the turn you receive free units at the campfire. 
		${HexColors.GREEN}How to expand?|r Try to expand in a way that will keep your countries connected.
		${HexColors.GREEN}What is diplomacy?|r Chat is essential, make sure to use it to peace nearby players but be ready to be backstabbed.
		${HexColors.GREEN}How does the UI work?|r The scoreboard on the top right shows how many cities are needed to win as well as information for every player in the game.
		${HexColors.GREEN}What to do in the first round?|r Look for small countries with up to 3 cities and attack them from the south side if possible so the guard tower does not hit you.`

		DisplayTimedTextToPlayer(player, 0, 0, 8, description);
	});
}
