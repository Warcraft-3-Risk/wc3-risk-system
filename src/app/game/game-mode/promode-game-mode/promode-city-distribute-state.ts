import { PromodeDistributionService } from '../../services/distribution-service/promode-distribution-service';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';

export class PromodeCityDistributeState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		new PromodeDistributionService().runDistro(() => {
			this.nextState(this.stateData);
		});
	}
}
