import { StateData } from '../state/state-data';
import { CountdownState } from '../base-game-mode/countdown-state';
import { CountdownMessage } from 'src/app/utils/messages';
import { STARTING_COUNTDOWN } from '../../../../configs/game-settings';
import { HexColors } from 'src/app/utils/hex-colors';

export class PromodeCountdownState extends CountdownState<StateData> {
	public constructor() {
		super(STARTING_COUNTDOWN);
	}

	override countdownDisplay(duration: number): void {
		const durationText = duration <= 3 ? `${HexColors.TANGERINE}${duration}|r` : `${duration}`;
		CountdownMessage(`The Game will start in\n${durationText}`);
	}
}
