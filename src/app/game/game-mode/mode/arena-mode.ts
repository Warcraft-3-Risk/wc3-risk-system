import { SetupState } from '../base-game-mode/setup-state';
import { UpdatePlayerStatusState } from '../base-game-mode/update-player-status-state';
import { EnableControlsState } from '../base-game-mode/enable-controls-state';
import { ArenaSetupState } from '../arena-game-mode/arena-setup-state';
import { ArenaCountdownState } from '../arena-game-mode/arena-countdown-state';
import { ArenaGameLoopState } from '../arena-game-mode/arena-game-loop-state';
import { ArenaRoundOverState } from '../arena-game-mode/arena-round-over-state';
import { ArenaResetState } from '../arena-game-mode/arena-reset-state';
import { BaseMode } from './base-mode';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';

export class ArenaModeData implements StateData {}

/**
 * Arena game type: rounds of 1v1 fights with identical random armies, each inside a single country, on a ladder
 * of arenas. Each round runs through these states once; when they run out the mode is recreated for the next round.
 */
export class ArenaMode extends BaseMode<ArenaModeData> {
	protected setupStates() {
		return [
			new UpdatePlayerStatusState(),
			new SetupState(),
			new ArenaSetupState(),
			new ArenaCountdownState(),
			new EnableControlsState(),
			new ArenaGameLoopState(),
			new ArenaRoundOverState(),
			new ArenaResetState(),
		] as BaseState<ArenaModeData>[];
	}

	protected setupData(): ArenaModeData {
		return new ArenaModeData();
	}
}
