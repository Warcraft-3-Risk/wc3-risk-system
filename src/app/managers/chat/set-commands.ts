import { PlayerManager } from 'src/app/entity/player/player-manager';
import { NameManager } from '../names/name-manager';
import { ChatManager } from './chat-manager';
import { CamCommand } from './commands/cam';
import { HelpCommand } from './commands/help';
import { HowTo } from './commands/turorial';
import { UICommand } from './commands/ui';

export function SetCommands() {
	const chatManager: ChatManager = ChatManager.getInstance();
	const playerManager: PlayerManager = PlayerManager.getInstance();
	const nameManager: NameManager = NameManager.getInstance();

	CamCommand(chatManager);
	// ForfeitCommand(chatManager, playerManager);
	// MuteCommand(chatManager, nameManager, playerManager);
	// RestartCommand(chatManager);
	// NamesCommand(chatManager, playerManager, nameManager);
	// GoldCommand(chatManager, nameManager);
	HelpCommand(chatManager);
	UICommand(chatManager);
	HowTo(chatManager);
}
