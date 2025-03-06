import { GameManager } from '../game/game-manager';
import { ChatManager } from '../managers/chat-manager';

export function RestartCommand(chatManager: ChatManager, gameManager: GameManager) {
	chatManager.addCmd(['-ng'], async () => {
		if (gameManager.isStatePreGame()) return;
		if (!gameManager.isRestartEnabled()) return;

		if (gameManager.isStateMetaGame()) {
			gameManager.state.end();
		}

		print('Restarting...');
		gameManager.state.end();
	});
}
