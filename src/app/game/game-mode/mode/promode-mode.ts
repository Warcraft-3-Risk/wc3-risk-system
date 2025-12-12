import { CityDistributeState } from '../base-game-mode/city-distribute-state';
import { GameOverState } from '../base-game-mode/game-over-state';
import { ResetState } from '../base-game-mode/reset-state';
import { SetPromodeTempVisionState } from '../promode-game-mode/set-promode-temp-vision-state';
import { SetupState } from '../base-game-mode/setup-state';
import { BaseMode } from './base-mode';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { PromodeCountdownState } from '../promode-game-mode/promode-countdown-state';
import { ApplyFogState } from '../base-game-mode/apply-fog-state';
import { ProModeGameLoopState } from '../promode-game-mode/promode-game-loop-state';
import { UpdatePlayerStatusState } from '../base-game-mode/update-player-status-state';
import { EnableControlsState } from '../base-game-mode/enable-controls-state';

export class PromodeData implements StateData {}

export class PromodeMode extends BaseMode<PromodeData> {
	protected setupStates() {
		return [
			new UpdatePlayerStatusState(),
			new SetupState(),
			new ApplyFogState(),
			new CityDistributeState(),
			new SetPromodeTempVisionState(),
			new PromodeCountdownState(),
			new EnableControlsState(),
			new ProModeGameLoopState(),
			new GameOverState(),
			new ResetState(),
		] as BaseState<PromodeData>[];
	}

	protected setupData(): PromodeData {
		return new PromodeData();
	}
}
