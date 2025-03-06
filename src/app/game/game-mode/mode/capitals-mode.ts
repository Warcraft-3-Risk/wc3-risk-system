import { City } from 'src/app/city/city';
import { BaseMode } from './base-mode';
import { StateData } from '../state/state-data';
import { SetupState } from '../base-game-mode.ts/setup-state';
import { CountdownState } from '../base-game-mode.ts/countdown-state';
import { GameLoopState } from '../base-game-mode.ts/game-loop-state';
import { GameOverState } from '../base-game-mode.ts/game-over-state';
import { ResetState } from '../base-game-mode.ts/reset-state';
import { SetPromodeTempVisionState } from '../base-game-mode.ts/set-promode-temp-vision-state';
import { BaseState } from '../state/base-state';
import { CapitalsResetState } from '../capital-game-mode/capitals-reset-state';
import { CapitalsSelectionState } from '../capital-game-mode/capitals-selection-state';
import { CapitalsDistributeState } from '../capital-game-mode/capitals-distribute-state';

export class CapitalsData implements StateData {
	public playerCapitalSelections: Map<player, City>;
	public capitals: Map<player, City>;
}

export class CapitalsMode extends BaseMode<CapitalsData> {
	protected setupStates() {
		return [
			new SetupState(),
			new CapitalsSelectionState(),
			new CapitalsDistributeState(),
			new SetPromodeTempVisionState(),
			new CountdownState(),
			new GameLoopState(),
			new GameOverState(),
			new CapitalsResetState(),
			new ResetState(),
		] as BaseState<CapitalsData>[];
	}

	protected setupData(): CapitalsData {
		return new CapitalsData();
	}
}
