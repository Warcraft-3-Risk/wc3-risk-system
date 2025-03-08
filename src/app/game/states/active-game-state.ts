import { BaseGameState } from '../base-game-state';

export class ActiveGameState extends BaseGameState {
	public enter(): void {}
	public exit(): void {
		this.gameStateManager.nextState();
	}
}
