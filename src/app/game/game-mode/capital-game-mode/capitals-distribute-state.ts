import { RegionToCity } from 'src/app/city/city-map';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { GlobalGameData } from '../../state/global-game-state';
import { BaseState } from '../state/base-state';
import { debugPrint } from 'src/app/utils/debug-print';
import { DC, DEBUG_PRINTS } from 'src/configs/game-settings';
import { CapitalDistributionService } from '../../services/distribution-service/capital-distribution-service';
import { CapitalsData } from '../mode/capitals-mode';
import { SharedSlotManager } from '../../services/shared-slot-manager';

export class CapitalsDistributeState extends BaseState<CapitalsData> {
	onEnterState() {
		// // Ensure that all players without capitals get assigned a random capital city.
		if (DEBUG_PRINTS.master) debugPrint('5. Distributing Capitals', DC.gameMode);
		new CapitalDistributionService(this.stateData.playerCapitalSelections).runDistro(() => {
			this.nextState(this.stateData);
		});
	}
}
