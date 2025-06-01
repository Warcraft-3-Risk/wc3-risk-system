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
		this.stateData.capitals.forEach((capital, player) => {
			const countryName = CityToCountry.get(capital).getName();
			NameManager.getInstance().setCountry(player, countryName);
			NameManager.getInstance().setName(player, 'country');
		});

		ScoreboardManager.getInstance().updateFull();
		ScoreboardManager.getInstance().updateScoreboardTitle();

		this.nextState(this.stateData);
	}
}
