import { ChatManager } from '../managers/chat-manager';

export function HowTo(chatManager: ChatManager) {
	chatManager.addCmd(['-howto', '-tut', '-tutorial'], () => {
		const player: player = GetTriggerPlayer();

		let description: string = 'The goal of the game is to conquer a specific amount of cities and hold them until the end of the turn.';
		description += ' The scoreboard title shows how many cities are needed to win as well as the player with the most cities at the moment.';
		description += ' To gain income you need to control a whole country when the turn ends.';
		description += ' It is best to start with smaller countries to gain income quickly.';
		description += ' Try to expand in a way that will keep your countries connected.';
		description += ' Make sure to use your spawns, they are free units you get each turn from countries you own.';
		description += ' Chat is essential in Risk, make sure to use it and read it. Diplomacy is key.';
		description += ' Make sure to peace other players, but also be ready to be backstabbed when your are vulnerable.';

		DisplayTimedTextToPlayer(player, 0, 0, 8, description);
	});
}
