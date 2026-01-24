import { ChatManager } from '../managers/chat-manager';
import { HexColors } from '../utils/hex-colors';

export function HowTo(chatManager: ChatManager) {
	chatManager.addCmd(['-howto', '-tut', '-tutorial'], () => {
		const player: player = GetTriggerPlayer();

		let description: string = `
		${HexColors.GREEN}What to do?|r The goal of the game is to conquer a set number of cities and hold them until the end of the turn.
		${HexColors.GREEN}How to get income?|r If you control all cities in a country at the end of the turn, you receive income equal to the number of cities.
		${HexColors.GREEN}What are spawns?|r If you control all cities in a country at the end of the turn, you receive free units at the campfire.
		${HexColors.GREEN}How to expand?|r Try to expand while keeping your countries connected.
		${HexColors.GREEN}What is diplomacy?|r Chat is essential; use it to negotiate peace with nearby players, but always expect possible backstabs.
		${HexColors.GREEN}How does the UI work?|r The scoreboard in the top right shows how many cities are needed to win, along with information about every player.`

		DisplayTimedTextToPlayer(player, 0, 0, 8, description);
	});
}
