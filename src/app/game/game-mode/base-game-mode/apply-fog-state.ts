import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { Wait } from 'src/app/utils/wait';
import { SettingsContext } from 'src/app/settings/settings-context';
import { FogManager } from 'src/app/managers/fog-manager';
import { GlobalGameData } from '../../state/global-game-state';
import { CityToCountry } from 'src/app/country/country-map';

export class ApplyFogState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		this.runAsync();
	}

	async runAsync(): Promise<void> {
		SettingsContext.getInstance().applyStrategy('Fog');

		// In promode, apply black mask around city locations before distribution so enemy
		// city positions are never explored. The rest of the map stays partially visible.
		if (SettingsContext.getInstance().isFogOn()) {
			const playerHandles = GlobalGameData.matchPlayers.map((p) => p.getPlayer());
			const cities = [...CityToCountry.keys()];
			FogManager.getInstance().applyBlackMask(playerHandles, cities);
		}

		this.nextState(this.stateData);
	}
}
