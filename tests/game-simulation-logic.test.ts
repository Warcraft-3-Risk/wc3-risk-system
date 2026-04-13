import { describe, it, expect, beforeEach } from 'vitest';
import {
	selectMode,
	getStatesForMode,
	getStandardModeStates,
	getPromodeModeStates,
	getEqualizedPromodeModeStates,
	getW3CModeStates,
	getCapitalsModeStates,
	getFFASettings,
	getPromode1v1Settings,
	getW3CSettings,
	getEqualizedPromodeSettings,
	getCapitalsSettings,
	createSimulation,
	advanceState,
	advanceToNextInteractiveState,
	endGameLoop,
	canRestart,
	simulatePlayerLeft,
	simulatePlayerForfeit,
	simulatePlayerDead,
	restartMode,
	handleEqualizedRound1End,
	handleEqualizedRound2End,
	determineGameType,
	isFFA,
	isPromode,
	isEqualizedPromode,
	type GameSimulation,
	type ModeSelectionSettings,
	type ModeName,
	type SimulatedState,
} from '../src/app/utils/game-simulation-logic';

// ==========================================================================
// Mode Selection Routing
// ==========================================================================

describe('Mode Selection Routing', () => {
	it('selects StandardMode for default FFA settings', () => {
		expect(selectMode(getFFASettings())).toBe('StandardMode');
	});

	it('selects PromodeMode for Promode=1', () => {
		expect(selectMode(getPromode1v1Settings())).toBe('PromodeMode');
	});

	it('selects W3CMode when w3cModeEnabled is true', () => {
		expect(selectMode(getW3CSettings())).toBe('W3CMode');
	});

	it('selects EqualizedPromodeMode for Promode=2', () => {
		expect(selectMode(getEqualizedPromodeSettings())).toBe('EqualizedPromodeMode');
	});

	it('selects CapitalsMode for GameType=1', () => {
		expect(selectMode(getCapitalsSettings())).toBe('CapitalsMode');
	});

	it('W3C overrides Promode when both are set', () => {
		const settings = { ...getPromode1v1Settings(), w3cModeEnabled: true };
		expect(selectMode(settings)).toBe('W3CMode');
	});

	it('Capitals overrides W3C mode', () => {
		const settings = { ...getW3CSettings(), GameType: 1 as number };
		expect(selectMode(settings)).toBe('CapitalsMode');
	});

	it('Capitals overrides Promode', () => {
		const settings = { ...getPromode1v1Settings(), GameType: 1 as number };
		expect(selectMode(settings)).toBe('CapitalsMode');
	});

	it('EqualizedPromode takes priority over Promode=1 when Promode=2', () => {
		const settings = getEqualizedPromodeSettings();
		expect(settings.Promode).toBe(2);
		expect(selectMode(settings)).toBe('EqualizedPromodeMode');
	});
});

// ==========================================================================
// State Sequences — verify they match production code
// ==========================================================================

describe('State Sequences', () => {
	it('StandardMode has 10 states in correct order', () => {
		const states = getStandardModeStates();
		expect(states).toHaveLength(10);
		const names = states.map((s) => s.name);
		expect(names).toEqual([
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

	it('PromodeMode has 10 states in correct order', () => {
		const states = getPromodeModeStates();
		expect(states).toHaveLength(10);
		const names = states.map((s) => s.name);
		expect(names).toEqual([
			'UpdatePlayerStatusState',
			'SetupState',
			'ApplyFogState',
			'CityDistributeState',
			'SetPromodeTempVisionState',
			'PromodeCountdownState',
			'EnableControlsState',
			'ProModeGameLoopState',
			'GameOverState',
			'ResetState',
		]);
	});

	it('EqualizedPromodeMode has 10 states in correct order', () => {
		const states = getEqualizedPromodeModeStates();
		expect(states).toHaveLength(10);
		const names = states.map((s) => s.name);
		expect(names).toEqual([
			'UpdatePlayerStatusState',
			'SetupState',
			'ApplyFogState',
			'EqualizedCityDistributeState',
			'SetPromodeTempVisionState',
			'PromodeCountdownState',
			'EnableControlsState',
			'ProModeGameLoopState',
			'EqualizedPromodeGameOverState',
			'ResetState',
		]);
	});

	it('W3CMode has 11 states in correct order', () => {
		const states = getW3CModeStates();
		expect(states).toHaveLength(11);
		const names = states.map((s) => s.name);
		expect(names).toEqual([
			'UpdatePlayerStatusState',
			'SetupState',
			'ApplyFogState',
			'CityDistributeState',
			'SetPromodeTempVisionState',
			'W3CTipsState',
			'PromodeCountdownState',
			'EnableControlsState',
			'ProModeGameLoopState',
			'W3CGameOverState',
			'ResetState',
		]);
	});

	it('CapitalsMode has 13 states in correct order', () => {
		const states = getCapitalsModeStates();
		expect(states).toHaveLength(13);
		const names = states.map((s) => s.name);
		expect(names).toEqual([
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

	it('getStatesForMode returns correct states for each mode', () => {
		const modes: ModeName[] = ['StandardMode', 'PromodeMode', 'EqualizedPromodeMode', 'W3CMode', 'CapitalsMode'];
		const expectedLengths: Record<ModeName, number> = {
			StandardMode: 10,
			PromodeMode: 10,
			EqualizedPromodeMode: 10,
			W3CMode: 11,
			CapitalsMode: 13,
		};

		for (const mode of modes) {
			expect(getStatesForMode(mode)).toHaveLength(expectedLengths[mode]);
		}
	});
});

// ==========================================================================
// State Properties
// ==========================================================================

describe('State Properties', () => {
	it('GameLoopState is a game loop state', () => {
		const states = getStandardModeStates();
		const gameLoop = states.find((s) => s.name === 'GameLoopState')!;
		expect(gameLoop.isGameLoop).toBe(true);
		expect(gameLoop.autoAdvance).toBe(false);
		expect(gameLoop.setsMatchState).toBe('inProgress');
	});

	it('ProModeGameLoopState is a game loop state', () => {
		const states = getPromodeModeStates();
		const gameLoop = states.find((s) => s.name === 'ProModeGameLoopState')!;
		expect(gameLoop.isGameLoop).toBe(true);
		expect(gameLoop.autoAdvance).toBe(false);
		expect(gameLoop.setsMatchState).toBe('inProgress');
	});

	it('GameOverState sets matchState to postMatch', () => {
		const states = getStandardModeStates();
		const gameOver = states.find((s) => s.name === 'GameOverState')!;
		expect(gameOver.setsMatchState).toBe('postMatch');
		expect(gameOver.handlesRestart).toBe(true);
	});

	it('CountdownState handles player forfeit', () => {
		const states = getStandardModeStates();
		const countdown = states.find((s) => s.name === 'CountdownState')!;
		expect(countdown.handlesPlayerForfeit).toBe(true);
	});

	it('PromodeCountdownState handles player forfeit', () => {
		const states = getPromodeModeStates();
		const countdown = states.find((s) => s.name === 'PromodeCountdownState')!;
		expect(countdown.handlesPlayerForfeit).toBe(true);
	});

	it('game loop states handle all player events', () => {
		for (const mode of ['StandardMode', 'PromodeMode', 'W3CMode', 'CapitalsMode'] as ModeName[]) {
			const states = getStatesForMode(mode);
			const loopState = states.find((s) => s.isGameLoop)!;
			expect(loopState.handlesPlayerDead).toBe(true);
			expect(loopState.handlesPlayerLeft).toBe(true);
			expect(loopState.handlesPlayerForfeit).toBe(true);
			expect(loopState.handlesRestart).toBe(true);
		}
	});

	it('most setup states auto-advance', () => {
		const states = getStandardModeStates();
		const autoAdvancing = states.filter((s) => s.autoAdvance);
		expect(autoAdvancing.map((s) => s.name)).toContain('UpdatePlayerStatusState');
		expect(autoAdvancing.map((s) => s.name)).toContain('SetupState');
		expect(autoAdvancing.map((s) => s.name)).toContain('ApplyFogState');
		expect(autoAdvancing.map((s) => s.name)).toContain('CityDistributeState');
		expect(autoAdvancing.map((s) => s.name)).toContain('EnableControlsState');
		expect(autoAdvancing.map((s) => s.name)).toContain('ResetState');
	});
});

// ==========================================================================
// Settings Presets
// ==========================================================================

describe('Settings Presets', () => {
	it('FFA settings have Diplomacy.option=0 and Promode=0', () => {
		const s = getFFASettings();
		expect(s.Diplomacy.option).toBe(0);
		expect(s.Promode).toBe(0);
		expect(s.GameType).toBe(0);
		expect(s.w3cModeEnabled).toBe(false);
	});

	it('Promode 1v1 settings have Promode=1', () => {
		const s = getPromode1v1Settings();
		expect(s.Promode).toBe(1);
		expect(s.GameType).toBe(0);
	});

	it('W3C settings have Promode=1 and w3cModeEnabled=true', () => {
		const s = getW3CSettings();
		expect(s.Promode).toBe(1);
		expect(s.w3cModeEnabled).toBe(true);
		expect(s.Diplomacy.option).toBe(2);
		expect(s.Overtime.option).toBe(3);
	});

	it('Equalized Promode settings have Promode=2', () => {
		const s = getEqualizedPromodeSettings();
		expect(s.Promode).toBe(2);
	});

	it('Capitals settings have GameType=1', () => {
		const s = getCapitalsSettings();
		expect(s.GameType).toBe(1);
	});
});

// ==========================================================================
// Helper Functions
// ==========================================================================

describe('Helper Functions', () => {
	it('determineGameType returns Standard for GameType=0', () => {
		expect(determineGameType(getFFASettings())).toBe('Standard');
	});

	it('determineGameType returns Capitals for GameType=1', () => {
		expect(determineGameType(getCapitalsSettings())).toBe('Capitals');
	});

	it('isFFA returns true for Diplomacy.option=0', () => {
		expect(isFFA(getFFASettings())).toBe(true);
		expect(isFFA(getW3CSettings())).toBe(false);
	});

	it('isPromode returns true for Promode=1', () => {
		expect(isPromode(getPromode1v1Settings())).toBe(true);
		expect(isPromode(getFFASettings())).toBe(false);
	});

	it('isEqualizedPromode returns true for Promode=2', () => {
		expect(isEqualizedPromode(getEqualizedPromodeSettings())).toBe(true);
		expect(isEqualizedPromode(getPromode1v1Settings())).toBe(false);
	});
});

// ==========================================================================
// Game Simulation — State Transitions
// ==========================================================================

describe('State Transitions', () => {
	let sim: GameSimulation;

	describe('Basic advancement', () => {
		beforeEach(() => {
			sim = createSimulation(getFFASettings());
		});

		it('starts at modeSelection with no state visited', () => {
			expect(sim.matchState).toBe('modeSelection');
			expect(sim.currentStateIndex).toBe(-1);
			expect(sim.stateHistory).toHaveLength(0);
		});

		it('first advanceState enters UpdatePlayerStatusState', () => {
			const state = advanceState(sim);
			expect(state!.name).toBe('UpdatePlayerStatusState');
			expect(sim.matchState).toBe('preMatch');
			expect(sim.matchCount).toBe(1);
		});

		it('advances through all states sequentially', () => {
			const stateNames: string[] = [];
			let state: SimulatedState | null;

			while ((state = advanceState(sim)) !== null) {
				stateNames.push(state.name);
			}

			expect(stateNames).toHaveLength(10);
			expect(stateNames[0]).toBe('UpdatePlayerStatusState');
			expect(stateNames[9]).toBe('ResetState');
		});

		it('returns null when states are exhausted', () => {
			// Advance through all 10 states
			for (let i = 0; i < 10; i++) {
				advanceState(sim);
			}

			const result = advanceState(sim);
			expect(result).toBeNull();
		});
	});

	describe('advanceToNextInteractiveState', () => {
		it('advances FFA to GameLoopState (first interactive state)', () => {
			sim = createSimulation(getFFASettings());
			const state = advanceToNextInteractiveState(sim);

			expect(state!.name).toBe('GameLoopState');
			expect(sim.matchState).toBe('inProgress');
			// Should have visited all states up to GameLoopState
			expect(sim.stateHistory).toEqual([
				'UpdatePlayerStatusState',
				'SetupState',
				'ApplyFogState',
				'CityDistributeState',
				'VisionState',
				'CountdownState',
				'EnableControlsState',
				'GameLoopState',
			]);
		});

		it('advances Promode to ProModeGameLoopState', () => {
			sim = createSimulation(getPromode1v1Settings());
			const state = advanceToNextInteractiveState(sim);

			expect(state!.name).toBe('ProModeGameLoopState');
			expect(sim.matchState).toBe('inProgress');
		});

		it('advances W3C to ProModeGameLoopState', () => {
			sim = createSimulation(getW3CSettings());
			const state = advanceToNextInteractiveState(sim);

			expect(state!.name).toBe('ProModeGameLoopState');
		});

		it('advances Capitals to CapitalsGameLoopState', () => {
			sim = createSimulation(getCapitalsSettings());
			const state = advanceToNextInteractiveState(sim);

			expect(state!.name).toBe('CapitalsGameLoopState');
		});
	});

	describe('Match state lifecycle', () => {
		it('FFA transitions modeSelection → preMatch → inProgress → postMatch', () => {
			sim = createSimulation(getFFASettings());

			// Before any state
			expect(sim.matchState).toBe('modeSelection');

			// Advance to game loop
			advanceToNextInteractiveState(sim);
			expect(sim.matchState).toBe('inProgress');

			// End the game loop
			endGameLoop(sim);
			expect(sim.matchState).toBe('postMatch');

			// Verify lifecycle history
			expect(sim.matchStateHistory).toEqual(['modeSelection', 'preMatch', 'inProgress', 'postMatch']);
		});

		it('Promode transitions through same lifecycle', () => {
			sim = createSimulation(getPromode1v1Settings());
			advanceToNextInteractiveState(sim);
			expect(sim.matchState).toBe('inProgress');

			endGameLoop(sim);
			expect(sim.matchState).toBe('postMatch');
			expect(sim.matchStateHistory).toEqual(['modeSelection', 'preMatch', 'inProgress', 'postMatch']);
		});
	});
});

// ==========================================================================
// Player Events
// ==========================================================================

describe('Player Events', () => {
	describe('Player death during game loop', () => {
		it('last player death ends the match', () => {
			const sim = createSimulation(getFFASettings(), 3);
			advanceToNextInteractiveState(sim);

			// First death: still 2 players
			const ended1 = simulatePlayerDead(sim);
			expect(ended1).toBe(false);
			expect(sim.matchState).toBe('inProgress');

			// Second death: only 1 player left
			const ended2 = simulatePlayerDead(sim);
			expect(ended2).toBe(true);
			expect(sim.matchState).toBe('postMatch');
		});

		it('player death outside game loop does not end match', () => {
			const sim = createSimulation(getFFASettings(), 2);
			// Only advance to SetupState (index 1), not game loop
			advanceState(sim); // UpdatePlayerStatusState
			advanceState(sim); // SetupState

			const ended = simulatePlayerDead(sim);
			expect(ended).toBe(false);
		});
	});

	describe('Player left', () => {
		it('W3C terminates when < 2 humans remain', () => {
			const sim = createSimulation(getW3CSettings(), 2);
			advanceToNextInteractiveState(sim);

			const terminated = simulatePlayerLeft(sim);
			expect(terminated).toBe(true);
			expect(sim.terminated).toBe(true);
		});

		it('Standard mode does not terminate on player left', () => {
			const sim = createSimulation(getFFASettings(), 2);
			advanceToNextInteractiveState(sim);

			const terminated = simulatePlayerLeft(sim);
			expect(terminated).toBe(false);
			expect(sim.terminated).toBe(false);
		});
	});

	describe('Player forfeit', () => {
		it('W3C terminates on forfeit when < 2 humans remain', () => {
			const sim = createSimulation(getW3CSettings(), 2);
			advanceToNextInteractiveState(sim);

			const terminated = simulatePlayerForfeit(sim);
			expect(terminated).toBe(true);
			expect(sim.terminated).toBe(true);
		});

		it('Standard mode does not terminate on forfeit', () => {
			const sim = createSimulation(getFFASettings(), 3);
			advanceToNextInteractiveState(sim);

			const terminated = simulatePlayerForfeit(sim);
			expect(terminated).toBe(false);
		});
	});

	describe('Restart handling', () => {
		it('FFA blocks restart in GameOverState', () => {
			const sim = createSimulation(getFFASettings());
			advanceToNextInteractiveState(sim); // → GameLoopState
			endGameLoop(sim);
			advanceState(sim); // → GameOverState

			expect(sim.states[sim.currentStateIndex].name).toBe('GameOverState');
			expect(canRestart(sim)).toBe(false);
		});

		it('Promode allows restart in GameOverState', () => {
			const sim = createSimulation(getPromode1v1Settings());
			advanceToNextInteractiveState(sim); // → ProModeGameLoopState
			endGameLoop(sim);
			advanceState(sim); // → GameOverState

			expect(sim.states[sim.currentStateIndex].name).toBe('GameOverState');
			expect(canRestart(sim)).toBe(true);
		});

		it('restart returns false for non-restart states', () => {
			const sim = createSimulation(getFFASettings());
			advanceState(sim); // → UpdatePlayerStatusState
			expect(canRestart(sim)).toBe(false);
		});

		it('restart in game loop returns true for promode', () => {
			const sim = createSimulation(getPromode1v1Settings());
			advanceToNextInteractiveState(sim); // → ProModeGameLoopState

			expect(canRestart(sim)).toBe(true);
		});
	});
});

// ==========================================================================
// W3C Mode Termination
// ==========================================================================

describe('W3C Mode Termination', () => {
	it('terminates when player leaves and < 2 humans', () => {
		const sim = createSimulation(getW3CSettings(), 2);
		advanceToNextInteractiveState(sim);

		simulatePlayerLeft(sim);
		expect(sim.terminated).toBe(true);

		// Further state advances should return null
		const result = advanceState(sim);
		expect(result).toBeNull();
	});

	it('does not terminate with 3+ humans when one leaves', () => {
		const sim = createSimulation(getW3CSettings(), 3);
		advanceToNextInteractiveState(sim);

		simulatePlayerLeft(sim);
		expect(sim.terminated).toBe(false);
		expect(sim.humanPlayerCount).toBe(2);
	});

	it('terminates after multiple leaves bring count below 2', () => {
		const sim = createSimulation(getW3CSettings(), 3);
		advanceToNextInteractiveState(sim);

		simulatePlayerLeft(sim); // 3→2, no termination
		expect(sim.terminated).toBe(false);

		simulatePlayerLeft(sim); // 2→1, terminates
		expect(sim.terminated).toBe(true);
	});

	it('terminates on forfeit just like player left', () => {
		const sim = createSimulation(getW3CSettings(), 2);
		advanceToNextInteractiveState(sim);

		simulatePlayerForfeit(sim);
		expect(sim.terminated).toBe(true);
	});
});

// ==========================================================================
// Equalized Promode Rounds
// ==========================================================================

describe('Equalized Promode Rounds', () => {
	let sim: GameSimulation;

	beforeEach(() => {
		sim = createSimulation(getEqualizedPromodeSettings());
	});

	it('starts at round 1', () => {
		expect(sim.equalizedRound).toBe(1);
		expect(sim.equalizedRound1Winner).toBeNull();
	});

	it('handleEqualizedRound1End stores winner and advances to round 2', () => {
		handleEqualizedRound1End(sim, 'Player1');

		expect(sim.equalizedRound).toBe(2);
		expect(sim.equalizedRound1Winner).toBe('Player1');
	});

	it('handleEqualizedRound2End returns both winners and resets', () => {
		handleEqualizedRound1End(sim, 'Player1');
		const result = handleEqualizedRound2End(sim);

		expect(result.round1Winner).toBe('Player1');
		expect(result.round2Winner).toBe('current');

		// Should be reset for next pair
		expect(sim.equalizedRound).toBe(1);
		expect(sim.equalizedRound1Winner).toBeNull();
	});

	it('restart is blocked during round 2 transition', () => {
		advanceToNextInteractiveState(sim); // → ProModeGameLoopState
		endGameLoop(sim);
		advanceState(sim); // → EqualizedPromodeGameOverState

		// Mark as round 2 (simulates what happens after round 1 end)
		sim.equalizedRound = 2;

		expect(canRestart(sim)).toBe(false);
	});

	it('restart is allowed after round 2 is complete', () => {
		advanceToNextInteractiveState(sim); // → ProModeGameLoopState
		endGameLoop(sim);
		advanceState(sim); // → EqualizedPromodeGameOverState

		// Round 1 complete (default is round 1)
		expect(sim.equalizedRound).toBe(1);
		expect(canRestart(sim)).toBe(true);
	});
});

// ==========================================================================
// Restart / Reset Cycle
// ==========================================================================

describe('Restart / Reset Cycle', () => {
	it('restartMode resets state list and index', () => {
		const sim = createSimulation(getPromode1v1Settings());

		// Advance through some states
		advanceToNextInteractiveState(sim);
		expect(sim.currentStateIndex).toBeGreaterThan(0);

		// Restart
		restartMode(sim);
		expect(sim.currentStateIndex).toBe(-1);
		expect(sim.states).toHaveLength(10);
		expect(sim.turn).toBe(0);
	});

	it('restartMode preserves mode name', () => {
		const sim = createSimulation(getPromode1v1Settings());
		restartMode(sim);
		expect(sim.modeName).toBe('PromodeMode');
	});

	it('restartMode can update human player count', () => {
		const sim = createSimulation(getFFASettings(), 5);
		restartMode(sim, 3);
		expect(sim.humanPlayerCount).toBe(3);
	});

	it('after restart, simulation can run through states again', () => {
		const sim = createSimulation(getPromode1v1Settings());

		// First run
		advanceToNextInteractiveState(sim);
		expect(sim.stateHistory).toContain('ProModeGameLoopState');

		// Restart
		restartMode(sim);

		// Second run
		const state = advanceToNextInteractiveState(sim);
		expect(state!.name).toBe('ProModeGameLoopState');
	});

	it('all states exhausted returns null triggering restart cycle', () => {
		const sim = createSimulation(getFFASettings());

		// Advance through all 10 states
		for (let i = 0; i < 10; i++) {
			advanceState(sim);
		}

		// 11th advance should return null (restart trigger)
		expect(advanceState(sim)).toBeNull();
	});
});

// ==========================================================================
// Full FFA Game Simulation
// ==========================================================================

describe('Full FFA Game Simulation', () => {
	it('simulates complete FFA game: start → play → game over → restart blocked', () => {
		const sim = createSimulation(getFFASettings(), 4);

		// Phase 1: Mode selection → game start
		expect(sim.matchState).toBe('modeSelection');

		// Phase 2: Auto-advance to game loop
		const gameLoop = advanceToNextInteractiveState(sim);
		expect(gameLoop!.name).toBe('GameLoopState');
		expect(sim.matchState).toBe('inProgress');
		expect(sim.matchCount).toBe(1);

		// Phase 3: Players die during game loop
		simulatePlayerDead(sim); // 4→3
		expect(sim.matchState).toBe('inProgress');

		simulatePlayerDead(sim); // 3→2
		expect(sim.matchState).toBe('inProgress');

		simulatePlayerDead(sim); // 2→1, match ends
		expect(sim.matchState).toBe('postMatch');

		// Phase 4: Advance to GameOverState
		const gameOver = advanceState(sim);
		expect(gameOver!.name).toBe('GameOverState');

		// Phase 5: Try to restart — should be blocked in FFA
		expect(canRestart(sim)).toBe(false);

		// Verify full state history
		expect(sim.stateHistory).toContain('UpdatePlayerStatusState');
		expect(sim.stateHistory).toContain('GameLoopState');
		expect(sim.stateHistory).toContain('GameOverState');

		// Verify lifecycle
		expect(sim.matchStateHistory).toEqual(['modeSelection', 'preMatch', 'inProgress', 'postMatch']);
	});

	it('FFA game with many players tracks all deaths correctly', () => {
		const sim = createSimulation(getFFASettings(), 8);
		advanceToNextInteractiveState(sim);

		for (let i = 0; i < 6; i++) {
			expect(simulatePlayerDead(sim)).toBe(false);
		}

		// 7th death leaves 1 player
		expect(simulatePlayerDead(sim)).toBe(true);
		expect(sim.matchState).toBe('postMatch');
		expect(sim.humanPlayerCount).toBe(1);
	});
});

// ==========================================================================
// Full Promode 1v1 Game Simulation
// ==========================================================================

describe('Full Promode 1v1 Game Simulation', () => {
	it('simulates complete Promode 1v1: start → play → game over → restart → new match', () => {
		const sim = createSimulation(getPromode1v1Settings(), 2);

		// Phase 1: Mode selection
		expect(sim.matchState).toBe('modeSelection');
		expect(sim.modeName).toBe('PromodeMode');

		// Phase 2: Auto-advance to game loop
		const gameLoop = advanceToNextInteractiveState(sim);
		expect(gameLoop!.name).toBe('ProModeGameLoopState');
		expect(sim.matchState).toBe('inProgress');
		expect(sim.matchCount).toBe(1);

		// Phase 3: One player dies → match ends
		const ended = simulatePlayerDead(sim);
		expect(ended).toBe(true);
		expect(sim.matchState).toBe('postMatch');

		// Phase 4: Advance to GameOverState
		const gameOver = advanceState(sim);
		expect(gameOver!.name).toBe('GameOverState');

		// Phase 5: Restart is allowed in Promode
		expect(canRestart(sim)).toBe(true);

		// Phase 6: Advance through ResetState
		const reset = advanceState(sim);
		expect(reset!.name).toBe('ResetState');

		// Phase 7: States exhausted → restart mode
		expect(advanceState(sim)).toBeNull();

		// Phase 8: Restart mode for match 2
		restartMode(sim, 2);

		// Phase 9: Run second match
		const gameLoop2 = advanceToNextInteractiveState(sim);
		expect(gameLoop2!.name).toBe('ProModeGameLoopState');
		expect(sim.matchCount).toBe(2);

		// Phase 10: End second match
		simulatePlayerDead(sim);
		expect(sim.matchState).toBe('postMatch');
	});

	it('simulates Promode with player forfeit', () => {
		const sim = createSimulation(getPromode1v1Settings(), 2);
		advanceToNextInteractiveState(sim);

		// Player forfeits but in non-W3C mode this just decrements count
		const terminated = simulatePlayerForfeit(sim);
		expect(terminated).toBe(false);
		expect(sim.humanPlayerCount).toBe(1);
	});

	it('simulates multiple Promode match restarts', () => {
		const sim = createSimulation(getPromode1v1Settings(), 2);

		for (let match = 1; match <= 3; match++) {
			advanceToNextInteractiveState(sim);
			expect(sim.matchCount).toBe(match);

			simulatePlayerDead(sim);

			// Advance through game over and reset
			advanceState(sim); // GameOverState
			advanceState(sim); // ResetState

			// States exhausted
			expect(advanceState(sim)).toBeNull();

			// Restart for next match
			restartMode(sim, 2);
		}

		expect(sim.matchCount).toBe(3);
	});
});

// ==========================================================================
// W3C Mode Full Simulation
// ==========================================================================

describe('W3C Mode Full Simulation', () => {
	it('simulates W3C game with player leave termination', () => {
		const sim = createSimulation(getW3CSettings(), 2);

		// Advance to game loop
		advanceToNextInteractiveState(sim);
		expect(sim.matchState).toBe('inProgress');

		// Player leaves → W3C termination
		const terminated = simulatePlayerLeft(sim);
		expect(terminated).toBe(true);
		expect(sim.terminated).toBe(true);

		// No further state advancement possible
		expect(advanceState(sim)).toBeNull();
	});

	it('W3C game plays normally when no early termination', () => {
		const sim = createSimulation(getW3CSettings(), 2);
		advanceToNextInteractiveState(sim);

		// Match ends normally via player death
		simulatePlayerDead(sim);
		expect(sim.matchState).toBe('postMatch');

		// Can advance to W3CGameOverState
		const gameOver = advanceState(sim);
		expect(gameOver!.name).toBe('W3CGameOverState');
	});

	it('W3C supports best-of-3 match series', () => {
		const sim = createSimulation(getW3CSettings(), 2);

		// Match 1
		advanceToNextInteractiveState(sim);
		expect(sim.matchCount).toBe(1);
		simulatePlayerDead(sim);
		advanceState(sim); // W3CGameOverState
		advanceState(sim); // ResetState
		expect(advanceState(sim)).toBeNull();

		// Match 2
		restartMode(sim, 2);
		advanceToNextInteractiveState(sim);
		expect(sim.matchCount).toBe(2);
	});
});

// ==========================================================================
// Equalized Promode Full Simulation
// ==========================================================================

describe('Equalized Promode Full Simulation', () => {
	it('simulates two-round equalized promode pair', () => {
		const sim = createSimulation(getEqualizedPromodeSettings(), 2);

		// Round 1
		advanceToNextInteractiveState(sim);
		expect(sim.matchCount).toBe(1);
		simulatePlayerDead(sim);
		advanceState(sim); // EqualizedPromodeGameOverState

		// End of round 1
		handleEqualizedRound1End(sim, 'Player1');
		expect(sim.equalizedRound).toBe(2);

		// Restart for round 2
		advanceState(sim); // ResetState
		expect(advanceState(sim)).toBeNull();

		restartMode(sim, 2);

		// Round 2
		advanceToNextInteractiveState(sim);
		expect(sim.matchCount).toBe(2);
		simulatePlayerDead(sim);
		advanceState(sim); // EqualizedPromodeGameOverState

		// End of round 2
		const result = handleEqualizedRound2End(sim);
		expect(result.round1Winner).toBe('Player1');

		// Should be reset for next pair
		expect(sim.equalizedRound).toBe(1);
		expect(sim.equalizedRound1Winner).toBeNull();
	});
});

// ==========================================================================
// Edge Cases
// ==========================================================================

describe('Edge Cases', () => {
	it('simulation with 1 player in FFA', () => {
		const sim = createSimulation(getFFASettings(), 1);
		advanceToNextInteractiveState(sim);

		// No one to kill, just verify state is reached
		expect(sim.matchState).toBe('inProgress');
	});

	it('terminated simulation blocks all further advancement', () => {
		const sim = createSimulation(getW3CSettings(), 2);
		advanceToNextInteractiveState(sim);
		simulatePlayerLeft(sim);
		expect(sim.terminated).toBe(true);

		// Multiple advances should all return null
		expect(advanceState(sim)).toBeNull();
		expect(advanceState(sim)).toBeNull();
		expect(advanceToNextInteractiveState(sim)).toBeNull();
	});

	it('match count increments only on UpdatePlayerStatusState', () => {
		const sim = createSimulation(getFFASettings());
		expect(sim.matchCount).toBe(0);

		// First state is UpdatePlayerStatusState
		advanceState(sim);
		expect(sim.matchCount).toBe(1);

		// Subsequent states do not increment
		advanceState(sim);
		expect(sim.matchCount).toBe(1);
	});

	it('endGameLoop is idempotent for matchStateHistory', () => {
		const sim = createSimulation(getFFASettings());
		advanceToNextInteractiveState(sim);

		endGameLoop(sim);
		const histLen1 = sim.matchStateHistory.length;

		endGameLoop(sim);
		expect(sim.matchStateHistory.length).toBe(histLen1); // No duplicate postMatch
	});

	it('different modes produce different state names', () => {
		const standardNames = getStandardModeStates().map((s) => s.name);
		const promodeNames = getPromodeModeStates().map((s) => s.name);

		// Standard has VisionState + CountdownState; Promode has SetPromodeTempVisionState + PromodeCountdownState
		expect(standardNames).toContain('VisionState');
		expect(standardNames).toContain('CountdownState');
		expect(standardNames).toContain('GameLoopState');
		expect(promodeNames).toContain('SetPromodeTempVisionState');
		expect(promodeNames).toContain('PromodeCountdownState');
		expect(promodeNames).toContain('ProModeGameLoopState');
	});

	it('createSimulation defaults to 2 human players', () => {
		const sim = createSimulation(getFFASettings());
		expect(sim.humanPlayerCount).toBe(2);
	});

	it('each mode first state is always UpdatePlayerStatusState', () => {
		const modes: ModeName[] = ['StandardMode', 'PromodeMode', 'EqualizedPromodeMode', 'W3CMode', 'CapitalsMode'];

		for (const mode of modes) {
			const states = getStatesForMode(mode);
			expect(states[0].name).toBe('UpdatePlayerStatusState');
		}
	});

	it('each mode last state is always ResetState', () => {
		const modes: ModeName[] = ['StandardMode', 'PromodeMode', 'EqualizedPromodeMode', 'W3CMode', 'CapitalsMode'];

		for (const mode of modes) {
			const states = getStatesForMode(mode);
			expect(states[states.length - 1].name).toBe('ResetState');
		}
	});
});
