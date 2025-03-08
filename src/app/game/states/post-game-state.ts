import { BaseGameState } from '../base-game-state';

export class PostGameState extends BaseGameState {
	public enter(): void {}
	public exit(): void {
		this.gameStateManager.nextState();
	}
}
