import { CityDistributeState } from '../base-game-mode/city-distribute-state';
import { GameLoopState } from '../base-game-mode/game-loop-state';
import { ResetState } from '../base-game-mode/reset-state';
import { SetPromodeTempVisionState } from '../promode-game-mode/set-promode-temp-vision-state';
import { SetupState } from '../base-game-mode/setup-state';
import { BaseMode } from './base-mode';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { PromodeCountdownState } from '../promode-game-mode/promode-countdown-state';
import { W3CGameOverState } from '../w3c-mode/w3c-game-over-state';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { debugPrint } from 'src/app/utils/debug-print';
import { PlayerManager } from 'src/app/player/player-manager';
import { Wait } from 'src/app/utils/wait';
import { GlobalMessage } from 'src/app/utils/messages';
import { W3C_TERMINATE_IF_ALONE_HUMAN_PLAYER } from 'src/configs/game-settings';

export class PromodeData implements StateData {}

export class W3CMode extends BaseMode<PromodeData> {
	protected setupStates() {
		const states = [
			new SetupState(),
			new CityDistributeState(),
			new SetPromodeTempVisionState(),
			new PromodeCountdownState(),
			new GameLoopState(),
			new W3CGameOverState(),
			new ResetState(),
		] as BaseState<PromodeData>[];

		return states.map((s) => this.wrapState(s));
	}

	protected setupData(): PromodeData {
		return new PromodeData();
	}

	wrapState<T extends StateData>(state: BaseState<T>): BaseState<T> {
		const originalOnPlayerLeft = state.onPlayerLeft.bind(state);
		const originalOnEnterState = state.onEnterState.bind(state);

		state.onPlayerLeft = async (player: ActivePlayer) => {
			debugPrint(`[W3CMode] onPlayerLeft`);
			const terminate = await this.checkAndHandleVictoryAsync('All human opponents have left. Victory by default!');
			if (!terminate) originalOnPlayerLeft(player);
		};

		state.onEnterState = async () => {
			debugPrint(`[W3CMode] onEnterState)`);
			const terminate = await this.checkAndHandleVictoryAsync('No human opponents found. Victory by default!');
			if (!terminate) originalOnEnterState();
		};

		return state;
	}

	async checkAndHandleVictoryAsync(message: string): Promise<boolean> {
		const humanPlayers = PlayerManager.getInstance().getCurrentActiveHumanPlayers();

		const terminate = W3C_TERMINATE_IF_ALONE_HUMAN_PLAYER && humanPlayers.length < 2;

		if (terminate) {
			await Wait.forSeconds(1);
			GlobalMessage(message, 'Sound\\Interface\\ItemReceived.flac', 10);
			await Wait.forSeconds(1);
			CustomVictoryBJ(humanPlayers[0].getPlayer(), true, true);
		}

		return terminate;
	}
}
