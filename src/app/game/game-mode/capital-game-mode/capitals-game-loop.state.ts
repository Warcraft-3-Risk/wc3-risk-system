import { City } from 'src/app/city/city';
import { CityToCountry } from 'src/app/country/country-map';
import { NameManager } from 'src/app/managers/names/name-manager';
import { PLAYER_STATUS } from 'src/app/player/status/status-enum';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { LocalMessage } from 'src/app/utils/messages';
import { UNIT_ID } from 'src/configs/unit-id';
import { GameLoopState } from '../base-game-mode.ts/game-loop-state';
import { CapitalsData } from '../mode/capitals-mode';

export class CapitalsGameLoopMode extends GameLoopState<CapitalsData> {
	override onCityCapture(city: City, preOwner: ActivePlayer, owner: ActivePlayer): void {
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

	onExitState(): void {
		this.stateData.capitals?.forEach((city, _) => {
			if (city) {
				const unitTypeId = GetUnitTypeId(city.barrack.unit);
				if (unitTypeId == UNIT_ID.CAPITAL || unitTypeId == UNIT_ID.CONQUERED_CAPITAL) {
					IssueImmediateOrderById(city.barrack.unit, UNIT_ID.CITY);
				}
			}
		});
	}
}
