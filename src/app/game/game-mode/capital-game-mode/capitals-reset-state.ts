import { UNIT_ID } from 'src/configs/unit-id';
import { CapitalsData } from '../mode/capitals-mode';
import { BaseState } from '../state/base-state';

export class CapitalsResetState extends BaseState<CapitalsData> {
	onEnterState() {
		print('Removing capitals...');
		this.stateData.capitals?.forEach((city, _) => {
			if (city) {
				const unitTypeId = GetUnitTypeId(city.barrack.unit);
				if (unitTypeId == UNIT_ID.CAPITAL || unitTypeId == UNIT_ID.CONQUERED_CAPITAL) {
					IssueImmediateOrderById(city.barrack.unit, UNIT_ID.CITY);
				}
			}
		});
		this.nextState(this.stateData);
	}
}
