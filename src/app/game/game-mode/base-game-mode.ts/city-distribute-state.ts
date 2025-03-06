import { RegionToCity } from 'src/app/city/city-map';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { StandardDistributionService } from '../../services/distribution-service/standard-distribution-service';
import { MatchData } from '../../state/game-state';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';

export class CityDistributeState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		new StandardDistributionService().runDistro(() => {
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

		this.nextState(this.stateData);
	}
}
