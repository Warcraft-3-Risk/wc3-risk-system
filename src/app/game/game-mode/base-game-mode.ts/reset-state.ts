import { Wait } from 'src/app/utils/wait';
import { TreeManager } from '../../services/tree-service';
import { removeUnits } from '../utillity/remove-units';
import { resetCountries } from '../utillity/reset-countries';
import { resumingUnits } from '../utillity/resuming-units';
import { BaseState } from '../state/base-state';
import { StatisticsController } from 'src/app/statistics/statistics-controller';
import { StateData } from '../state/state-data';

export class ResetState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		this.runAsync();
	}

	async runAsync(): Promise<void> {
		FogEnable(false);

		StatisticsController.getInstance().setViewVisibility(false);

		print('Resetting countries...');
		resetCountries();
		await Wait.forSeconds(1);
		print('Removing units...');
		removeUnits();
		await Wait.forSeconds(1);
		print('Resuming units...');
		resumingUnits();
		await Wait.forSeconds(1);
		print('Resetting trees...');
		TreeManager.getInstance().reset();
		await Wait.forSeconds(1);

		this.nextState(this.stateData);
	}
}
