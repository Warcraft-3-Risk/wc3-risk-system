import { RegionToCity } from 'src/app/city/city-map';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { EqualizedPromodeDistributionService } from '../../services/distribution-service/equalized-promode-distribution-service';
import { GlobalGameData } from '../../state/global-game-state';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { SharedSlotManager } from '../../services/shared-slot-manager';
import { EqualizedPromodeData } from '../mode/equalized-promode-mode';

/**
 * City distribution state for Equalized ProMode.
 * Uses EqualizedPromodeDistributionService to ensure fair 1v1 matches.
 */
export class EqualizedCityDistributeState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		new EqualizedPromodeDistributionService().runDistro(() => {
			this.nextState(this.stateData);
		});
	}
}
