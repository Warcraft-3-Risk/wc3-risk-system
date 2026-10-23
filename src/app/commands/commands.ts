import { ChatManager } from '../managers/chat-manager';
import { NameManager } from '../managers/names/name-manager';
import { PlayerManager } from '../player/player-manager';
import { AlliesCommand } from './allies';
import { CamCommand } from './cam';
import { ForfeitCommand } from './forfeit';
import { GoldCommand } from './gold';
import { HelpCommand } from './help';
import { MuteCommand } from './mute';
import { NamesCommand } from './names';
import { RestartCommand } from './restart';
import { HowTo } from './tutorial';
import { UICommand } from './ui';
import { W3CDrawCommand } from './w3c-draw';
import { W3CGGCommand } from './w3c-gg';
import { Advanced } from './advanced';
import { DevCaptureCommand } from './dev-capture';
import { KillCommand } from './kill';
import { SkipCommand } from './skip';
import { ColorblindCommand } from './colorblind';
import { CreateUnitCommand } from './create-unit';
import { SetScoreCommand } from './set-score';
import { DevCommand } from './dev';
import { isSingleplayer } from '../utils/singleplayer';

export function SetCommands() {
	const chatManager: ChatManager = ChatManager.getInstance();
	const playerManager: PlayerManager = PlayerManager.getInstance();
	const nameManager: NameManager = NameManager.getInstance();

	AlliesCommand(chatManager, nameManager);
	CamCommand(chatManager);
	ForfeitCommand(chatManager, playerManager);
	MuteCommand(chatManager, nameManager, playerManager);
	RestartCommand(chatManager);
	NamesCommand(chatManager, playerManager, nameManager);
	GoldCommand(chatManager, nameManager);
	HelpCommand(chatManager);
	UICommand(chatManager);
	HowTo(chatManager);
	Advanced(chatManager);
	W3CDrawCommand(chatManager);
	W3CGGCommand(chatManager);
	DevCaptureCommand(chatManager, nameManager);
	KillCommand(chatManager, nameManager, playerManager);
	SkipCommand(chatManager);
	ColorblindCommand(chatManager);

	// Testing commands that are only registered in single-player games, so they do not exist in real games
	if (isSingleplayer()) {
		CreateUnitCommand(chatManager, nameManager);
		SetScoreCommand(chatManager);
		DevCommand(chatManager);
	}
}
