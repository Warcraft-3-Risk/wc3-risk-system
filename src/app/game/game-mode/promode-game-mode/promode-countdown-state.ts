import { StateData } from '../state/state-data';
import { CountdownState } from '../base-game-mode/countdown-state';
export class PromodeCountdownState extends CountdownState<StateData> {
	public constructor() {
		super(10);
	}
}
