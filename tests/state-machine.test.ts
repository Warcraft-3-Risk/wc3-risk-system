import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Tests for the state machine pattern used in BaseMode / BaseState.
 * Since BaseMode/BaseState depend on WC3 globals, we re-implement the core
 * state machine logic here to verify the cycling/restart behavior.
 */

interface StateData {
	value: number;
}

class TestState {
	stateData!: StateData;
	enterCount = 0;
	exitCount = 0;

	onEnterState() {
		this.enterCount++;
	}

	onExitState() {
		this.exitCount++;
	}
}

class TestMode {
	private states: TestState[];
	private currentState: TestState | undefined;
	public restartCount = 0;

	constructor(states: TestState[]) {
		this.states = [...states];
	}

	nextState(stateData: StateData) {
		this.currentState = this.states.shift();

		if (!this.currentState) {
			this.restartCount++;
			return;
		}

		this.currentState.stateData = stateData;
		this.currentState.onEnterState();
	}

	getCurrentState(): TestState | undefined {
		return this.currentState;
	}
}

describe('StateMachine (BaseMode pattern)', () => {
	let stateA: TestState;
	let stateB: TestState;
	let stateC: TestState;
	let mode: TestMode;
	const data: StateData = { value: 42 };

	beforeEach(() => {
		stateA = new TestState();
		stateB = new TestState();
		stateC = new TestState();
		mode = new TestMode([stateA, stateB, stateC]);
	});

	it('should enter the first state on first nextState call', () => {
		mode.nextState(data);

		expect(mode.getCurrentState()).toBe(stateA);
		expect(stateA.enterCount).toBe(1);
	});

	it('should pass state data to the current state', () => {
		mode.nextState(data);

		expect(stateA.stateData).toEqual({ value: 42 });
	});

	it('should cycle through states in order', () => {
		mode.nextState(data);
		expect(mode.getCurrentState()).toBe(stateA);

		mode.nextState(data);
		expect(mode.getCurrentState()).toBe(stateB);

		mode.nextState(data);
		expect(mode.getCurrentState()).toBe(stateC);
	});

	it('should trigger restart when all states are exhausted', () => {
		mode.nextState(data);
		mode.nextState(data);
		mode.nextState(data);

		// Fourth call exhausts the array
		mode.nextState(data);
		expect(mode.restartCount).toBe(1);
	});

	it('should not enter any state on restart', () => {
		mode.nextState(data);
		mode.nextState(data);
		mode.nextState(data);
		mode.nextState(data); // restart

		// stateA, B, C each entered once
		expect(stateA.enterCount).toBe(1);
		expect(stateB.enterCount).toBe(1);
		expect(stateC.enterCount).toBe(1);
	});

	it('should work with a single state', () => {
		const single = new TestState();
		const singleMode = new TestMode([single]);

		singleMode.nextState(data);
		expect(singleMode.getCurrentState()).toBe(single);
		expect(single.enterCount).toBe(1);

		singleMode.nextState(data);
		expect(singleMode.restartCount).toBe(1);
	});

	it('should restart immediately with an empty state list', () => {
		const emptyMode = new TestMode([]);

		emptyMode.nextState(data);
		expect(emptyMode.restartCount).toBe(1);
		expect(emptyMode.getCurrentState()).toBeUndefined();
	});

	it('should allow different state data per transition', () => {
		mode.nextState({ value: 1 });
		expect(stateA.stateData).toEqual({ value: 1 });

		mode.nextState({ value: 2 });
		expect(stateB.stateData).toEqual({ value: 2 });

		mode.nextState({ value: 3 });
		expect(stateC.stateData).toEqual({ value: 3 });
	});
});
