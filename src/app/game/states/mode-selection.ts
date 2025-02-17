import { SettingsView } from 'src/app/settings/settings-view';
import { GameManager } from '../game-manager';
import { GameState } from '../game-state';
import { EventTimer } from 'src/app/timer/EventTimer';
import { SettingsController } from 'src/app/settings/settings-controller';

export class ModeSelection implements GameState {
	private manager: GameManager;
	private duration: number;
	private settingsView: SettingsView;

	public constructor(manager: GameManager) {
		this.manager = manager;
		this.duration = 20;
		this.settingsView = new SettingsView(this.duration, this);
	}

	public start(): void {
		EventTimer.getInstance().addEvent('uiTimer', this.duration, false, () => {
			this.settingsView.update();
			this.checkTimer();
		});
	}

	public end(): void {
		SettingsController.getInstance().applySettings();

		print(`Gametype ${SettingsController.getInstance().getGameType()}`);
		print(`Fog ${SettingsController.getInstance().getFog()}`);
		print(`Diplomacy ${SettingsController.getInstance().getDiplomacy()}`);
		print(`Team Size ${SettingsController.getInstance().getTeamSize()}`);

		this.manager.updateState();
	}

	private checkTimer(): void {
		const timer: EventTimer = EventTimer.getInstance();

		if (timer.getEvent('uiTimer').remainingTime <= 1) {
			timer.addEvent('delay', 1, false, () => {
				this.settingsView.hide();
				this.end();
			});
		}
	}
}
