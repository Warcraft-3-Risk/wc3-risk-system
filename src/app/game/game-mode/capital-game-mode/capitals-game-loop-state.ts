import { NameManager } from 'src/app/managers/names/name-manager';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { City } from 'src/app/city/city';
import { GameLoopState } from '../base-game-mode.ts/game-loop-state';
import { CapitalsData } from '../mode/capitals-mode';
import { CityToCountry } from 'src/app/country/country-map';
import { PLAYER_STATUS } from 'src/app/player/status/status-enum';
import { LocalMessage } from 'src/app/utils/messages';
import { UNIT_ID } from 'src/configs/unit-id';

export class CapitalsGameLoopState extends GameLoopState<CapitalsData> {
	onEnterState() {
		super.onEnterState();
	}

	onCityCapture(city: City, preOwner: ActivePlayer, owner: ActivePlayer): void {
		super.onCityCapture(city, preOwner, owner);
		if (preOwner == owner) return;

		if (this.stateData.capitals.get(preOwner.getPlayer()) === city) {
			LocalMessage(
				preOwner.getPlayer(),
				`Your capital has been captured by ${NameManager.getInstance().getDisplayName(owner.getPlayer())}!\nYou have been eliminated!`,
				'Sound\\Interface\\Error.flac'
			);
			LocalMessage(
				owner.getPlayer(),
				`You have captured the capital of ${NameManager.getInstance().getDisplayName(preOwner.getPlayer())}!\nThey have been eliminated!`,
				'Sound\\Interface\\Victory.flac'
			);
			preOwner.status.set(PLAYER_STATUS.DEAD);

			if (GetUnitTypeId(city.barrack.unit) == UNIT_ID.CAPITAL) {
				IssueImmediateOrderById(city.barrack.unit, UNIT_ID.CONQUERED_CAPITAL);
			}

			// Reset the country spawn multiplier to 1
			CityToCountry.get(city).getSpawn().setMultiplier(1);
		}

		super.onCityCapture(city, preOwner, owner);
	}
}
