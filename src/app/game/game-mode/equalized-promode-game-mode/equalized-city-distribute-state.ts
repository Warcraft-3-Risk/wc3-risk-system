import { RegionToCity } from 'src/app/city/city-map';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { EqualizedPromodeDistributionService } from '../../services/distribution-service/equalized-promode-distribution-service';
import { GlobalGameData } from '../../state/global-game-state';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { ClientManager } from '../../services/client-manager';
import { EqualizedPromodeData } from '../mode/equalized-promode-mode';

/**
 * City distribution state for Equalized ProMode.
 * Uses EqualizedPromodeDistributionService to ensure fair 1v1 matches.
 */
export class EqualizedCityDistributeState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		new EqualizedPromodeDistributionService().runDistro(() => {
			RegionToCity.forEach((city) => {
				city.guard.reposition();
				//Prevent guards from moving and update unit counts
				IssueImmediateOrder(city.guard.unit, 'stop');

				if (ClientManager.getInstance().getOwnerOfUnit(city.guard.unit) != NEUTRAL_HOSTILE) {
					GlobalGameData.matchPlayers
						.find((x) => x.getPlayer() == ClientManager.getInstance().getOwnerOfUnit(city.guard.unit))
						.trackedData.units.add(city.guard.unit);
				}

				SetUnitInvulnerable(city.guard.unit, false);
			});
		});

		this.nextState(this.stateData);
	}
}