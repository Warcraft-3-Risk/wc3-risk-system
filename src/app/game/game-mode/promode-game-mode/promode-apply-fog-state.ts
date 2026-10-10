import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { SettingsContext } from 'src/app/settings/settings-context';
import { MinimapIconManager } from 'src/app/managers/minimap-icon-manager';

/**
 * Promode version of ApplyFogState. Applies the fog setting straight away (no fog-off reveal and
 * wait like the shared ApplyFogState), then clears the custom minimap's city memory so nothing
 * seen before fog was applied is remembered.
 */
export class PromodeApplyFogState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		SettingsContext.getInstance().applyStrategy('Fog');
		MinimapIconManager.getInstance().clearSeenCache();

		this.nextState(this.stateData);
	}
}
