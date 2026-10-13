import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { ReserveManager } from 'src/app/managers/reserve-manager';
import { SettingsContext } from 'src/app/settings/settings-context';

/**
 * Switches on the unit reserves when the Reserves game type is selected. It is part of every mode the
 * Reserves game type can run through (Standard, ProMode and Equalized ProMode) and does nothing otherwise.
 * Activation happens once; later matches in the same session are cleared by ResetState instead.
 */
export class EnableReservesState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		if (SettingsContext.getInstance().isReserves()) {
			ReserveManager.getInstance().activate();
		}

		this.nextState(this.stateData);
	}
}
