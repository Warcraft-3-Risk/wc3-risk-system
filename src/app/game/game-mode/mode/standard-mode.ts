import { CityDistributeState } from '../base-game-mode.ts/city-distribute-state';
import { CountdownState } from '../base-game-mode.ts/countdown-state';
import { GameLoopState } from '../base-game-mode.ts/game-loop-state';
import { GameOverState } from '../base-game-mode.ts/game-over-state';
import { ResetState } from '../base-game-mode.ts/reset-state';
import { SetupState } from '../base-game-mode.ts/setup-state';
import { BaseMode } from './base-mode';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { WaitState } from '../base-game-mode.ts/wait-state';
import { VisionState } from '../base-game-mode.ts/vision-state';

export class StandardData implements StateData {}

export class StandardMode extends BaseMode<StandardData> {
	protected setupStates() {
		return [
			new SetupState(),
			new WaitState(2),
			new CityDistributeState(),
			new WaitState(2),
			new VisionState(),
			new WaitState(2),
			new CountdownState(),
			new GameLoopState(),
			new GameOverState(),
			new ResetState(),
		] as BaseState<StandardData>[];
	}

	protected setupData(): StandardData {
		return new StandardData();
	}
}
