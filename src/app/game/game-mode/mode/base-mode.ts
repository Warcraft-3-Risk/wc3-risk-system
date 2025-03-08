import { EventEmitter } from 'src/app/utils/events/event-emitter';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { EVENT_SET_GAME_MODE } from 'src/app/utils/events/event-constants';
import { GlobalGameData } from '../../state/global-game-state';
import { debugPrint } from 'src/app/utils/debug-print';

export class BaseData implements StateData {}

export abstract class BaseMode<T extends StateData> {
	private states: BaseState<T>[];
	private currentState: BaseState<T>;

	protected abstract setupStates(): BaseState<T>[];
	protected abstract setupData(): T;

	constructor() {
		this.states = this.setupStates();
		GlobalGameData.stateData = this.setupData();
	}

	nextState(stateData: T) {
		this.currentState = this.states?.shift();

		// If there are no more states, restart the game mode, else enter the next state
		if (!this.currentState) {
			debugPrint('No more states, restarting game mode, state length:', this.states.length);
			debugPrint('Game mode: ' + GlobalGameData.gameMode);
			EventEmitter.getInstance().emit(EVENT_SET_GAME_MODE, GlobalGameData.gameMode);
			return;
		}

		this.currentState.stateData = stateData;

		debugPrint('Entering next state, state length:', this.states.length);
		this.currentState.onEnterState();
	}

	getCurrentState(): BaseState<T> {
		return this.currentState;
	}
}
