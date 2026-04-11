import { describe, it, expect } from 'vitest';
import {
	resolveGameMode,
	getStateSequence,
	validateStateSequence,
	transitionMatchState,
	simulateMatchLifecycle,
	canRestart,
	shouldW3CTerminate,
	checkBestOfNWinner,
	resolveRound,
	canEqualizedRestart,
	simulateStateMachine,
	simulateMultipleGameCycles,
	resolvePlayerEvent,
	PROMODE_SETTING,
	type GameModeName,
	type ModeSelectionSettings,
} from '../src/app/utils/game-mode-logic';

// ─── Mode Selection Routing ─────────────────────────────────────────

describe('resolveGameMode (mode selection routing)', () => {
	it('should select StandardMode when no special flags are set', () => {
		const settings: ModeSelectionSettings = { gameType: 'Standard', isW3CMode: false, promodeSetting: PROMODE_SETTING.OFF };
		expect(resolveGameMode(settings)).toBe('StandardMode');
	});

	it('should select PromodeMode when Promode=1', () => {
		const settings: ModeSelectionSettings = { gameType: 'Standard', isW3CMode: false, promodeSetting: PROMODE_SETTING.PROMODE };
		expect(resolveGameMode(settings)).toBe('PromodeMode');
	});

	it('should select PromodeMode when ChaosPromode=3', () => {
		const settings: ModeSelectionSettings = { gameType: 'Standard', isW3CMode: false, promodeSetting: PROMODE_SETTING.CHAOS };
		expect(resolveGameMode(settings)).toBe('PromodeMode');
	});

	it('should select EqualizedPromodeMode when Promode=2', () => {
		const settings: ModeSelectionSettings = { gameType: 'Standard', isW3CMode: false, promodeSetting: PROMODE_SETTING.EQUALIZED };
		expect(resolveGameMode(settings)).toBe('EqualizedPromodeMode');
	});

	it('should select CapitalsMode when GameType=Capitals', () => {
		const settings: ModeSelectionSettings = { gameType: 'Capitals', isW3CMode: false, promodeSetting: PROMODE_SETTING.OFF };
		expect(resolveGameMode(settings)).toBe('CapitalsMode');
	});

	it('should select CapitalsMode even when Promode is set (Capitals overrides)', () => {
		const settings: ModeSelectionSettings = { gameType: 'Capitals', isW3CMode: false, promodeSetting: PROMODE_SETTING.PROMODE };
		expect(resolveGameMode(settings)).toBe('CapitalsMode');
	});

	it('should select W3CMode when W3C_MODE_ENABLED', () => {
		const settings: ModeSelectionSettings = { gameType: 'Standard', isW3CMode: true, promodeSetting: PROMODE_SETTING.OFF };
		expect(resolveGameMode(settings)).toBe('W3CMode');
	});

	it('should select CapitalsMode over W3CMode (Capitals is checked first)', () => {
		const settings: ModeSelectionSettings = { gameType: 'Capitals', isW3CMode: true, promodeSetting: PROMODE_SETTING.OFF };
		expect(resolveGameMode(settings)).toBe('CapitalsMode');
	});

	it('should select W3CMode over promode settings', () => {
		const settings: ModeSelectionSettings = { gameType: 'Standard', isW3CMode: true, promodeSetting: PROMODE_SETTING.PROMODE };
		expect(resolveGameMode(settings)).toBe('W3CMode');
	});

	it('should select W3CMode over equalized promode', () => {
		const settings: ModeSelectionSettings = { gameType: 'Standard', isW3CMode: true, promodeSetting: PROMODE_SETTING.EQUALIZED };
		expect(resolveGameMode(settings)).toBe('W3CMode');
	});
});

// ─── State Sequences ────────────────────────────────────────────────

describe('getStateSequence (state sequences per mode)', () => {
	const allModes: GameModeName[] = ['StandardMode', 'PromodeMode', 'CapitalsMode', 'W3CMode', 'EqualizedPromodeMode'];

	it('StandardMode has exactly 10 states', () => {
		expect(getStateSequence('StandardMode')).toHaveLength(10);
	});

	it('PromodeMode has exactly 10 states', () => {
		expect(getStateSequence('PromodeMode')).toHaveLength(10);
	});

	it('CapitalsMode has exactly 13 states', () => {
		expect(getStateSequence('CapitalsMode')).toHaveLength(13);
	});

	it('W3CMode has exactly 11 states', () => {
		expect(getStateSequence('W3CMode')).toHaveLength(11);
	});

	it('EqualizedPromodeMode has exactly 10 states', () => {
		expect(getStateSequence('EqualizedPromodeMode')).toHaveLength(10);
	});

	it('StandardMode state order matches production', () => {
		expect(getStateSequence('StandardMode')).toEqual([
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
		]);
	});

	it('PromodeMode state order matches production', () => {
		expect(getStateSequence('PromodeMode')).toEqual([
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
		]);
	});

	it('CapitalsMode state order matches production', () => {
		expect(getStateSequence('CapitalsMode')).toEqual([
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
		]);
	});

	it('W3CMode state order matches production', () => {
		expect(getStateSequence('W3CMode')).toEqual([
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
		]);
	});

	it('EqualizedPromodeMode state order matches production', () => {
		expect(getStateSequence('EqualizedPromodeMode')).toEqual([
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
		]);
	});

	it.each(allModes)('%s starts with UpdatePlayerStatusState', (mode) => {
		expect(getStateSequence(mode)[0]).toBe('UpdatePlayerStatusState');
	});

	it.each(allModes)('%s ends with ResetState', (mode) => {
		const seq = getStateSequence(mode);
		expect(seq[seq.length - 1]).toBe('ResetState');
	});

	it.each(allModes)('%s has SetupState as second state', (mode) => {
		expect(getStateSequence(mode)[1]).toBe('SetupState');
	});

	it.each(allModes)('%s contains a GameLoop variant', (mode) => {
		const seq = getStateSequence(mode);
		const gameLoopVariants = ['GameLoopState', 'ProModeGameLoopState', 'CapitalsGameLoopState'];
		expect(seq.some((s) => gameLoopVariants.includes(s))).toBe(true);
	});

	it.each(allModes)('%s contains a GameOver variant', (mode) => {
		const seq = getStateSequence(mode);
		const gameOverVariants = ['GameOverState', 'W3CGameOverState', 'EqualizedPromodeGameOverState'];
		expect(seq.some((s) => gameOverVariants.includes(s))).toBe(true);
	});
});

// ─── State Sequence Validation ──────────────────────────────────────

describe('validateStateSequence', () => {
	const allModes: GameModeName[] = ['StandardMode', 'PromodeMode', 'CapitalsMode', 'W3CMode', 'EqualizedPromodeMode'];

	it.each(allModes)('%s passes all validation checks', (mode) => {
		const result = validateStateSequence(getStateSequence(mode));
		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it('should fail for empty sequence', () => {
		const result = validateStateSequence([]);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('State sequence is empty');
	});

	it('should fail if first state is not UpdatePlayerStatusState', () => {
		const result = validateStateSequence(['SetupState', 'GameLoopState', 'GameOverState', 'ResetState']);
		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain('First state should be UpdatePlayerStatusState');
	});

	it('should fail if second state is not SetupState', () => {
		const result = validateStateSequence(['UpdatePlayerStatusState', 'ApplyFogState', 'GameLoopState', 'GameOverState', 'ResetState']);
		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain('Second state should be SetupState');
	});

	it('should fail if no GameLoop variant', () => {
		const result = validateStateSequence(['UpdatePlayerStatusState', 'SetupState', 'GameOverState', 'ResetState']);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Sequence must contain a GameLoop variant');
	});

	it('should fail if no GameOver variant', () => {
		const result = validateStateSequence(['UpdatePlayerStatusState', 'SetupState', 'GameLoopState', 'ResetState']);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Sequence must contain a GameOver variant');
	});

	it('should fail if last state is not ResetState', () => {
		const result = validateStateSequence(['UpdatePlayerStatusState', 'SetupState', 'GameLoopState', 'GameOverState']);
		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain('Last state should be ResetState');
	});

	it('should report multiple errors', () => {
		const result = validateStateSequence(['SomethingElse']);
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThanOrEqual(3);
	});
});

// ─── Match Lifecycle Transitions ────────────────────────────────────

describe('transitionMatchState (match lifecycle)', () => {
	it('modeSelection → preMatch via setupComplete', () => {
		expect(transitionMatchState('modeSelection', 'setupComplete')).toBe('preMatch');
	});

	it('preMatch → inProgress via gameLoopEnter', () => {
		expect(transitionMatchState('preMatch', 'gameLoopEnter')).toBe('inProgress');
	});

	it('inProgress → postMatch via victoryOrElimination', () => {
		expect(transitionMatchState('inProgress', 'victoryOrElimination')).toBe('postMatch');
	});

	it('postMatch → preMatch via resetComplete', () => {
		expect(transitionMatchState('postMatch', 'resetComplete')).toBe('preMatch');
	});

	it('rejects modeSelection + gameLoopEnter (invalid)', () => {
		expect(transitionMatchState('modeSelection', 'gameLoopEnter')).toBeUndefined();
	});

	it('rejects modeSelection + victoryOrElimination (invalid)', () => {
		expect(transitionMatchState('modeSelection', 'victoryOrElimination')).toBeUndefined();
	});

	it('rejects preMatch + victoryOrElimination (invalid)', () => {
		expect(transitionMatchState('preMatch', 'victoryOrElimination')).toBeUndefined();
	});

	it('rejects inProgress + setupComplete (invalid)', () => {
		expect(transitionMatchState('inProgress', 'setupComplete')).toBeUndefined();
	});

	it('rejects postMatch + gameLoopEnter (invalid)', () => {
		expect(transitionMatchState('postMatch', 'gameLoopEnter')).toBeUndefined();
	});

	it('rejects inProgress + resetComplete (invalid)', () => {
		expect(transitionMatchState('inProgress', 'resetComplete')).toBeUndefined();
	});
});

describe('simulateMatchLifecycle', () => {
	it('single cycle visits all 4 states plus initial', () => {
		const visited = simulateMatchLifecycle(1);
		expect(visited).toEqual(['modeSelection', 'preMatch', 'inProgress', 'postMatch', 'preMatch']);
	});

	it('two cycles continue from preMatch back through', () => {
		const visited = simulateMatchLifecycle(2);
		// Cycle 1: modeSelection → preMatch → inProgress → postMatch → preMatch
		// Cycle 2: preMatch stays (setupComplete is no-op from preMatch), then gameLoopEnter → inProgress → postMatch → preMatch
		expect(visited[0]).toBe('modeSelection');
		expect(visited).toContain('inProgress');
		expect(visited).toContain('postMatch');
		expect(visited.length).toBeGreaterThan(5);
	});

	it('match count increments: postMatch → preMatch happens once per cycle', () => {
		const visited = simulateMatchLifecycle(3);
		const preMatchCount = visited.filter((s) => s === 'preMatch').length;
		// Each cycle produces at least one preMatch transition
		expect(preMatchCount).toBeGreaterThanOrEqual(3);
	});
});

// ─── Restart Logic ──────────────────────────────────────────────────

describe('canRestart', () => {
	it('blocks restart in FFA mode (postMatch)', () => {
		expect(canRestart('postMatch', true)).toBe('blocked');
	});

	it('blocks restart in FFA mode (inProgress)', () => {
		expect(canRestart('inProgress', true, 2)).toBe('blocked');
	});

	it('allows restart in non-FFA postMatch', () => {
		expect(canRestart('postMatch', false)).toBe('allowed');
	});

	it('triggers postMatch when single human in inProgress', () => {
		expect(canRestart('inProgress', false, 1)).toBe('triggerPostMatch');
	});

	it('blocks restart during inProgress with multiple humans', () => {
		expect(canRestart('inProgress', false, 3)).toBe('blocked');
	});

	it('blocks restart during preMatch', () => {
		expect(canRestart('preMatch', false)).toBe('blocked');
	});

	it('blocks restart during modeSelection', () => {
		expect(canRestart('modeSelection', false)).toBe('blocked');
	});
});

// ─── W3C Mode Logic ─────────────────────────────────────────────────

describe('W3C mode wrapping', () => {
	describe('shouldW3CTerminate', () => {
		it('should terminate with 0 human players when terminateIfAlone is true', () => {
			expect(shouldW3CTerminate(0, true)).toBe(true);
		});

		it('should terminate with 1 human player when terminateIfAlone is true', () => {
			expect(shouldW3CTerminate(1, true)).toBe(true);
		});

		it('should NOT terminate with 2 human players', () => {
			expect(shouldW3CTerminate(2, true)).toBe(false);
		});

		it('should NOT terminate with 5 human players', () => {
			expect(shouldW3CTerminate(5, true)).toBe(false);
		});

		it('should NOT terminate when terminateIfAlone is false even with 1 player', () => {
			expect(shouldW3CTerminate(1, false)).toBe(false);
		});

		it('should NOT terminate when terminateIfAlone is false even with 0 players', () => {
			expect(shouldW3CTerminate(0, false)).toBe(false);
		});
	});

	describe('checkBestOfNWinner (best-of-3)', () => {
		it('no winner when no wins', () => {
			const wins = new Map<string, number>([
				['player1', 0],
				['player2', 0],
			]);
			expect(checkBestOfNWinner(wins, 2)).toBeUndefined();
		});

		it('no winner when both have 1 win', () => {
			const wins = new Map<string, number>([
				['player1', 1],
				['player2', 1],
			]);
			expect(checkBestOfNWinner(wins, 2)).toBeUndefined();
		});

		it('player1 wins with 2 wins', () => {
			const wins = new Map<string, number>([
				['player1', 2],
				['player2', 0],
			]);
			expect(checkBestOfNWinner(wins, 2)).toBe('player1');
		});

		it('player2 wins with 2 wins', () => {
			const wins = new Map<string, number>([
				['player1', 1],
				['player2', 2],
			]);
			expect(checkBestOfNWinner(wins, 2)).toBe('player2');
		});

		it('first player with enough wins is returned', () => {
			const wins = new Map<string, number>([
				['player1', 2],
				['player2', 2],
			]);
			// Edge case: both at 2 wins (shouldn't happen in practice, but first found wins)
			expect(checkBestOfNWinner(wins, 2)).toBe('player1');
		});

		it('works for best-of-5 (need 3 wins)', () => {
			const wins = new Map<string, number>([
				['player1', 2],
				['player2', 3],
			]);
			expect(checkBestOfNWinner(wins, 3)).toBe('player2');
		});
	});
});

// ─── Equalized Promode Round System ─────────────────────────────────

describe('Equalized Promode round system', () => {
	describe('resolveRound', () => {
		it('Round 1 end → continues to Round 2', () => {
			const result = resolveRound(1, 'player1', undefined);
			expect(result.action).toBe('continue');
			expect(result.nextRound).toBe(2);
			expect(result.overallWinner).toBeUndefined();
		});

		it('Round 2 end → same player won both → win recorded', () => {
			const result = resolveRound(2, 'player1', 'player1');
			expect(result.action).toBe('winRecorded');
			expect(result.nextRound).toBe(1);
			expect(result.overallWinner).toBe('player1');
		});

		it('Round 2 end → different winners → no win recorded', () => {
			const result = resolveRound(2, 'player2', 'player1');
			expect(result.action).toBe('noWin');
			expect(result.nextRound).toBe(1);
			expect(result.overallWinner).toBeUndefined();
		});

		it('Round 2 end → undefined round1 winner → no win', () => {
			const result = resolveRound(2, 'player1', undefined);
			expect(result.action).toBe('noWin');
			expect(result.nextRound).toBe(1);
			expect(result.overallWinner).toBeUndefined();
		});

		it('Round 2 end → undefined round2 winner → no win', () => {
			const result = resolveRound(2, undefined, 'player1');
			expect(result.action).toBe('noWin');
			expect(result.nextRound).toBe(1);
			expect(result.overallWinner).toBeUndefined();
		});

		it('Round 2 end → both undefined → no win', () => {
			const result = resolveRound(2, undefined, undefined);
			expect(result.action).toBe('noWin');
			expect(result.nextRound).toBe(1);
			expect(result.overallWinner).toBeUndefined();
		});

		it('Round 1 always returns nextRound=2 regardless of winner', () => {
			expect(resolveRound(1, undefined, undefined).nextRound).toBe(2);
			expect(resolveRound(1, 'player1', undefined).nextRound).toBe(2);
		});

		it('Round 2 always resets to nextRound=1', () => {
			expect(resolveRound(2, 'player1', 'player1').nextRound).toBe(1);
			expect(resolveRound(2, 'player2', 'player1').nextRound).toBe(1);
		});
	});

	describe('canEqualizedRestart', () => {
		it('blocks restart when currentRound is 2 (between rounds)', () => {
			expect(canEqualizedRestart(2)).toBe(false);
		});

		it('allows restart when currentRound is 1 (after round 2 completes)', () => {
			expect(canEqualizedRestart(1)).toBe(true);
		});
	});
});

// ─── State Machine Simulation ───────────────────────────────────────

describe('simulateStateMachine', () => {
	it('processes all states in StandardMode sequence', () => {
		const seq = getStateSequence('StandardMode');
		const result = simulateStateMachine(seq);
		expect(result.statesEntered).toEqual(seq);
		expect(result.totalTransitions).toBe(10);
		expect(result.restartTriggered).toBe(true);
	});

	it('processes all states in CapitalsMode sequence (13 states)', () => {
		const seq = getStateSequence('CapitalsMode');
		const result = simulateStateMachine(seq);
		expect(result.statesEntered).toEqual(seq);
		expect(result.totalTransitions).toBe(13);
	});

	it('processes all states in W3CMode sequence', () => {
		const seq = getStateSequence('W3CMode');
		const result = simulateStateMachine(seq);
		expect(result.totalTransitions).toBe(11);
	});

	it('always triggers restart after processing all states', () => {
		const allModes: GameModeName[] = ['StandardMode', 'PromodeMode', 'CapitalsMode', 'W3CMode', 'EqualizedPromodeMode'];
		for (const mode of allModes) {
			const result = simulateStateMachine(getStateSequence(mode));
			expect(result.restartTriggered).toBe(true);
		}
	});
});

describe('simulateMultipleGameCycles (restart cycles)', () => {
	it('single cycle of StandardMode = 10 states + 1 restart', () => {
		const result = simulateMultipleGameCycles(getStateSequence('StandardMode'), 1);
		expect(result.totalStatesEntered).toBe(10);
		expect(result.totalRestarts).toBe(1);
		expect(result.cycleLength).toBe(10);
	});

	it('3 consecutive games of PromodeMode = 30 states + 3 restarts', () => {
		const result = simulateMultipleGameCycles(getStateSequence('PromodeMode'), 3);
		expect(result.totalStatesEntered).toBe(30);
		expect(result.totalRestarts).toBe(3);
	});

	it('5 consecutive games of CapitalsMode = 65 states + 5 restarts', () => {
		const result = simulateMultipleGameCycles(getStateSequence('CapitalsMode'), 5);
		expect(result.totalStatesEntered).toBe(65);
		expect(result.totalRestarts).toBe(5);
	});

	it('10 consecutive games still work (no state accumulation)', () => {
		const result = simulateMultipleGameCycles(getStateSequence('W3CMode'), 10);
		expect(result.totalStatesEntered).toBe(110);
		expect(result.totalRestarts).toBe(10);
	});
});

// ─── Player Event Routing ───────────────────────────────────────────

describe('resolvePlayerEvent', () => {
	describe('player death during inProgress', () => {
		it('triggers victory check', () => {
			const result = resolvePlayerEvent('dead', 'inProgress', false, 3, 2);
			expect(result.shouldCheckVictory).toBe(true);
			expect(result.shouldTransitionToPostMatch).toBe(false);
		});

		it('transitions to postMatch when last active player', () => {
			const result = resolvePlayerEvent('dead', 'inProgress', false, 1, 1);
			expect(result.shouldCheckVictory).toBe(true);
			expect(result.shouldTransitionToPostMatch).toBe(true);
		});

		it('does not check victory during preMatch', () => {
			const result = resolvePlayerEvent('dead', 'preMatch', false, 3, 2);
			expect(result.shouldCheckVictory).toBe(false);
		});
	});

	describe('player left during inProgress', () => {
		it('triggers victory check', () => {
			const result = resolvePlayerEvent('left', 'inProgress', false, 3, 2);
			expect(result.shouldCheckVictory).toBe(true);
		});

		it('transitions to postMatch when last active', () => {
			const result = resolvePlayerEvent('left', 'inProgress', false, 1, 1);
			expect(result.shouldTransitionToPostMatch).toBe(true);
		});
	});

	describe('player forfeit', () => {
		it('delegates to dead event', () => {
			const result = resolvePlayerEvent('forfeit', 'inProgress', false, 3, 2);
			expect(result.delegatesTo).toBe('dead');
		});

		it('checks victory conditions', () => {
			const result = resolvePlayerEvent('forfeit', 'inProgress', false, 3, 2);
			expect(result.shouldCheckVictory).toBe(true);
		});

		it('transitions to postMatch when only 1 active player left', () => {
			const result = resolvePlayerEvent('forfeit', 'inProgress', false, 1, 1);
			expect(result.shouldTransitionToPostMatch).toBe(true);
		});
	});

	describe('player restart', () => {
		it('blocks in FFA postMatch', () => {
			const result = resolvePlayerEvent('restart', 'postMatch', true, 2, 2);
			expect(result.shouldBlock).toBe(true);
		});

		it('allows in non-FFA postMatch', () => {
			const result = resolvePlayerEvent('restart', 'postMatch', false, 2, 2);
			expect(result.shouldBlock).toBe(false);
		});

		it('triggers postMatch when single human in inProgress', () => {
			const result = resolvePlayerEvent('restart', 'inProgress', false, 2, 1);
			expect(result.shouldTransitionToPostMatch).toBe(true);
		});

		it('blocks during inProgress with multiple humans', () => {
			const result = resolvePlayerEvent('restart', 'inProgress', false, 4, 3);
			expect(result.shouldBlock).toBe(true);
		});

		it('blocks during preMatch', () => {
			const result = resolvePlayerEvent('restart', 'preMatch', false, 4, 3);
			expect(result.shouldBlock).toBe(true);
		});
	});

	describe('neutral events (alive, nomad, stfu)', () => {
		it('alive has no side effects', () => {
			const result = resolvePlayerEvent('alive', 'inProgress', false, 4, 3);
			expect(result.shouldCheckVictory).toBe(false);
			expect(result.shouldTransitionToPostMatch).toBe(false);
			expect(result.shouldBlock).toBe(false);
		});

		it('nomad has no side effects', () => {
			const result = resolvePlayerEvent('nomad', 'inProgress', false, 4, 3);
			expect(result.shouldCheckVictory).toBe(false);
		});

		it('stfu has no side effects', () => {
			const result = resolvePlayerEvent('stfu', 'inProgress', false, 4, 3);
			expect(result.shouldCheckVictory).toBe(false);
		});
	});
});

// ─── Full Game Scenarios ────────────────────────────────────────────

describe('Full game scenarios', () => {
	it('Standard game: select → play → victory → restart → play again', () => {
		// Mode selection
		const mode = resolveGameMode({ gameType: 'Standard', isW3CMode: false, promodeSetting: PROMODE_SETTING.OFF });
		expect(mode).toBe('StandardMode');

		// Get and validate state sequence
		const seq = getStateSequence(mode);
		const validation = validateStateSequence(seq);
		expect(validation.valid).toBe(true);

		// Simulate match lifecycle
		const lifecycle = simulateMatchLifecycle(2);
		expect(lifecycle[0]).toBe('modeSelection');
		expect(lifecycle).toContain('inProgress');
		expect(lifecycle).toContain('postMatch');

		// State machine completes and restarts
		const sm = simulateMultipleGameCycles(seq, 2);
		expect(sm.totalRestarts).toBe(2);
	});

	it('Promode game: 3 consecutive matches with restarts', () => {
		const mode = resolveGameMode({ gameType: 'Standard', isW3CMode: false, promodeSetting: PROMODE_SETTING.PROMODE });
		expect(mode).toBe('PromodeMode');

		const seq = getStateSequence(mode);
		expect(validateStateSequence(seq).valid).toBe(true);

		const sm = simulateMultipleGameCycles(seq, 3);
		expect(sm.totalRestarts).toBe(3);
		expect(sm.totalStatesEntered).toBe(30);
	});

	it('Capitals game: full state sequence with capital-specific states', () => {
		const mode = resolveGameMode({ gameType: 'Capitals', isW3CMode: false, promodeSetting: PROMODE_SETTING.OFF });
		expect(mode).toBe('CapitalsMode');

		const seq = getStateSequence(mode);
		expect(seq).toContain('CapitalsSelectionState');
		expect(seq).toContain('CapitalsDistributeCapitalsState');
		expect(seq).toContain('CapitalsGameLoopState');
		expect(validateStateSequence(seq).valid).toBe(true);
	});

	it('W3C game: best-of-3 with early termination check', () => {
		const mode = resolveGameMode({ gameType: 'Standard', isW3CMode: true, promodeSetting: PROMODE_SETTING.OFF });
		expect(mode).toBe('W3CMode');

		const seq = getStateSequence(mode);
		expect(seq).toContain('W3CTipsState');
		expect(seq).toContain('W3CGameOverState');

		// Simulate best-of-3
		const wins = new Map<string, number>([
			['player1', 0],
			['player2', 0],
		]);

		// Round 1: player1 wins
		wins.set('player1', 1);
		expect(checkBestOfNWinner(wins, 2)).toBeUndefined(); // no winner yet

		// Round 2: player1 wins again
		wins.set('player1', 2);
		expect(checkBestOfNWinner(wins, 2)).toBe('player1');
	});

	it('Equalized Promode: 2-round system with position swap', () => {
		const mode = resolveGameMode({ gameType: 'Standard', isW3CMode: false, promodeSetting: PROMODE_SETTING.EQUALIZED });
		expect(mode).toBe('EqualizedPromodeMode');

		const seq = getStateSequence(mode);
		expect(seq).toContain('EqualizedCityDistributeState');
		expect(seq).toContain('EqualizedPromodeGameOverState');

		// Round 1: player1 wins
		const r1 = resolveRound(1, 'player1', undefined);
		expect(r1.action).toBe('continue');
		expect(r1.nextRound).toBe(2);

		// Between rounds: restart blocked
		expect(canEqualizedRestart(2)).toBe(false);

		// Round 2: player1 wins again → win recorded
		const r2 = resolveRound(2, 'player1', 'player1');
		expect(r2.action).toBe('winRecorded');
		expect(r2.overallWinner).toBe('player1');

		// After round 2: restart allowed
		expect(canEqualizedRestart(1)).toBe(true);
	});

	it('Equalized Promode: split rounds → no win', () => {
		// Round 1: player1 wins
		const r1 = resolveRound(1, 'player1', undefined);
		expect(r1.action).toBe('continue');

		// Round 2: player2 wins → no overall winner
		const r2 = resolveRound(2, 'player2', 'player1');
		expect(r2.action).toBe('noWin');
		expect(r2.overallWinner).toBeUndefined();
	});

	it('W3C mode: lone human auto-victory at any state', () => {
		// Simulate checking at each state entry
		expect(shouldW3CTerminate(1, true)).toBe(true);
		expect(shouldW3CTerminate(2, true)).toBe(false);
		expect(shouldW3CTerminate(0, true)).toBe(true);
	});

	it('FFA game cannot restart after game over', () => {
		const result = canRestart('postMatch', true);
		expect(result).toBe('blocked');
	});

	it('Team promode game can restart after game over', () => {
		const result = canRestart('postMatch', false);
		expect(result).toBe('allowed');
	});
});
