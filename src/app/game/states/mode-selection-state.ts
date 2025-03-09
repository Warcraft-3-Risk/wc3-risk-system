import { SettingsView } from 'src/app/settings/settings-view';
import { BaseGameState } from '../base-game-state';

export class ModeSelectionState extends BaseGameState {
	private ui: SettingsView;
	private timerId: string;
	private remainingTime: number;

	public enter(): void {
		// this.ui = new SettingsView();
		this.remainingTime = 30;
	}
	public exit(): void {
		this.gameStateManager.nextState();
	}
}
