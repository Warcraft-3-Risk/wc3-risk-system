import { CityDistributeState } from '../base-game-mode.ts/city-distribute-state';
import { GameLoopState } from '../base-game-mode.ts/game-loop-state';
import { ResetState } from '../base-game-mode.ts/reset-state';
import { SetPromodeTempVisionState } from '../promode-game-mode/set-promode-temp-vision-state';
import { SetupState } from '../base-game-mode.ts/setup-state';
import { BaseMode } from './base-mode';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { PromodeCountdownState } from '../promode-game-mode/promode-countdown-state';
import { W3CGameOverState } from '../w3c-mode/w3c-game-over-state';

export class PromodeData implements StateData {}

export class W3CMode extends BaseMode<PromodeData> {
	protected setupStates() {
		return [
			new SetupState(),
			new CityDistributeState(),
			new SetPromodeTempVisionState(),
			new PromodeCountdownState(),
			new GameLoopState(),
			new W3CGameOverState(),
			new ResetState(),
		] as BaseState<PromodeData>[];
	}

	protected setupData(): PromodeData {
		return new PromodeData();
	}
}
