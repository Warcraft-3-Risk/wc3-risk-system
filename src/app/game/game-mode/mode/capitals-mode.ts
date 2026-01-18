import { City } from 'src/app/city/city';
import { BaseMode } from './base-mode';
import { StateData } from '../state/state-data';
import { SetupState } from '../base-game-mode/setup-state';
import { CountdownState } from '../base-game-mode/countdown-state';
import { GameOverState } from '../base-game-mode/game-over-state';
import { ResetState } from '../base-game-mode/reset-state';
import { BaseState } from '../state/base-state';
import { CapitalsSelectionState } from '../capital-game-mode/capitals-selection-state';
import { CapitalsDistributeState } from '../capital-game-mode/capitals-distribute-state';
import { VisionState } from '../base-game-mode/vision-state';
import { CapitalsGameLoopState } from '../capital-game-mode/capitals-game-loop-state';
import { CapitalsDistributeCapitalsState } from '../capital-game-mode/capitals-distribute-capitals-state';
import { ApplyFogState } from '../base-game-mode/apply-fog-state';
import { CapitalAssignCountrytNameState } from '../capital-game-mode/capital-assign-country-name-state';
import { UpdatePlayerStatusState } from '../base-game-mode/update-player-status-state';
import { EnableControlsState } from '../base-game-mode/enable-controls-state';

export class CapitalsData implements StateData {
	public playerCapitalSelections: Map<player, City>;
	public capitals: Map<player, City>;
}

export class CapitalsMode extends BaseMode<CapitalsData> {
	protected setupStates() {
		return [
			new UpdatePlayerStatusState(),
			new SetupState(),
			new ApplyFogState(),
			new CapitalsSelectionState(),
			new CapitalsDistributeCapitalsState(),
			new CapitalsDistributeState(),
			new VisionState(),
			new CapitalAssignCountrytNameState(),
			new CountdownState(),
			new EnableControlsState(),
			new CapitalsGameLoopState(),
			new GameOverState(),
			new ResetState(),
		] as BaseState<CapitalsData>[];
	}

	protected setupData(): CapitalsData {
		return new CapitalsData();
	}
}
