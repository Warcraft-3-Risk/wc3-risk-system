/**
 * Pure-logic module mirroring the game's mode selection, state sequencing,
 * and lifecycle transitions — free of WC3 runtime dependencies.
 *
 * Each production mode class (StandardMode, PromodeMode, etc.) defines an
 * ordered list of states via `setupStates()`. This module represents those
 * same sequences as string arrays so they can be verified in unit tests.
 *
 * The logic here is intentionally kept in sync with the production code:
 *  - src/app/game/event-coordinator.ts      → selectMode()
 *  - src/app/game/game-mode/mode/*.ts        → state sequences
 *  - src/app/game/game-mode/state/base-state.ts → player event handlers
 *  - src/app/game/state/global-game-state.ts → match lifecycle
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GameType = 'Standard' | 'Capitals';
export type MatchState = 'modeSelection' | 'preMatch' | 'inProgress' | 'postMatch';

export type ModeName = 'StandardMode' | 'PromodeMode' | 'EqualizedPromodeMode' | 'W3CMode' | 'CapitalsMode';

export interface ModeSelectionSettings {
	GameType: number; // 0 = Standard, 1 = Capitals
	Promode: number; // 0 = off, 1 = on, 2 = equalized
	Fog: number;
	Diplomacy: { option: number }; // 0 = FFA, 1 = Teams, 2 = Locked
	Overtime: { option: number };
	w3cModeEnabled: boolean;
}

export interface SimulatedState {
	name: string;
	/** Whether this state auto-advances to the next state (true for most states). */
	autoAdvance: boolean;
	/** Which player events this state handles specially. */
	handlesRestart: boolean;
	handlesPlayerDead: boolean;
	handlesPlayerLeft: boolean;
	handlesPlayerForfeit: boolean;
	/** If true, entering this state sets matchState to a specific value. */
	setsMatchState?: MatchState;
	/** For game loop states: whether match can end via postMatch check. */
	isGameLoop: boolean;
}

// ---------------------------------------------------------------------------
// State definitions — these mirror the production state classes
// ---------------------------------------------------------------------------

function makeState(name: string, overrides: Partial<SimulatedState> = {}): SimulatedState {
	return {
		name,
		autoAdvance: true,
		handlesRestart: false,
		handlesPlayerDead: false,
		handlesPlayerLeft: false,
		handlesPlayerForfeit: false,
		isGameLoop: false,
		...overrides,
	};
}

// Base states shared by multiple modes
const UpdatePlayerStatusState = () => makeState('UpdatePlayerStatusState');
const SetupState = () => makeState('SetupState');
const ApplyFogState = () => makeState('ApplyFogState');
const CityDistributeState = () => makeState('CityDistributeState');
const VisionState = () => makeState('VisionState');

const CountdownState = () =>
	makeState('CountdownState', {
		handlesPlayerForfeit: true,
	});

const EnableControlsState = () => makeState('EnableControlsState');

const GameLoopState = () =>
	makeState('GameLoopState', {
		autoAdvance: false,
		isGameLoop: true,
		setsMatchState: 'inProgress',
		handlesPlayerDead: true,
		handlesPlayerLeft: true,
		handlesPlayerForfeit: true,
		handlesRestart: true,
	});

const GameOverState = () =>
	makeState('GameOverState', {
		autoAdvance: false,
		setsMatchState: 'postMatch',
		handlesRestart: true,
	});

const ResetState = () => makeState('ResetState');

// Promode-specific states
const SetPromodeTempVisionState = () => makeState('SetPromodeTempVisionState');

const PromodeCountdownState = () =>
	makeState('PromodeCountdownState', {
		handlesPlayerForfeit: true,
	});

const ProModeGameLoopState = () =>
	makeState('ProModeGameLoopState', {
		autoAdvance: false,
		isGameLoop: true,
		setsMatchState: 'inProgress',
		handlesPlayerDead: true,
		handlesPlayerLeft: true,
		handlesPlayerForfeit: true,
		handlesRestart: true,
	});

// Capitals-specific states
const CapitalsSelectionState = () => makeState('CapitalsSelectionState');
const CapitalsDistributeCapitalsState = () => makeState('CapitalsDistributeCapitalsState');
const CapitalsDistributeState = () => makeState('CapitalsDistributeState');
const CapitalAssignCountrytNameState = () => makeState('CapitalAssignCountrytNameState');

const CapitalsGameLoopState = () =>
	makeState('CapitalsGameLoopState', {
		autoAdvance: false,
		isGameLoop: true,
		setsMatchState: 'inProgress',
		handlesPlayerDead: true,
		handlesPlayerLeft: true,
		handlesPlayerForfeit: true,
		handlesRestart: true,
	});

// W3C-specific states
const W3CTipsState = () => makeState('W3CTipsState');

const W3CGameOverState = () =>
	makeState('W3CGameOverState', {
		autoAdvance: false,
		setsMatchState: 'postMatch',
		handlesRestart: true,
	});

// Equalized Promode-specific states
const EqualizedCityDistributeState = () => makeState('EqualizedCityDistributeState');

const EqualizedPromodeGameOverState = () =>
	makeState('EqualizedPromodeGameOverState', {
		autoAdvance: false,
		setsMatchState: 'postMatch',
		handlesRestart: true,
	});

// ---------------------------------------------------------------------------
// Mode state sequences — mirrors each mode's setupStates()
// ---------------------------------------------------------------------------

export function getStandardModeStates(): SimulatedState[] {
	return [
		UpdatePlayerStatusState(),
		SetupState(),
		ApplyFogState(),
		CityDistributeState(),
		VisionState(),
		CountdownState(),
		EnableControlsState(),
		GameLoopState(),
		GameOverState(),
		ResetState(),
	];
}

export function getPromodeModeStates(): SimulatedState[] {
	return [
		UpdatePlayerStatusState(),
		SetupState(),
		ApplyFogState(),
		CityDistributeState(),
		SetPromodeTempVisionState(),
		PromodeCountdownState(),
		EnableControlsState(),
		ProModeGameLoopState(),
		GameOverState(),
		ResetState(),
	];
}

export function getEqualizedPromodeModeStates(): SimulatedState[] {
	return [
		UpdatePlayerStatusState(),
		SetupState(),
		ApplyFogState(),
		EqualizedCityDistributeState(),
		SetPromodeTempVisionState(),
		PromodeCountdownState(),
		EnableControlsState(),
		ProModeGameLoopState(),
		EqualizedPromodeGameOverState(),
		ResetState(),
	];
}

export function getW3CModeStates(): SimulatedState[] {
	return [
		UpdatePlayerStatusState(),
		SetupState(),
		ApplyFogState(),
		CityDistributeState(),
		SetPromodeTempVisionState(),
		W3CTipsState(),
		PromodeCountdownState(),
		EnableControlsState(),
		ProModeGameLoopState(),
		W3CGameOverState(),
		ResetState(),
	];
}

export function getCapitalsModeStates(): SimulatedState[] {
	return [
		UpdatePlayerStatusState(),
		SetupState(),
		ApplyFogState(),
		CapitalsSelectionState(),
		CapitalsDistributeCapitalsState(),
		CapitalsDistributeState(),
		VisionState(),
		CapitalAssignCountrytNameState(),
		CountdownState(),
		EnableControlsState(),
		CapitalsGameLoopState(),
		GameOverState(),
		ResetState(),
	];
}

// ---------------------------------------------------------------------------
// Mode selection routing — mirrors EventCoordinator.applyGameMode()
// ---------------------------------------------------------------------------

export function selectMode(settings: ModeSelectionSettings): ModeName {
	const gameType: GameType = settings.GameType === 1 ? 'Capitals' : 'Standard';

	if (gameType === 'Capitals') {
		return 'CapitalsMode';
	}

	if (settings.w3cModeEnabled) {
		return 'W3CMode';
	}

	if (settings.Promode === 2) {
		return 'EqualizedPromodeMode';
	}

	if (settings.Promode === 1) {
		return 'PromodeMode';
	}

	return 'StandardMode';
}

export function getStatesForMode(mode: ModeName): SimulatedState[] {
	switch (mode) {
		case 'StandardMode':
			return getStandardModeStates();
		case 'PromodeMode':
			return getPromodeModeStates();
		case 'EqualizedPromodeMode':
			return getEqualizedPromodeModeStates();
		case 'W3CMode':
			return getW3CModeStates();
		case 'CapitalsMode':
			return getCapitalsModeStates();
	}
}

// ---------------------------------------------------------------------------
// Settings presets — mirrors ModeSelection.run() branches
// ---------------------------------------------------------------------------

export function getFFASettings(): ModeSelectionSettings {
	return {
		GameType: 0,
		Promode: 0,
		Fog: 0,
		Diplomacy: { option: 0 },
		Overtime: { option: 1 },
		w3cModeEnabled: false,
	};
}

export function getPromode1v1Settings(): ModeSelectionSettings {
	return {
		GameType: 0,
		Promode: 1,
		Fog: 1,
		Diplomacy: { option: 0 },
		Overtime: { option: 0 },
		w3cModeEnabled: false,
	};
}

export function getW3CSettings(): ModeSelectionSettings {
	return {
		GameType: 0,
		Promode: 1,
		Fog: 1,
		Diplomacy: { option: 2 },
		Overtime: { option: 3 },
		w3cModeEnabled: true,
	};
}

export function getEqualizedPromodeSettings(): ModeSelectionSettings {
	return {
		GameType: 0,
		Promode: 2,
		Fog: 1,
		Diplomacy: { option: 0 },
		Overtime: { option: 0 },
		w3cModeEnabled: false,
	};
}

export function getCapitalsSettings(): ModeSelectionSettings {
	return {
		GameType: 1,
		Promode: 0,
		Fog: 0,
		Diplomacy: { option: 0 },
		Overtime: { option: 0 },
		w3cModeEnabled: false,
	};
}

// ---------------------------------------------------------------------------
// Game state machine simulation
// ---------------------------------------------------------------------------

export interface GameSimulation {
	modeName: ModeName;
	states: SimulatedState[];
	currentStateIndex: number;
	matchState: MatchState;
	matchCount: number;
	turn: number;
	/** For W3C mode: number of human players remaining. */
	humanPlayerCount: number;
	/** For equalized promode: current round (1 or 2). */
	equalizedRound: number;
	/** For equalized promode: winner of round 1. */
	equalizedRound1Winner: string | null;
	/** Track if the game was terminated early (W3C). */
	terminated: boolean;
	/** History of state names visited. */
	stateHistory: string[];
	/** History of matchState transitions. */
	matchStateHistory: MatchState[];
}

export function createSimulation(settings: ModeSelectionSettings, humanPlayerCount: number = 2): GameSimulation {
	const modeName = selectMode(settings);
	const states = getStatesForMode(modeName);

	return {
		modeName,
		states,
		currentStateIndex: -1,
		matchState: 'modeSelection',
		matchCount: 0,
		turn: 0,
		humanPlayerCount,
		equalizedRound: 1,
		equalizedRound1Winner: null,
		terminated: false,
		stateHistory: [],
		matchStateHistory: ['modeSelection'],
	};
}

/**
 * Advance to the next state in the simulation.
 * Returns the new current state, or null if states are exhausted (triggers restart).
 */
export function advanceState(sim: GameSimulation): SimulatedState | null {
	if (sim.terminated) {
		return null;
	}

	sim.currentStateIndex++;

	if (sim.currentStateIndex >= sim.states.length) {
		// All states exhausted → restart cycle
		return null;
	}

	const state = sim.states[sim.currentStateIndex];
	sim.stateHistory.push(state.name);

	// Apply matchState changes
	if (state.setsMatchState && state.setsMatchState !== sim.matchState) {
		sim.matchState = state.setsMatchState;
		sim.matchStateHistory.push(sim.matchState);
	}

	// First state (UpdatePlayerStatusState) triggers prepareMatchData
	if (state.name === 'UpdatePlayerStatusState') {
		sim.matchState = 'preMatch';
		sim.matchCount++;
		sim.matchStateHistory.push('preMatch');
	}

	return state;
}

/**
 * Advance through all auto-advancing states until reaching
 * a non-auto-advancing state (game loop or game over).
 * Returns the state that stopped advancement.
 */
export function advanceToNextInteractiveState(sim: GameSimulation): SimulatedState | null {
	let state: SimulatedState | null = null;

	while (true) {
		state = advanceState(sim);

		if (state === null) {
			return null; // States exhausted
		}

		if (!state.autoAdvance) {
			return state; // Reached an interactive state
		}
	}
}

/**
 * Simulate the game loop ending (match goes to postMatch).
 * This mirrors what happens when VictoryManager determines a winner.
 */
export function endGameLoop(sim: GameSimulation): void {
	sim.matchState = 'postMatch';
	if (sim.matchStateHistory[sim.matchStateHistory.length - 1] !== 'postMatch') {
		sim.matchStateHistory.push('postMatch');
	}
}

/**
 * Check if restart is allowed in the current state.
 * In FFA (Standard) mode, restart is blocked in GameOverState.
 * In Promode modes, restart advances to the next state.
 */
export function canRestart(sim: GameSimulation): boolean {
	const currentState = sim.states[sim.currentStateIndex];
	if (!currentState || !currentState.handlesRestart) {
		return false;
	}

	// FFA restriction: restart is blocked in GameOverState
	if (sim.modeName === 'StandardMode' && currentState.name === 'GameOverState') {
		return false;
	}

	// Equalized promode: restart blocked during round 2 transition
	if (sim.modeName === 'EqualizedPromodeMode' && currentState.name === 'EqualizedPromodeGameOverState' && sim.equalizedRound === 2) {
		return false;
	}

	return true;
}

/**
 * Simulate a player leaving. Returns true if the game should terminate
 * (W3C mode when < 2 humans remain).
 */
export function simulatePlayerLeft(sim: GameSimulation): boolean {
	sim.humanPlayerCount--;

	if (sim.modeName === 'W3CMode' && sim.humanPlayerCount < 2) {
		sim.terminated = true;
		return true;
	}

	return false;
}

/**
 * Simulate a player forfeiting. Returns true if the game should terminate
 * (W3C mode when < 2 humans remain).
 */
export function simulatePlayerForfeit(sim: GameSimulation): boolean {
	sim.humanPlayerCount--;

	if (sim.modeName === 'W3CMode' && sim.humanPlayerCount < 2) {
		sim.terminated = true;
		return true;
	}

	return false;
}

/**
 * Simulate a player dying. This typically triggers victory checks.
 * Returns true if match transitions to postMatch.
 */
export function simulatePlayerDead(sim: GameSimulation): boolean {
	sim.humanPlayerCount--;

	const currentState = sim.states[sim.currentStateIndex];
	if (currentState?.isGameLoop && sim.humanPlayerCount <= 1) {
		endGameLoop(sim);
		return true;
	}

	return false;
}

/**
 * Restart the game mode (re-creates state list from scratch).
 * Mirrors BaseMode behavior when states are exhausted.
 */
export function restartMode(sim: GameSimulation, humanPlayerCount?: number): void {
	sim.states = getStatesForMode(sim.modeName);
	sim.currentStateIndex = -1;
	sim.turn = 0;
	if (humanPlayerCount !== undefined) {
		sim.humanPlayerCount = humanPlayerCount;
	}
}

/**
 * For equalized promode: handle end of round 1.
 * Stores winner and prepares for round 2.
 */
export function handleEqualizedRound1End(sim: GameSimulation, winnerName: string): void {
	sim.equalizedRound1Winner = winnerName;
	sim.equalizedRound = 2;
}

/**
 * For equalized promode: handle end of round 2.
 * Resets round tracking for the next pair.
 */
export function handleEqualizedRound2End(sim: GameSimulation): { round1Winner: string | null; round2Winner: string | null } {
	const result = {
		round1Winner: sim.equalizedRound1Winner,
		round2Winner: 'current', // placeholder — in production, determined by GlobalGameData.leader
	};

	// Reset for next pair
	sim.equalizedRound = 1;
	sim.equalizedRound1Winner = null;

	return result;
}

/**
 * Determine game type from settings — mirrors ModeSelection.end().
 */
export function determineGameType(settings: ModeSelectionSettings): GameType {
	return settings.GameType === 1 ? 'Capitals' : 'Standard';
}

/**
 * Check if settings represent FFA mode.
 */
export function isFFA(settings: ModeSelectionSettings): boolean {
	return settings.Diplomacy.option === 0;
}

/**
 * Check if settings represent Promode.
 */
export function isPromode(settings: ModeSelectionSettings): boolean {
	return settings.Promode === 1;
}

/**
 * Check if settings represent Equalized Promode.
 */
export function isEqualizedPromode(settings: ModeSelectionSettings): boolean {
	return settings.Promode === 2;
}
