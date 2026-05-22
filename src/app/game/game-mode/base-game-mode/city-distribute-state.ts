import { StandardDistributionService } from '../../services/distribution-service/standard-distribution-service';
import { PromodeDistributionService } from '../../services/distribution-service/promode-distribution-service';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { SettingsContext } from 'src/app/settings/settings-context';

export class CityDistributeState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		const settings = SettingsContext.getInstance();
		const usePromodeDistribution = settings.isPromode() || settings.isChaosPromode() || settings.isW3CMode();
		const service = usePromodeDistribution ? new PromodeDistributionService() : new StandardDistributionService();
		service.runDistro(() => {
			this.nextState(this.stateData);
		});
	}
}
