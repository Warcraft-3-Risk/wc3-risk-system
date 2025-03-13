import { SettingsController } from 'src/app/settings/settings-controller';
import { BaseGameState } from '../base-game-state';
import { Diplomacy } from 'src/app/settings/settings';

export class TeamSelectionState extends BaseGameState {
	public enter(): void {
		if (SettingsController.getInstance().getDiplomacy() == Diplomacy.FFA) {
			return this.exit();
		}
	}
	public exit(): void {
		this.gameStateManager.nextState();
	}
}
