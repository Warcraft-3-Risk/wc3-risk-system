import { SettingsView } from 'src/app/settings/settings-view';
import { GameStateManager } from '../game-manager';
import { GameState } from '../game-state';
import { SettingsController } from 'src/app/settings/settings-controller';
import { PlayerManager } from 'src/app/entity/player/player-manager';
import { NameManager } from 'src/app/managers/names/name-manager';

export class ModeSelection implements GameState {
	private manager: GameStateManager;
	private duration: number;
	private settingsView: SettingsView;

	public constructor(manager: GameStateManager) {
		this.manager = manager;
		this.duration = 20;
	}

	public start(): void {
		print('mode selection start');
		this.settingsView = new SettingsView(this.duration, this);

		// EventTimer.getInstance().addEvent(
		// 	new TimerEvent('periodTimer', this.duration, false, true, (remainingTime) => {
		// 		if (remainingTime !== undefined) {
		// 			this.settingsView.update();
		// 		} else {
		// 			this.checkTimer();
		// 		}
		// 	})
		// );
	}

	public end(): void {
		print('mode selection end');
		SettingsController.getInstance().applySettings();

		print(`Gametype ${SettingsController.getInstance().getGameType()}`);
		print(`Fog ${SettingsController.getInstance().getFog()}`);
		print(`Diplomacy ${SettingsController.getInstance().getDiplomacy()}`);
		print(`Team Size ${SettingsController.getInstance().getTeamSize()}`);

		this.manager.updateState();
	}

	private checkTimer(): void {
		// const timer: EventTimer = EventTimer.getInstance();
		// if (timer.getEvent('periodTimer').getRemainingTime() <= 0) {
		// 	this.settingsView.hide();
		// 	this.end();
		// }
	}
}
