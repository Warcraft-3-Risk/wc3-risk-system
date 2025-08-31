import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';

export class DisablePausesState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		this.runAsync();
	}

	async runAsync(): Promise<void> {
		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player = Player(i);

			if (player == GetLocalPlayer()) {
				for (let index = 0; index < 3; index++) {
					PauseGame(true);
					PauseGame(false);
				}
			}
		}

		ClearTextMessages();

		this.nextState(this.stateData);
	}
}
