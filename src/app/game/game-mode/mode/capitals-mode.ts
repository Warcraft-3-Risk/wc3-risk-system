import { City } from 'src/app/city/city';
import { BaseMode } from './base-mode';
import { StateData } from '../state/state-data';
import { SetupState } from '../base-game-mode.ts/setup-state';
import { CountdownState } from '../base-game-mode.ts/countdown-state';
import { GameLoopState } from '../base-game-mode.ts/game-loop-state';
import { GameOverState } from '../base-game-mode.ts/game-over-state';
import { ResetState } from '../base-game-mode.ts/reset-state';
import { BaseState } from '../state/base-state';
import { CapitalsResetState } from '../capital-game-mode/capitals-reset-state';
import { CapitalsSelectionState } from '../capital-game-mode/capitals-selection-state';
import { CapitalsDistributeState } from '../capital-game-mode/capitals-distribute-state';
import { WaitState } from '../base-game-mode.ts/wait-state';
import { VisionState } from '../base-game-mode.ts/vision-state';

export class CapitalsData implements StateData {
	public playerCapitalSelections: Map<player, City>;
	public capitals: Map<player, City>;
}

export class CapitalsMode extends BaseMode<CapitalsData> {
	protected setupStates() {
		return [
			new SetupState(),
			new WaitState(2),
			new CapitalsSelectionState(),
			new CapitalsDistributeState(),
			new VisionState(),
			new WaitState(2),
			new CountdownState(),
			new GameLoopState(),
			new GameOverState(),
			new CapitalsResetState(),
			new WaitState(1),
			new ResetState(),
		] as BaseState<CapitalsData>[];
	}

	protected setupData(): CapitalsData {
		return new CapitalsData();
	}
}
