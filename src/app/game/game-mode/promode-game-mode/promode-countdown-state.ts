import { StateData } from '../state/state-data';
import { CountdownState } from '../base-game-mode.ts/countdown-state';
export class PromodeCountdownState extends CountdownState<StateData> {
	public constructor() {
		super(5);
	}
}
