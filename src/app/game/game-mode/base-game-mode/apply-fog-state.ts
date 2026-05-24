import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { SettingsContext } from 'src/app/settings/settings-context';
import { MinimapIconManager } from 'src/app/managers/minimap-icon-manager';

export class ApplyFogState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		this.runAsync();
	}

	async runAsync(): Promise<void> {
		SettingsContext.getInstance().applyStrategy('Fog');
		MinimapIconManager.getInstance().clearSeenCache();

		this.nextState(this.stateData);
	}
}
