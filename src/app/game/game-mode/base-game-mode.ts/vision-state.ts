import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { SettingsContext } from 'src/app/settings/settings-context';

export class VisionState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		this.run();
	}

	run(): void {
		SettingsContext.getInstance().applyStrategy('Fog');

		ClearTextMessages();

		this.nextState(this.stateData);
	}
}
