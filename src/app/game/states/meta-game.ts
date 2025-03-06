import { GameStateManager } from '../game-manager';
import { GameState } from '../game-state';

export class MetaGame implements GameState {
	private manager: GameStateManager;

	public constructor(manager: GameStateManager) {
		this.manager = manager;
	}

	public start(): void {}

	public end(): void {}
}
