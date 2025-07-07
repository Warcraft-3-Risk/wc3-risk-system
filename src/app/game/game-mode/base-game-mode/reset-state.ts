import { Wait } from 'src/app/utils/wait';
import { TreeManager } from '../../services/tree-service';
import { removeUnits } from '../utillity/remove-units';
import { resetCountries } from '../utillity/reset-countries';
import { BaseState } from '../state/base-state';
import { StatisticsController } from 'src/app/statistics/statistics-controller';
import { StateData } from '../state/state-data';
import { FogManager } from 'src/app/managers/fog-manager';

export class ResetState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		this.runAsync();
	}

	async runAsync(): Promise<void> {
		print('Resetting match...');

		StatisticsController.getInstance().setViewVisibility(false);

		FogManager.getInstance().turnFogOff();

		// Initialize fog for all players
		SetTimeOfDayScale(0);
		SetTimeOfDay(12.0);

		print('Removing units...');
		removeUnits();
		await Wait.forSeconds(4);
		print('Resetting countries...');
		resetCountries();
		await Wait.forSeconds(1);
		print('Resetting trees...');
		TreeManager.getInstance().reset();
		await Wait.forSeconds(1);

		this.nextState(this.stateData);
	}
}
