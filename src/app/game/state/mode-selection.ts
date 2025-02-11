import { GameManager } from '../game-manager';
import { GameState } from './game-state';
import { SettingsView } from 'src/app/settings/settings-view';
import { NameManager } from 'src/app/managers/names/name-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { Quests } from 'src/app/quests/quests';
import { ExportGameSettings } from 'src/app/utils/export-statistics/export-game-settings';
import { ENABLE_EXPORT_GAME_SETTINGS } from 'src/configs/game-settings';

export class ModeSelection implements GameState {
	private manager: GameManager;
	private nextState: GameState;
	private ui: SettingsView;

	public constructor(nextState: GameState) {
		this.nextState = nextState;
		this.ui = new SettingsView();
	}

	public setObserver(observer: GameManager) {
		this.manager = observer;
	}

	public start(): void {
		if (NameManager.getInstance().getAcct(Player(23)) == 'RiskBot') {
			const settingsContext: SettingsContext = SettingsContext.getInstance();
			settingsContext.getSettings().Promode = 0;
			settingsContext.getSettings().Fog = 0;
			settingsContext.getSettings().Diplomacy.option = 0;
			settingsContext.getSettings().Overtime.option = 0;
			this.ui.hide();
			this.end();
		} else {
			const modeTimer: timer = CreateTimer();
			const tick: number = 1;
			let time: number = 15;
			this.ui.update(time);

			TimerStart(modeTimer, tick, true, () => {
				this.ui.update(time);

				if (time <= 0 || !this.ui.isVisible()) {
					PauseTimer(modeTimer);
					DestroyTimer(modeTimer);
					this.ui.hide();
					this.end();
				}

				time -= tick;
			});
		}
	}

	public end(): void {
		const settings: SettingsContext = SettingsContext.getInstance();
		settings.initStrategies();
		settings.applyStrategy('Diplomacy');
		settings.applyStrategy('Promode');
		settings.applyStrategy('Overtime');

		this.setupSettingsQuest();

		if (ENABLE_EXPORT_GAME_SETTINGS) {
			ExportGameSettings.write(settings);
		}

		this.manager.updateState(this.nextState);
	}

	private setupSettingsQuest(): void {
		const settings: SettingsContext = SettingsContext.getInstance();
		Quests.AddSettingsQuest(settings);
	}
}
