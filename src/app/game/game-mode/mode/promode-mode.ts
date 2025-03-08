import { CityDistributeState } from '../base-game-mode.ts/city-distribute-state';
import { CountdownState } from '../base-game-mode.ts/countdown-state';
import { GameLoopState } from '../base-game-mode.ts/game-loop-state';
import { GameOverState } from '../base-game-mode.ts/game-over-state';
import { ResetState } from '../base-game-mode.ts/reset-state';
import { SetPromodeTempVisionState } from '../promode-game-mode/set-promode-temp-vision-state';
import { SetupState } from '../base-game-mode.ts/setup-state';
import { BaseMode } from './base-mode';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { WaitState } from '../base-game-mode.ts/wait-state';

export class PromodeData implements StateData {}

export class PromodeMode extends BaseMode<PromodeData> {
	protected setupStates() {
		return [
			new SetupState(),
			new WaitState(2),
			new CityDistributeState(),
			new SetPromodeTempVisionState(),
			new WaitState(2),
			new CountdownState(),
			new GameLoopState(),
			new GameOverState(),
			new ResetState(),
		] as BaseState<PromodeData>[];
	}

	protected setupData(): PromodeData {
		return new PromodeData();
	}
}
