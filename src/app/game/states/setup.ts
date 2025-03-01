import { GameManager } from '../game-manager';
import { GameState } from '../game-state';
import { ChatManager } from 'src/app/managers/chat/chat-manager';
import { Quests } from 'src/app/quests/quests';
import { SetConsoleUI } from 'src/app/ui/console';
import { PlayerManager } from 'src/app/entity/player/player-manager';
import { NameManager } from 'src/app/managers/names/name-manager';
import { CameraManager } from 'src/app/managers/camera-manager';

export class Setup implements GameState {
	private manager: GameManager;

	public constructor(manager: GameManager) {
		this.manager = manager;
	}

	public start(): void {
		FogEnable(false);
		FogMaskEnable(false);
		SetConsoleUI();
		Quests.Create();

		//Singletons are in specfic order
		NameManager.getInstance();
		CameraManager.getInstance();
		PlayerManager.getInstance();
		ChatManager.getInstance();
		//Transports
	}

	public end(): void {}
}
