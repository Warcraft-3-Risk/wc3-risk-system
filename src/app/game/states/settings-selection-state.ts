import { SettingsView } from 'src/app/settings/settings-view';
import { BaseGameState } from '../base-game-state';
import { TimedEvent } from 'src/app/timer/timed-event';
import { TimedEventManager } from 'src/app/timer/timed-event-manager';
import { TimerEventType } from 'src/app/timer/timed-event-type';
import { SettingsController } from 'src/app/settings/settings-controller';

export class SettingSelectionState extends BaseGameState {
	private settingsView: SettingsView;

	public enter(): void {
		const timerEventID: TimerEventType = 'settingsSelection';
		const timedEventManager: TimedEventManager = TimedEventManager.getInstance();
		const timerDuration: number = 30;
		this.settingsView = new SettingsView(timerDuration);

		timedEventManager.addEvent(
			new TimedEvent(timerEventID, timerDuration, false, true, (remainingTime) => {
				if (remainingTime <= 0 || !this.settingsView.isVisible()) {
					timedEventManager.stopEvent(timerEventID);
					this.settingsView.hide();
					this.exit();

					return;
				}

				this.settingsView.update(remainingTime);
			})
		);
	}

	public exit(): void {
		SettingsController.getInstance().applySettings();
		this.gameStateManager.nextState();
	}
}
