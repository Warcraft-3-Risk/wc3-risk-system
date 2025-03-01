import { SettingsView } from 'src/app/settings/settings-view';
import { GameManager } from '../game-manager';
import { GameState } from '../game-state';
import { EventTimer } from 'src/app/timer/EventTimer';
import { SettingsController } from 'src/app/settings/settings-controller';
import { GamePlayer } from 'src/app/entity/player/game-player';
import { PlayerManager } from 'src/app/entity/player/player-manager';
import { NameManager } from 'src/app/managers/names/name-manager';
import { PLAYER_COLORS } from 'src/app/utils/player-colors';
import { ShuffleArray } from 'src/app/utils/utils';

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

		print(`Players: ${PlayerManager.getInstance().getPlayers().size}`);

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			if (!IsPlayerSlotState(Player(i), PLAYER_SLOT_STATE_EMPTY)) {
				print(
					`Player Name: ${NameManager.getInstance().getAcct(Player(i))} Slot: ${GetPlayerId(Player(i))} Color: ${NameManager.getInstance().getColor(Player(i))}`
				);
			}
		}
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

		if (timer.getEvent('uiTimer').duration <= 1) {
			timer.addEvent('delay', 1, false, () => {
				this.settingsView.hide();
				this.end();
			});
		}
	}
}
