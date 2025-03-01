import { SettingsController } from 'src/app/settings/settings-controller';
import { EventTimer } from 'src/app/timer/EventTimer';
import { TeamSelectionView } from 'src/app/ui/team-selection-view';
import { GameManager } from '../game-manager';
import { GameState } from '../game-state';

export class TeamSelection implements GameState {
	private manager: GameManager;
	private static readonly duration: number = 120;

	public constructor(manager: GameManager) {
		this.manager = manager;
	}

	public start(): void {
		if (SettingsController.getInstance().getDiplomacy() == 0) {
		} else {
			TeamSelectionView.build(TeamSelection.duration, this);

			EventTimer.getInstance().addEvent('uiTimer', TeamSelection.duration, false, () => {
				TeamSelectionView.update();
				this.checkTimer();
			});
		}
	}

	public end(): void {
		print('end');
	}

	private checkTimer(): void {
		const timer: EventTimer = EventTimer.getInstance();

		if (timer.getEvent('uiTimer').duration <= 1) {
			timer.addEvent('delay', 1, false, () => {
				TeamSelectionView.hide();
				this.end();
			});
		}
	}
}
