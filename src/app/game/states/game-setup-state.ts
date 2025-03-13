import { BaseGameState } from '../base-game-state';

export class GameSetupState extends BaseGameState {
	public enter(): void {
		print('game setup');
	}
	public exit(): void {
		this.gameStateManager.nextState();
	}
}
