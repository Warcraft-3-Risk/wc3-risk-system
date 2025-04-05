import { SettingsController } from 'src/app/settings/settings-controller';
import { BaseGameState } from '../base-game-state';
import { Diplomacy } from 'src/app/settings/settings';
import { TimedEvent } from 'src/app/timer/timed-event';
import { TimedEventManager } from 'src/app/timer/timed-event-manager';
import { TimerEventType } from 'src/app/timer/timed-event-type';
import { TeamSelectionController } from 'src/app/team_selection/team-selection-controller';
import { HideDefaultUI } from 'src/app/ui/console';

export class TeamSelectionState extends BaseGameState {
	public enter(): void {
		if (SettingsController.getInstance().getDiplomacy() != Diplomacy.DraftTeams) {
			return this.exit();
		}

		HideDefaultUI(true);

		const teamSelectionController: TeamSelectionController = TeamSelectionController.getInstance();
		const timerDuration: number = 30;
		const timerEventID: TimerEventType = 'teamSelection';
		const timedEventManager: TimedEventManager = TimedEventManager.getInstance();

		timedEventManager.addEvent(
			new TimedEvent(timerEventID, timerDuration, false, true, (remainingTime) => {
				if (remainingTime <= 0 || !teamSelectionController.isVisible()) {
					timedEventManager.stopEvent(timerEventID);
					teamSelectionController.setVisibility(false);
					this.exit();

					return;
				}

				teamSelectionController.update(remainingTime);
			})
		);
	}

	public exit(): void {
		this.gameStateManager.nextState();
	}
}
