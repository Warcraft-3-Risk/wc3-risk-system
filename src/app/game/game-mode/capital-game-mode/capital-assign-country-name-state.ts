import { GlobalGameData } from '../../state/global-game-state';
import { NameManager } from 'src/app/managers/names/name-manager';
import { BaseState } from '../state/base-state';
import { CapitalsData } from '../mode/capitals-mode';
import { CityToCountry } from 'src/app/country/country-map';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';

export class CapitalAssignCountrytNameState extends BaseState<CapitalsData> {
	onEnterState() {
		this.run();
	}

	run(): void {
		GlobalGameData.matchPlayers.forEach((player) => {
			const capital = this.stateData.capitals.get(player.getPlayer());
			const countryName = CityToCountry.get(capital).getName();
			NameManager.getInstance().setCountry(player.getPlayer(), countryName);
			NameManager.getInstance().setName(player.getPlayer(), 'country');
		});

		ScoreboardManager.getInstance().updateFull();
		ScoreboardManager.getInstance().updateScoreboardTitle();

		this.nextState(this.stateData);
	}
}
