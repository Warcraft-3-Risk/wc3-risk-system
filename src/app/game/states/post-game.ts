import { GameManager } from '../game-manager';
import { GameState } from '../game-state';

export class PostGame implements GameState {
	private manager: GameManager;

	public constructor(manager: GameManager) {
		this.manager = manager;
	}

	public start(): void {}

	public end(): void {}
}
