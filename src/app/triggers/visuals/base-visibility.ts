import { RegionToCity } from '../../city/city-map';
import { PlayerManager } from '../../player/player-manager';
import { debugPrint } from '../../utils/debug-print';
import { File } from 'w3ts';

export class CityVisibilityManager {
	private static instance: CityVisibilityManager;
	private activePlayers: Set<player> = new Set<player>();
	private permanentlyVisiblePlayers: Set<player> = new Set<player>();
	private readonly FILE_PATH = 'risk/range-indicators.pld';

	private constructor() {
		const tDown: trigger = CreateTrigger();
		const tUp: trigger = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			// Register for all possible meta-key combinations (0-15) to ensure we catch the event
			for (let meta = 0; meta < 16; meta++) {
				BlzTriggerRegisterPlayerKeyEvent(tDown, Player(i), OSKEY_LALT, meta, true);
				BlzTriggerRegisterPlayerKeyEvent(tUp, Player(i), OSKEY_LALT, meta, false);

				BlzTriggerRegisterPlayerKeyEvent(tDown, Player(i), OSKEY_RALT, meta, true);
				BlzTriggerRegisterPlayerKeyEvent(tUp, Player(i), OSKEY_RALT, meta, false);
			}
		}

		TriggerAddAction(tDown, () => {
			const player = GetTriggerPlayer();

			if (PlayerManager.getInstance().isObserver(player)) return;
			if (this.activePlayers.has(player)) return;

			this.activePlayers.add(player);
			debugPrint(`Key Down Event: Player ${GetPlayerName(player)}`);

			this.updateVisibility(player);
		});

		TriggerAddAction(tUp, () => {
			const player = GetTriggerPlayer();

			if (PlayerManager.getInstance().isObserver(player)) return;
			if (!this.activePlayers.has(player)) return;

			this.activePlayers.delete(player);
			debugPrint(`Key Up Event: Player ${GetPlayerName(player)}`);

			this.updateVisibility(player);
		});

		// Initialize from local storage
		this.loadSettings();
	}

	public static getInstance(): CityVisibilityManager {
		if (!this.instance) {
			this.instance = new CityVisibilityManager();
		}
		return this.instance;
	}

	public togglePermanentVisibility(player: player): boolean {
		if (this.permanentlyVisiblePlayers.has(player)) {
			this.permanentlyVisiblePlayers.delete(player);
		} else {
			this.permanentlyVisiblePlayers.add(player);
		}
		this.updateVisibility(player);
		this.saveSettings(player);
		return this.permanentlyVisiblePlayers.has(player);
	}

	public isPermanentlyVisible(player: player): boolean {
		return this.permanentlyVisiblePlayers.has(player);
	}

	private updateVisibility(player: player) {
		if (GetLocalPlayer() == player) {
			const isVisible = this.activePlayers.has(player) || this.permanentlyVisiblePlayers.has(player);
			const alpha = isVisible ? 25 : 0;
			for (const city of RegionToCity.values()) {
				BlzSetSpecialEffectAlpha(city.effect, alpha);
			}
		}
	}

	private loadSettings() {
		const localPlayer = GetLocalPlayer();

		if (PlayerManager.getInstance().isObserver(localPlayer)) return;

		const content = File.read(this.FILE_PATH);
		if (content === 'true') {
			this.permanentlyVisiblePlayers.add(localPlayer);
			this.updateVisibility(localPlayer);
		}
	}

	private saveSettings(player: player) {
		if (GetLocalPlayer() == player) {
			const isVisible = this.permanentlyVisiblePlayers.has(player);
			File.write(this.FILE_PATH, isVisible ? 'true' : 'false');
		}
	}
}
