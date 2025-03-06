import { SettingsController } from 'src/app/settings/settings-controller';
import { TeamSelectionView } from 'src/app/ui/team-selection-view';
import { GameStateManager } from '../game-manager';
import { GameState } from '../game-state';

export class TeamSelection implements GameState {
	private manager: GameStateManager;
	private static readonly duration: number = 120;

	public constructor(manager: GameStateManager) {
		this.manager = manager;
	}

	public start(): void {
		if (SettingsController.getInstance().getDiplomacy() == 0) {
		} else {
			TeamSelectionView.build(TeamSelection.duration, this);

			// EventTimer.getInstance().addEvent(
			// 	new TimerEvent('periodTimer', TeamSelection.duration, false, true, (remainingTime) => {
			// 		if (remainingTime !== undefined) {
			// 			TeamSelectionView.update();
			// 		}

			// 		if (remainingTime <= 1) {
			// 			// TeamSelection.hide()
			// 			this.end();
			// 		}
			// 	})
			// );
		}
	}

	public end(): void {
		print('end');
	}
}
