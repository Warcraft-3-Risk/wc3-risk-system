import { CapitalsData } from '../mode/capitals-mode';
import { BaseState } from '../state/base-state';
import { LandCity } from 'src/app/city/land-city';

export class CapitalsResetState extends BaseState<CapitalsData> {
	onEnterState() {
		print('Removing capitals...');
		this.stateData.capitals?.forEach((city, _) => {
			if (city instanceof LandCity) {
				city.reset();
			}
		});
		this.nextState(this.stateData);
	}
}
