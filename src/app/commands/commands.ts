import { PlayerManager } from '../entity/player/player-manager';
import { NameManager } from '../../names/name-manager';
import { CamCommand } from './cam';
import { HelpCommand } from './help';
import { HowTo } from './turorial';
import { UICommand } from './ui';
import { ChatManager } from 'src/chat/chat-manager';

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
