import { City } from 'src/app/city/city';
import { ResetState } from '../base-game-mode.ts/reset-state';
import { UNIT_ID } from 'src/configs/unit-id';
import { CapitalsData } from '../mode/capitals-mode';

export class CapitalsResetState extends ResetState<CapitalsData> {
	private capitals: Map<player, City>;

	onEnterState() {
		this.capitals?.forEach((city, _) => {
			if (city) {
				const unitTypeId = GetUnitTypeId(city.barrack.unit);
				if (unitTypeId == UNIT_ID.CAPITAL || unitTypeId == UNIT_ID.CONQUERED_CAPITAL) {
					IssueImmediateOrderById(city.barrack.unit, UNIT_ID.CITY);
				}
			}
		});

		super.onEnterState();
	}
}
