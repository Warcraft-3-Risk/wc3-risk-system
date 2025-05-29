import { ChatManager } from '../managers/chat-manager';
import { NameManager } from '../managers/names/name-manager';
import { PlayerManager } from '../player/player-manager';
import { CamCommand } from './cam';
import { ForfeitCommand } from './forfeit';
import { GoldCommand } from './gold';
import { HelpCommand } from './help';
import { MuteCommand } from './mute';
import { NamesCommand } from './names';
import { RestartCommand } from './restart';
import { HowTo } from './turorial';
import { UICommand } from './ui';
import { W3CDrawCommand } from './w3c-draw';
import { W3CGGCommand } from './w3c-gg';

export function SetCommands() {
	const chatManager: ChatManager = ChatManager.getInstance();
	const playerManager: PlayerManager = PlayerManager.getInstance();
	const nameManager: NameManager = NameManager.getInstance();

	CamCommand(chatManager);
	ForfeitCommand(chatManager, playerManager);
	MuteCommand(chatManager, nameManager, playerManager);
	RestartCommand(chatManager);
	NamesCommand(chatManager, playerManager, nameManager);
	GoldCommand(chatManager, nameManager);
	HelpCommand(chatManager);
	UICommand(chatManager);
	HowTo(chatManager);
	W3CDrawCommand(chatManager);
	W3CGGCommand(chatManager);
}
