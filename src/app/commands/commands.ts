import { PlayerManager } from '../entity/player/player-manager';
import { ChatManager } from '../managers/chat/chat-manager';
import { NameManager } from '../managers/names/name-manager';
import { CamCommand } from './cam';
import { HelpCommand } from './help';
import { HowTo } from './turorial';
import { UICommand } from './ui';

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
