import { ResetState } from '../base-game-mode/reset-state';
import { SetPromodeTempVisionState } from '../promode-game-mode/set-promode-temp-vision-state';
import { SetupState } from '../base-game-mode/setup-state';
import { BaseMode } from './base-mode';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { PromodeCountdownState } from '../promode-game-mode/promode-countdown-state';
import { PromodeApplyFogState } from '../promode-game-mode/promode-apply-fog-state';
import { EnableCustomMinimapState } from '../promode-game-mode/enable-custom-minimap-state';
import { ProModeGameLoopState } from '../promode-game-mode/promode-game-loop-state';
import { UpdatePlayerStatusState } from '../base-game-mode/update-player-status-state';
import { EnableControlsState } from '../base-game-mode/enable-controls-state';
import { EnableReservesState } from '../base-game-mode/enable-reserves-state';
import { EqualizedCityDistributeState } from '../equalized-promode-game-mode/equalized-city-distribute-state';
import { EqualizedPromodeGameOverState } from '../equalized-promode-game-mode/equalized-promode-game-over-state';

export class EqualizedPromodeData implements StateData {
	// Round tracking moved to static variables in EqualizedPromodeDistributionService
	// to survive state resets between rounds
}

/**
 * Equalized ProMode: Fair 1v1 mode where players play two matches.
 * Match 1: Random city allocation
 * Match 2: Same cities but swapped between players
 * This ensures each player experiences both starting positions.
 */
export class EqualizedPromodeMode extends BaseMode<EqualizedPromodeData> {
	protected setupStates() {
		return [
			new EnableCustomMinimapState(),
			new EnableReservesState(),
			new UpdatePlayerStatusState(),
			new SetupState(),
			new PromodeApplyFogState(),
			new EqualizedCityDistributeState(),
			new SetPromodeTempVisionState(),
			new PromodeCountdownState(),
			new EnableControlsState(),
			new ProModeGameLoopState(),
			new EqualizedPromodeGameOverState(),
			new ResetState(),
		] as BaseState<EqualizedPromodeData>[];
	}

	protected setupData(): EqualizedPromodeData {
		return new EqualizedPromodeData();
	}
}