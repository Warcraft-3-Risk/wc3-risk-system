import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { Wait } from 'src/app/utils/wait';
import { PlayerManager } from 'src/app/player/player-manager';
import { GlobalMessage } from 'src/app/utils/messages';

export class W3CMatchValidationState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		this.runAsync();
	}

	async runAsync(): Promise<void> {
		const humanPlayers = PlayerManager.getInstance().getHumanPlayers();

		// If there are no human players, we cannot proceed with the match and they win by default after a delay
		if (humanPlayers.length < 2) {
			await Wait.forSeconds(1);
			GlobalMessage('No human opponents found. You win by default!', 'Sound\\Interface\\ItemReceived.flac', 10);
			await Wait.forSeconds(3);
			CustomVictoryBJ(humanPlayers[0].getPlayer(), true, true);
			return;
		}

		this.nextState(this.stateData);
	}
}
