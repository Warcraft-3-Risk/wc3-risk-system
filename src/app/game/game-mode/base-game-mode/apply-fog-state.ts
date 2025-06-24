import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { Wait } from 'src/app/utils/wait';
import { SettingsContext } from 'src/app/settings/settings-context';
import { FogManager } from 'src/app/managers/fog-manager';

export class ApplyFogState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		this.runAsync();
	}

	async runAsync(): Promise<void> {
		FogManager.getInstance().turnFogOff();
		await Wait.forSeconds(3);
		SettingsContext.getInstance().applyStrategy('Fog');

		this.nextState(this.stateData);
	}
}
