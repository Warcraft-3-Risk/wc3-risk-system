// import { Wait } from 'src/app/utils/wait';
// import { BaseState } from '../state/base-state';
// import { StateData } from '../state/state-data';

// export class WaitState<T extends StateData> extends BaseState<T> {
// 	private durationSeconds?: number;

// 	public constructor(durationSeconds: number = 2) {
// 		super();
// 		this.durationSeconds = durationSeconds;
// 	}

// 	onEnterState() {
// 		this.runAsync();
// 	}

// 	async runAsync(): Promise<void> {
// 		await Wait.forSeconds(this.durationSeconds);
// 		this.nextState(this.stateData);
// 	}
// }
