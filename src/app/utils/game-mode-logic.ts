/**
 * Pure game mode and state transition logic — no WC3 API dependencies.
 * Mirrors the decision-making in EventCoordinator.applyGameMode(),
 * BaseMode.nextState(), and the match lifecycle state machine.
 *
 * These functions can be unit tested without the game engine.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type GameType = 'Standard' | 'Capitals';
export type MatchState = 'modeSelection' | 'preMatch' | 'inProgress' | 'postMatch';
export const PROMODE_SETTING = {
	OFF: 0,
	PROMODE: 1,
	EQUALIZED: 2,
	CHAOS: 3,
} as const;

export type PromodeSetting = (typeof PROMODE_SETTING)[keyof typeof PROMODE_SETTING];

export type GameModeName = 'StandardMode' | 'PromodeMode' | 'EqualizedPromodeMode' | 'W3CMode' | 'CapitalsMode';

export interface ModeSelectionSettings {
	gameType: GameType;
	isW3CMode: boolean;
	promodeSetting: PromodeSetting;
}

export interface RoundResult {
	action: 'continue' | 'winRecorded' | 'noWin';
	nextRound: number;
	overallWinner: string | null;
}

// ─── Mode Selection ─────────────────────────────────────────────────

/**
 * Determine which game mode to use based on settings.
 * Mirrors EventCoordinator.applyGameMode() priority logic:
 *   1. Capitals (GameType == 'Capitals') — highest priority
 *   2. W3C (W3C_MODE_ENABLED)
 *   3. EqualizedPromode (Promode == 2)
 *   4. Promode/ChaosPromode (Promode == 1 or 3)
 *   5. Standard (default)
 */
export function resolveGameMode(settings: ModeSelectionSettings): GameModeName {
	if (settings.gameType === 'Capitals') {
		return 'CapitalsMode';
	}

	if (settings.isW3CMode) {
		return 'W3CMode';
	}

	if (settings.promodeSetting === PROMODE_SETTING.EQUALIZED) {
		return 'EqualizedPromodeMode';
	}

	if (settings.promodeSetting === PROMODE_SETTING.PROMODE || settings.promodeSetting === PROMODE_SETTING.CHAOS) {
		return 'PromodeMode';
	}

	return 'StandardMode';
}

// ─── State Sequences ────────────────────────────────────────────────

/**
 * Returns the expected state class name sequence for a given mode.
 * Mirrors the setupStates() method of each mode class.
 */
export function getStateSequence(modeName: GameModeName): string[] {
	switch (modeName) {
		case 'StandardMode':
			return [
				'UpdatePlayerStatusState',
				'SetupState',
				'ApplyFogState',
				'CityDistributeState',
				'VisionState',
				'CountdownState',
				'EnableControlsState',
				'GameLoopState',
				'GameOverState',
				'ResetState',
			];

		case 'PromodeMode':
			return [
				'UpdatePlayerStatusState',
				'SetupState',
				'CityDistributeState',
				'ApplyFogState',
				'SetPromodeTempVisionState',
				'PromodeCountdownState',
				'EnableControlsState',
				'ProModeGameLoopState',
				'GameOverState',
				'ResetState',
			];

		case 'CapitalsMode':
			return [
				'UpdatePlayerStatusState',
				'SetupState',
				'ApplyFogState',
				'CapitalsSelectionState',
				'CapitalsDistributeCapitalsState',
				'CapitalsDistributeState',
				'VisionState',
				'CapitalAssignCountrytNameState',
				'CountdownState',
				'EnableControlsState',
				'CapitalsGameLoopState',
				'GameOverState',
				'ResetState',
			];

		case 'W3CMode':
			return [
				'UpdatePlayerStatusState',
				'SetupState',
				'CityDistributeState',
				'ApplyFogState',
				'SetPromodeTempVisionState',
				'W3CTipsState',
				'PromodeCountdownState',
				'EnableControlsState',
				'ProModeGameLoopState',
				'W3CGameOverState',
				'ResetState',
			];

		case 'EqualizedPromodeMode':
			return [
				'UpdatePlayerStatusState',
				'SetupState',
				'EqualizedCityDistributeState',
				'ApplyFogState',
				'SetPromodeTempVisionState',
				'PromodeCountdownState',
				'EnableControlsState',
				'ProModeGameLoopState',
				'EqualizedPromodeGameOverState',
				'ResetState',
			];
	}
}

// ─── State Sequence Validation ──────────────────────────────────────

export interface SequenceValidation {
	valid: boolean;
	errors: string[];
}

/**
 * Validate invariants that should hold for all mode state sequences:
 * 1. Non-empty
 * 2. Starts with UpdatePlayerStatusState
 * 3. Contains SetupState (always 2nd)
 * 4. Contains at least one GameLoop variant
 * 5. Contains at least one GameOver variant
 * 6. Ends with ResetState
 */
export function validateStateSequence(sequence: string[]): SequenceValidation {
	const errors: string[] = [];

	if (sequence.length === 0) {
		errors.push('State sequence is empty');
		return { valid: false, errors };
	}

	if (sequence[0] !== 'UpdatePlayerStatusState') {
		errors.push(`First state should be UpdatePlayerStatusState, got ${sequence[0]}`);
	}

	if (sequence[1] !== 'SetupState') {
		errors.push(`Second state should be SetupState, got ${sequence[1]}`);
	}

	const gameLoopVariants = ['GameLoopState', 'ProModeGameLoopState', 'CapitalsGameLoopState'];
	if (!sequence.some((s) => gameLoopVariants.includes(s))) {
		errors.push('Sequence must contain a GameLoop variant');
	}

	const gameOverVariants = ['GameOverState', 'W3CGameOverState', 'EqualizedPromodeGameOverState'];
	if (!sequence.some((s) => gameOverVariants.includes(s))) {
		errors.push('Sequence must contain a GameOver variant');
	}

	if (sequence[sequence.length - 1] !== 'ResetState') {
		errors.push(`Last state should be ResetState, got ${sequence[sequence.length - 1]}`);
	}

	return { valid: errors.length === 0, errors };
}

// ─── Match Lifecycle ────────────────────────────────────────────────

export type MatchEvent = 'setupComplete' | 'gameLoopEnter' | 'victoryOrElimination' | 'resetComplete';

/**
 * Pure match state transition function.
 * Returns the next state given the current state and event, or null for invalid transitions.
 */
export function transitionMatchState(current: MatchState, event: MatchEvent): MatchState | null {
	switch (current) {
		case 'modeSelection':
			if (event === 'setupComplete') return 'preMatch';
			return null;

		case 'preMatch':
			if (event === 'gameLoopEnter') return 'inProgress';
			return null;

		case 'inProgress':
			if (event === 'victoryOrElimination') return 'postMatch';
			return null;

		case 'postMatch':
			if (event === 'resetComplete') return 'preMatch';
			return null;
	}
}

/**
 * Simulate a full match lifecycle, returning all states visited.
 */
export function simulateMatchLifecycle(cycles: number): MatchState[] {
	const events: MatchEvent[] = ['setupComplete', 'gameLoopEnter', 'victoryOrElimination', 'resetComplete'];
	const visited: MatchState[] = ['modeSelection'];
	let current: MatchState = 'modeSelection';

	for (let cycle = 0; cycle < cycles; cycle++) {
		for (const event of events) {
			const next = transitionMatchState(current, event);
			if (next !== null) {
				current = next;
				visited.push(current);
			}
		}
	}

	return visited;
}

// ─── Restart Logic ──────────────────────────────────────────────────

/**
 * Whether a restart is allowed given the current match state and game settings.
 * Mirrors GameOverState.onPlayerRestart():
 *   - FFA: restart blocked (always)
 *   - Non-FFA + postMatch: allowed
 *   - Non-FFA + inProgress + single human: triggers postMatch
 *   - Otherwise: blocked
 */
export function canRestart(matchState: MatchState, isFFA: boolean, humanPlayerCount?: number): 'allowed' | 'blocked' | 'triggerPostMatch' {
	if (isFFA) {
		return 'blocked';
	}

	if (matchState === 'postMatch') {
		return 'allowed';
	}

	if (matchState === 'inProgress' && humanPlayerCount === 1) {
		return 'triggerPostMatch';
	}

	return 'blocked';
}

// ─── W3C Mode Logic ─────────────────────────────────────────────────

/**
 * Determine if W3C mode should terminate due to lone human player.
 */
export function shouldW3CTerminate(humanPlayerCount: number, terminateIfAlone: boolean): boolean {
	return terminateIfAlone && humanPlayerCount < 2;
}

/**
 * Determine if a player has won a best-of-N series.
 * Returns the winner player ID if someone has enough wins, or null.
 */
export function checkBestOfNWinner(
	wins: Map<string, number>,
	winsNeeded: number,
): string | null {
	for (const [playerId, winCount] of wins) {
		if (winCount >= winsNeeded) {
			return playerId;
		}
	}
	return null;
}

// ─── Equalized Promode Round Logic ──────────────────────────────────

/**
 * Resolve what happens at the end of a round in Equalized Promode.
 *
 * Round 1: Store winner, advance to round 2, auto-restart
 * Round 2: Determine overall winner:
 *   - Same player won both → win recorded
 *   - Different players → no win recorded
 *   Reset round data for next pair.
 */
export function resolveRound(
	currentRound: number,
	roundWinner: string | null,
	round1Winner: string | null,
): RoundResult {
	if (currentRound === 1) {
		return {
			action: 'continue',
			nextRound: 2,
			overallWinner: null,
		};
	}

	// Round 2
	const sameWinner = round1Winner !== null && roundWinner !== null && round1Winner === roundWinner;

	return {
		action: sameWinner ? 'winRecorded' : 'noWin',
		nextRound: 1,
		overallWinner: sameWinner ? round1Winner : null,
	};
}

/**
 * Whether manual restart is allowed in Equalized Promode.
 * Blocked between Round 1 and Round 2 (auto-restart).
 * Allowed after Round 2 completes.
 */
export function canEqualizedRestart(currentRound: number): boolean {
	// Round number is set to 2 after round 1 ends (before round 2 starts)
	// When round number is 2, we're in the transition — block restart
	// When round number is 1 (after round 2 resets), allow restart
	return currentRound !== 2;
}

// ─── State Machine Simulation ───────────────────────────────────────

export interface StateMachineState {
	name: string;
	entered: boolean;
	exited: boolean;
}

/**
 * Simulate the BaseMode state machine cycling through a state sequence.
 * Returns the sequence of states entered, plus whether restart was triggered.
 */
export function simulateStateMachine(stateNames: string[]): {
	statesEntered: string[];
	restartTriggered: boolean;
	totalTransitions: number;
} {
	const statesEntered: string[] = [];
	const queue = [...stateNames];
	let totalTransitions = 0;

	while (queue.length > 0) {
		const state = queue.shift()!;
		statesEntered.push(state);
		totalTransitions++;
	}

	// One more nextState call would trigger restart
	return {
		statesEntered,
		restartTriggered: true, // always restarts when queue empties
		totalTransitions,
	};
}

/**
 * Simulate multiple game cycles (play → restart → play → restart → ...).
 * Each cycle runs through the full state sequence, then restarts.
 */
export function simulateMultipleGameCycles(stateNames: string[], cycles: number): {
	totalStatesEntered: number;
	totalRestarts: number;
	cycleLength: number;
} {
	const cycleLength = stateNames.length;
	return {
		totalStatesEntered: cycleLength * cycles,
		totalRestarts: cycles,
		cycleLength,
	};
}

// ─── Player Event Routing ───────────────────────────────────────────

export type PlayerEvent = 'alive' | 'dead' | 'left' | 'nomad' | 'stfu' | 'forfeit' | 'restart';

/**
 * Determine the expected side effects of a player event.
 */
export function resolvePlayerEvent(
	event: PlayerEvent,
	matchState: MatchState,
	isFFA: boolean,
	activePlayerCount: number,
	humanPlayerCount: number,
): {
	shouldCheckVictory: boolean;
	shouldTransitionToPostMatch: boolean;
	shouldBlock: boolean;
	delegatesTo?: PlayerEvent;
} {
	switch (event) {
		case 'forfeit':
			return {
				shouldCheckVictory: true,
				shouldTransitionToPostMatch: activePlayerCount <= 1,
				shouldBlock: false,
				delegatesTo: 'dead',
			};

		case 'dead':
			return {
				shouldCheckVictory: matchState === 'inProgress',
				shouldTransitionToPostMatch: matchState === 'inProgress' && activePlayerCount <= 1,
				shouldBlock: false,
			};

		case 'left':
			return {
				shouldCheckVictory: matchState === 'inProgress',
				shouldTransitionToPostMatch: matchState === 'inProgress' && activePlayerCount <= 1,
				shouldBlock: false,
			};

		case 'restart':
			if (isFFA && matchState === 'postMatch') {
				return { shouldCheckVictory: false, shouldTransitionToPostMatch: false, shouldBlock: true };
			}
			if (matchState === 'postMatch') {
				return { shouldCheckVictory: false, shouldTransitionToPostMatch: false, shouldBlock: false };
			}
			if (matchState === 'inProgress' && humanPlayerCount === 1) {
				return { shouldCheckVictory: false, shouldTransitionToPostMatch: true, shouldBlock: false };
			}
			return { shouldCheckVictory: false, shouldTransitionToPostMatch: false, shouldBlock: true };

		default:
			return { shouldCheckVictory: false, shouldTransitionToPostMatch: false, shouldBlock: false };
	}
}
