import { PlayerManager } from 'src/app/entity/player/player-manager';
import { CameraManager } from 'src/app/libs/camera-manager';
import { Quests } from 'src/app/quests/quests';
import { SetConsoleUI } from 'src/app/ui/console';
import { BaseGameState } from '../base-game-state';
import { SetupChatCommands } from 'src/app/chat/set-commands';
import { NameManager } from 'src/app/names/name-manager';
import { TimedEventManager } from 'src/app/timer/timed-event-manager';

export class InitializationState extends BaseGameState {
	public enter(): void {
		//TODO print message for "please wait game is initilizing"
		//TODO fill a global array with players that matter for the purpose of iterating through it as needed
		FogEnable(false);
		FogMaskEnable(false);
		SetConsoleUI();
		Quests.Create();
		NameManager.getInstance();
		TimedEventManager.getInstance();
		CameraManager.getInstance();
		PlayerManager.getInstance();
		//TODO Transports
		//TODO TimedEventManager
		SetupChatCommands();

		this.exit();
	}

	public exit(): void {
		//TODO delete debug info
		print(`Players: ${PlayerManager.getInstance().getPlayers().size}`);
		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			if (!IsPlayerSlotState(Player(i), PLAYER_SLOT_STATE_EMPTY)) {
				print(
					`Player Name: ${NameManager.getInstance().getBtag(Player(i))} Slot: ${GetPlayerId(Player(i))} Color: ${NameManager.getInstance().getColor(Player(i))}`
				);
			}
		}

		//ClearTextMessages();
		this.gameStateManager.nextState();
	}
}
