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
import { W3C_MODE_ENABLED } from '../utils/map-info';
import { LocalMessage } from '../utils/messages';
import { RatingSyncManager } from 'src/app/rating/rating-sync-manager';
import { PlayerManager } from 'src/app/player/player-manager';

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

	public run(): void {
		// Start P2P rating synchronization early (during settings selection)
		// This allows sync to complete while host is configuring the game
		const syncManager = RatingSyncManager.getInstance();
		const humanPlayers = PlayerManager.getInstance().getHumanPlayersOnly();
		syncManager.startSync(humanPlayers);

		// Consuming pauses to maintain continous gameplay
		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player = Player(i);

			if (player == GetLocalPlayer()) {
				for (let index = 0; index < 3; index++) {
					PauseGame(true);
					PauseGame(false);
				}
			}
		}

		if (W3C_MODE_ENABLED) {
			LocalMessage(
				GetLocalPlayer(),
				'Welcome to Risk Europe!\n\nThis is a best of 3 matchup. First to win 2 matches is victorious!\n\nBuild armies and capture countries to increase your income!\n\nPrevent your opponent from doing the same!\n\nGood luck and have fun!',
				'Sound\\Interface\\ItemReceived.flac',
				18
			);

			const settingsContext: SettingsContext = SettingsContext.getInstance();
			settingsContext.getSettings().Promode = 1;
			settingsContext.getSettings().GameType = 0;
			settingsContext.getSettings().Fog = 1;
			settingsContext.getSettings().Diplomacy.option = 2;
			settingsContext.getSettings().Overtime.option = 3;
			this.end();
			return;
		}

		this.ui.show();
		if (NameManager.getInstance().getAcct(Player(23)) == 'RiskBot') {
			const settingsContext: SettingsContext = SettingsContext.getInstance();
			settingsContext.getSettings().Promode = 0;
			settingsContext.getSettings().Fog = 0;
			settingsContext.getSettings().Diplomacy.option = 0;
			settingsContext.getSettings().Overtime.option = 1;
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

	public end(): void {
		const settings: SettingsContext = SettingsContext.getInstance();

		settings.initStrategies();
		settings.applyStrategy('GameType');
		settings.applyStrategy('Overtime');

		Quests.getInstance().AddSettingsQuest(settings);

		if (ENABLE_EXPORT_GAME_SETTINGS) {
			ExportGameSettings.write(settings);
		}

		const gameType: GameType = settings.isCapitals() ? 'Capitals' : 'Standard';
		GlobalGameData.gameMode = gameType;
		this.eventEmitter.emit(EVENT_SET_GAME_MODE, gameType);
	}
}
