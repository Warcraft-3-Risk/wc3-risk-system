import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { MinimapIconManager } from 'src/app/managers/minimap-icon-manager';

/**
 * Switches on the custom minimap drawing. Only part of the promode modes (ProMode, Chaos, Equalized),
 * so every other mode keeps the native minimap. Activation happens once; later matches in the
 * same session are refreshed by ResetState instead.
 */
export class EnableCustomMinimapState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		MinimapIconManager.getInstance().activate();

		this.nextState(this.stateData);
	}
}
