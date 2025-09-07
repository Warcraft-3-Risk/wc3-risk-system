import { CityToCountry } from '../country/country-map';
import { PLAYER_COLOR_CODES_RGB_MAP } from '../utils/player-colors';
import { debugPrint } from '../utils/debug-print';

/**
 * Manages camera settings for each player.
 */
export default class MinimapManager {
	private static instance: MinimapManager;

	/**
	 * Gets the singleton instance of the MinimapManager.
	 * @returns The singleton instance.
	 */
	public static getInstance() {
		if (this.instance == null) {
			this.instance = new MinimapManager();
		}
		return this.instance;
	}

	private constructor() {
		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player: player = Player(i);

			this.configure(player);
		}
	}

	private configure(p: player) {
		if (p === GetLocalPlayer()) {
			const minimapTimer: timer = CreateTimer();

			let lastAllyMode = GetAllyColorFilterState(); // store initial mode

			// Apply once on start
			this.updateCityIcons(lastAllyMode);

			TimerStart(minimapTimer, 0.25, true, () => {
				const allyMode = GetAllyColorFilterState();

				if (allyMode !== lastAllyMode) {
					lastAllyMode = allyMode;
					this.updateCityIcons(allyMode);
				}
			});
		}
	}

	/**
	 * Updates all city icons based on the current ally mode.
	 */
	private updateCityIcons(allyMode: number) {
		CityToCountry.forEach((_country, city) => {
			const cityOwner = city.getOwner();
			const cityOwnerColor = PLAYER_COLOR_CODES_RGB_MAP.get(GetPlayerColor(cityOwner));

			if (cityOwnerColor) {
				if (cityOwner === GetLocalPlayer()) {
					city.setIcon(255, 255, 255);
				} else if (allyMode == 0) {
					// All enemies have their respective color
					city.setIcon(cityOwnerColor[0], cityOwnerColor[1], cityOwnerColor[2]);
				} else if (allyMode == 1 || allyMode == 2) {
					// All enemies are red
					city.setIcon(255, 3, 3);
				}
			}
		});
	}
}
