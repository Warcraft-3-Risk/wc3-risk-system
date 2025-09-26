import { RegionToCity } from 'src/app/city/city-map';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { GlobalGameData } from '../../state/global-game-state';
import { BaseState } from '../state/base-state';
import { debugPrint } from 'src/app/utils/debug-print';
import { CapitalDistributionService } from '../../services/distribution-service/capital-distribution-service';
import { CapitalsData } from '../mode/capitals-mode';
import { ClientManager } from '../../services/client-manager';

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
