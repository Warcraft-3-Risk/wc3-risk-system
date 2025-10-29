import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { PlayerManager } from 'src/app/player/player-manager';

export class EnableControlsState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		PlayerManager.getInstance().players.forEach((player) => {
			// foreach active player, enable select and drag select if local player
			if (GetLocalPlayer() == player.getPlayer() && player.status.isActive()) {
				EnableSelect(true, true);
				EnableDragSelect(true, true);
			}

			if (GetLocalPlayer() == player.getPlayer() && player.status.isEliminated()) {
				EnableSelect(false, false);
				EnableDragSelect(false, false);
			}
		});
		this.nextState(this.stateData);
	}
}
