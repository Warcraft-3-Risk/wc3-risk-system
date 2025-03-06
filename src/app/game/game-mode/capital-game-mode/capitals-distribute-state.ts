import { RegionToCity } from 'src/app/city/city-map';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { MatchData } from '../../state/game-state';
import { BaseState } from '../state/base-state';
import { CityToCountry } from 'src/app/country/country-map';
import { debugPrint } from 'src/app/utils/debug-print';
import { UNIT_ID } from 'src/configs/unit-id';
import { CapitalDistributionService } from '../../services/distribution-service/capital-distribution-service';
import { CapitalsData } from '../mode/capitals-mode';

export class CapitalsDistributeState extends BaseState<CapitalsData> {
	onEnterState() {
		// // Ensure that all players without capitals get assigned a random capital city.
		debugPrint('5. Distributing Capitals');
		const capitalDistroService = new CapitalDistributionService(this.stateData.playerCapitalSelections);
		capitalDistroService.runDistro(() => {
			RegionToCity.forEach((city) => {
				city.guard.reposition();
				//Prevent guards from moving and update unit counts
				IssueImmediateOrder(city.guard.unit, 'stop');

				if (GetOwningPlayer(city.guard.unit) != NEUTRAL_HOSTILE) {
					MatchData.matchPlayers.find((x) => x.getPlayer() == GetOwningPlayer(city.guard.unit)).trackedData.units.add(city.guard.unit);
				}

				SetUnitInvulnerable(city.guard.unit, false);
			});
		});

		debugPrint('6. Capitals Distributed');
		// Use the capital distribution service to also get the randomly assigned player capital cities
		this.stateData.capitals = new Map(capitalDistroService.selectedPlayerCapitalCities);

		debugPrint('7. Capitals Assigned');
		// Set the country spawn multiplier to 2 for all countries with capitals
		this.stateData.capitals.forEach((city, _) => {
			if (city) {
				CityToCountry.get(city).getSpawn().setMultiplier(2);
			}
		});

		debugPrint('8. Country Multipliers Set');
		this.stateData.capitals.forEach((city, player) => {
			if (city) {
				PingMinimapLocForPlayer(player, city.barrack.location, 20);
			}
		});

		debugPrint('9. Capitals Pinged');
		this.stateData.capitals.forEach((city, player) => {
			if (city) {
				IssueImmediateOrderById(city.barrack.unit, UNIT_ID.CAPITAL);
			}
		});
		debugPrint('10. Capitals Distributed');

		this.nextState(this.stateData);
	}
}
