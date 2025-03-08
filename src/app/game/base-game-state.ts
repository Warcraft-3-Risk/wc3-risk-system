import { GameStateManager } from './game-state-manager';

export abstract class BaseGameState {
	protected gameStateManager: GameStateManager;
	abstract enter(): void;
	abstract exit(): void;

	constructor(gameStateManager: GameStateManager) {
		this.gameStateManager = gameStateManager;
	}
}
