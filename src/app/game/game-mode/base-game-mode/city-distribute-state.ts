import { RegionToCity } from 'src/app/city/city-map';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { StandardDistributionService } from '../../services/distribution-service/standard-distribution-service';
import { GlobalGameData } from '../../state/global-game-state';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { SharedSlotManager } from '../../services/shared-slot-manager';

export class CityDistributeState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		new StandardDistributionService().runDistro(() => {
			this.nextState(this.stateData);
		});
	}
}
