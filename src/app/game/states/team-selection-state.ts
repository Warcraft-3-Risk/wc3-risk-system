import { SettingsController } from 'src/app/settings/settings-controller';
import { BaseGameState } from '../base-game-state';
import { Diplomacy } from 'src/app/settings/settings';
import { TeamSelectionView } from 'src/app/team_selection/team-selection-view';
import { TimedEvent } from 'src/app/timer/timed-event';
import { TimedEventManager } from 'src/app/timer/timed-event-manager';
import { TimerEventType } from 'src/app/timer/timed-event-type';

export class TeamSelectionState extends BaseGameState {
	private ui: TeamSelectionView;
	public enter(): void {
		if (SettingsController.getInstance().getDiplomacy() != Diplomacy.DraftTeams) {
			return this.exit();
		}

		const timerDuration: number = 30;
		if (!this.ui) this.ui = new TeamSelectionView(timerDuration);

		const timerEventID: TimerEventType = 'teamSelection';
		const timedEventManager: TimedEventManager = TimedEventManager.getInstance();

		timedEventManager.addEvent(
			new TimedEvent(timerEventID, timerDuration, false, true, (remainingTime) => {
				if (remainingTime <= 0 || !this.ui.isVisible()) {
					timedEventManager.stopEvent(timerEventID);
					this.ui.hide();
					this.exit();
					return;
				}

				this.ui.update(remainingTime);
			})
		);
	}
	public exit(): void {
		this.gameStateManager.nextState();
	}
}
