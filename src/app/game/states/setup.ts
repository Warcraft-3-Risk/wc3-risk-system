import { GameStateManager } from '../game-manager';
import { GameState } from '../game-state';
import { Quests } from 'src/app/quests/quests';
import { SetConsoleUI } from 'src/app/ui/console';
import { PlayerManager } from 'src/app/entity/player/player-manager';
import { NameManager } from 'src/app/managers/names/name-manager';
import { CameraManager } from 'src/app/managers/camera-manager';
import { SetupChatCommands } from 'src/app/managers/chat/set-commands';
import { TimedEventManager } from 'src/app/managers/timer/timed-event-manager';

export class Setup implements GameState {
	private manager: GameStateManager;

	public constructor(manager: GameStateManager) {
		this.manager = manager;
	}

	/**
	 * Generic setup that needs to happen once when the game starts
	 * Assume call order matters
	 */
	public start(): void {
		//TODO print message for "please wait game is initilizing"
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

		this.end();
	}

	public end(): void {
		//TODO delete Debug info
		print(`Players: ${PlayerManager.getInstance().getPlayers().size}`);

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			if (!IsPlayerSlotState(Player(i), PLAYER_SLOT_STATE_EMPTY)) {
				print(
					`Player Name: ${NameManager.getInstance().getBtag(Player(i))} Slot: ${GetPlayerId(Player(i))} Color: ${NameManager.getInstance().getColor(Player(i))}`
				);
			}
		}

		//TODO load stats UI if needed

		this.manager.updateState();
	}
}
