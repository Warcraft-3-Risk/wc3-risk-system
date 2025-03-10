import { SettingsView } from 'src/app/settings/settings-view';
import { BaseGameState } from '../base-game-state';
import { TimedEvent } from 'src/app/timer/timed-event';
import { TimedEventManager } from 'src/app/timer/timed-event-manager';
import { TimerEventType } from 'src/app/timer/timed-event-type';

export class SettingSelectionState extends BaseGameState {
	private ui: SettingsView;

	public enter(): void {
		const timerEventID: TimerEventType = 'settingsSelection';
		const timedEventManager: TimedEventManager = TimedEventManager.getInstance();
		const timerDuration: number = 30;
		this.ui = new SettingsView(timerDuration);

		timedEventManager.addEvent(
			new TimedEvent(timerEventID, timerDuration, false, true, (remainingTime) => {
				if (remainingTime <= 0 || !this.ui.isVisible()) {
					timedEventManager.stopEvent(timerEventID);
					this.exit();
					return;
				}

				this.ui.update(remainingTime);
			})
		);
	}
	public exit(): void {
		if (this.ui.isVisible()) {
			this.ui.hide();
		}

		this.gameStateManager.nextState();
	}
}
