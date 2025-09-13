import { RegionToCity } from 'src/app/city/city-map';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { StandardDistributionService } from '../../services/distribution-service/standard-distribution-service';
import { GlobalGameData } from '../../state/global-game-state';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { ClientManager } from '../../services/client-manager';

export class CityDistributeState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		new StandardDistributionService().runDistro(() => {
			RegionToCity.forEach((city) => {
				city.guard.reposition();
				//Prevent guards from moving and update unit counts
				IssueImmediateOrder(city.guard.unit, 'stop');

				if (ClientManager.getInstance().getActualClientOwnerOfUnit(city.guard.unit) != NEUTRAL_HOSTILE) {
					GlobalGameData.matchPlayers
						.find((x) => x.getPlayer() == ClientManager.getInstance().getActualClientOwnerOfUnit(city.guard.unit))
						.trackedData.units.add(city.guard.unit);
				}

				SetUnitInvulnerable(city.guard.unit, false);
			});
		});

		this.nextState(this.stateData);
	}
}
