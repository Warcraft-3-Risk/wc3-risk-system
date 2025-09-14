import { StateData } from '../state/state-data';
import { CountdownState } from '../base-game-mode/countdown-state';
import { CountdownMessage } from 'src/app/utils/messages';
import { STARTING_COUNTDOWN } from '../../../../configs/game-settings';

export class PromodeCountdownState extends CountdownState<StateData> {
	public constructor() {
		super(STARTING_COUNTDOWN);
	}

	override countdownDisplay(duration: number): void {
		CountdownMessage(`The Game will start in:\n${duration}`);
	}
}
