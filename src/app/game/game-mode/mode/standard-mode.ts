import { CityDistributeState } from '../base-game-mode/city-distribute-state';
import { CountdownState } from '../base-game-mode/countdown-state';
import { GameLoopState } from '../base-game-mode/game-loop-state';
import { GameOverState } from '../base-game-mode/game-over-state';
import { ResetState } from '../base-game-mode/reset-state';
import { SetupState } from '../base-game-mode/setup-state';
import { BaseMode } from './base-mode';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { VisionState } from '../base-game-mode/vision-state';
import { ApplyFogState } from '../base-game-mode/apply-fog-state';
import { DisablePausesState } from '../base-game-mode/disable-pauses-state';

export class StandardData implements StateData {}

export class StandardMode extends BaseMode<StandardData> {
	protected setupStates() {
		return [
			new DisablePausesState(),
			new SetupState(),
			new ApplyFogState(),
			new CityDistributeState(),
			new VisionState(),
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
