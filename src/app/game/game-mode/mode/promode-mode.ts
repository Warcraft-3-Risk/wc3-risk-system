import { CityDistributeState } from '../base-game-mode.ts/city-distribute-state';
import { GameLoopState } from '../base-game-mode.ts/game-loop-state';
import { GameOverState } from '../base-game-mode.ts/game-over-state';
import { ResetState } from '../base-game-mode.ts/reset-state';
import { SetPromodeTempVisionState } from '../promode-game-mode/set-promode-temp-vision-state';
import { SetupState } from '../base-game-mode.ts/setup-state';
import { BaseMode } from './base-mode';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { PromodeCountdownState } from '../promode-game-mode/promode-countdown-state';

export class PromodeData implements StateData {}

export class PromodeMode extends BaseMode<PromodeData> {
	protected setupStates() {
		return [
			new SetupState(),
			new CityDistributeState(),
			new SetPromodeTempVisionState(),
			new PromodeCountdownState(),
			new GameLoopState(),
			new GameOverState(),
			new ResetState(),
		] as BaseState<PromodeData>[];
	}

	protected setupData(): PromodeData {
		return new PromodeData();
	}
}
