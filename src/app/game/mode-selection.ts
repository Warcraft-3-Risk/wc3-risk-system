import { SettingsView } from 'src/app/settings/settings-view';
import { NameManager } from 'src/app/managers/names/name-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { Quests } from 'src/app/quests/quests';
import { ExportGameSettings } from 'src/app/utils/export-statistics/export-game-settings';
import { EventEmitter } from 'src/app/utils/events/event-emitter';
import { EVENT_MODE_SELECTION, EVENT_SET_GAME_MODE } from 'src/app/utils/events/event-constants';
import { ENABLE_EXPORT_GAME_SETTINGS } from 'src/configs/game-settings';
import { GameType } from 'src/app/settings/strategies/game-type-strategy';
import { GlobalGameData } from './state/global-game-state';

export class ModeSelection {
	private ui: SettingsView;
	private eventEmitter: EventEmitter;

	private static instance: ModeSelection;

	private constructor() {
		this.ui = new SettingsView();
		this.ui.hide();
		this.eventEmitter = EventEmitter.getInstance();
		this.eventEmitter.on(EVENT_MODE_SELECTION, () => this.run());
	}

	public static getInstance() {
		if (this.instance == null) {
			this.instance = new ModeSelection();
		}

		return this.instance;
	}

	public async run(): Promise<void> {
		this.ui.show();
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
				if (time <= 0 || !this.ui.isVisible()) {
					PauseTimer(modeTimer);
					DestroyTimer(modeTimer);
					this.ui.hide();
					this.end();
				}

				time -= tick;
				this.ui.update(time);
			});
		}
	}

	public async end(): Promise<void> {
		const settings: SettingsContext = SettingsContext.getInstance();
		settings.initStrategies();
		settings.applyStrategy('GameType');
		settings.applyStrategy('Diplomacy');
		settings.applyStrategy('Promode');
		settings.applyStrategy('Overtime');

		this.setupSettingsQuest();

		if (ENABLE_EXPORT_GAME_SETTINGS) {
			ExportGameSettings.write(settings);
		}

		const gameType: GameType = settings.isCapitals() ? 'Capitals' : 'Standard';
		GlobalGameData.gameMode = gameType;
		this.eventEmitter.emit(EVENT_SET_GAME_MODE, gameType);
	}

	private setupSettingsQuest(): void {
		const settings: SettingsContext = SettingsContext.getInstance();
		Quests.getInstance().AddSettingsQuest(settings);
	}
}
