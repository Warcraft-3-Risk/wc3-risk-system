import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { Wait } from 'src/app/utils/wait';
import { SettingsContext } from 'src/app/settings/settings-context';

export class ApplyFogState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		this.runAsync();
	}

	async runAsync(): Promise<void> {
		SettingsContext.getInstance().applyStrategy('Fog');

		await Wait.forSeconds(1);

		this.nextState(this.stateData);
	}
}
