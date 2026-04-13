import { describe, it, expect } from 'vitest';
import {
	processTick,
	getDayPhase,
	getTimeOfDay,
	isFogActive,
	checkVictory,
	shouldMatchEnd,
	checkPromodeAutoLoss,
	processElimination,
	GameSimulation,
	type DayPhase,
} from 'src/app/utils/game-simulation-logic';

// ─── Unit Tests: processTick ────────────────────────────────────────

describe('processTick', () => {
	it('decrements tick counter by 1', () => {
		const result = processTick(30, 0, 60);
		expect(result.newTickCounter).toBe(29);
		expect(result.turnEnded).toBe(false);
		expect(result.newTurnNumber).toBe(0);
	});

	it('triggers turn end when tick counter reaches 0', () => {
		const result = processTick(1, 0, 60);
		expect(result.newTickCounter).toBe(60);
		expect(result.turnEnded).toBe(true);
		expect(result.newTurnNumber).toBe(1);
	});

	it('resets tick counter to turnDuration on turn end', () => {
		const result = processTick(1, 5, 45);
		expect(result.newTickCounter).toBe(45);
		expect(result.newTurnNumber).toBe(6);
	});

	it('handles high turn numbers', () => {
		const result = processTick(1, 99, 60);
		expect(result.newTurnNumber).toBe(100);
		expect(result.turnEnded).toBe(true);
	});

	it('does not end turn with large tick counter', () => {
		const result = processTick(60, 0, 60);
		expect(result.newTickCounter).toBe(59);
		expect(result.turnEnded).toBe(false);
	});
});

// ─── Unit Tests: Day/Night Fog Cycle ────────────────────────────────

describe('getDayPhase', () => {
	it('turn 0 is always day (first turn special case)', () => {
		expect(getDayPhase(0)).toBe('day');
	});

	it('turn 1 → dusk (phase 0)', () => {
		expect(getDayPhase(1)).toBe('dusk');
	});

	it('turn 2 → night (phase 1)', () => {
		expect(getDayPhase(2)).toBe('night');
	});

	it('turn 3 → dawn (phase 2)', () => {
		expect(getDayPhase(3)).toBe('dawn');
	});

	it('turn 4 → day (phase 3)', () => {
		expect(getDayPhase(4)).toBe('day');
	});

	it('cycles repeat every 4 turns after turn 0', () => {
		// Second cycle
		expect(getDayPhase(5)).toBe('dusk');
		expect(getDayPhase(6)).toBe('night');
		expect(getDayPhase(7)).toBe('dawn');
		expect(getDayPhase(8)).toBe('day');
	});

	it('third cycle continues correctly', () => {
		expect(getDayPhase(9)).toBe('dusk');
		expect(getDayPhase(10)).toBe('night');
		expect(getDayPhase(11)).toBe('dawn');
		expect(getDayPhase(12)).toBe('day');
	});
});

describe('getTimeOfDay', () => {
	it('day = 12.0', () => expect(getTimeOfDay('day')).toBe(12.0));
	it('dusk = 18.0', () => expect(getTimeOfDay('dusk')).toBe(18.0));
	it('night = 0.0', () => expect(getTimeOfDay('night')).toBe(0.0));
	it('dawn = 6.0', () => expect(getTimeOfDay('dawn')).toBe(6.0));
});

describe('isFogActive', () => {
	it('fog is off during day', () => expect(isFogActive('day')).toBe(false));
	it('fog is on during dusk', () => expect(isFogActive('dusk')).toBe(true));
	it('fog is on during night', () => expect(isFogActive('night')).toBe(true));
	it('fog is off during dawn', () => expect(isFogActive('dawn')).toBe(false));
});

describe('fog cycle across multiple turns', () => {
	it('matches production updateFogSettings for turns 0–12', () => {
		const expected: { turn: number; phase: DayPhase; fog: boolean }[] = [
			{ turn: 0, phase: 'day', fog: false },
			{ turn: 1, phase: 'dusk', fog: true },
			{ turn: 2, phase: 'night', fog: true },
			{ turn: 3, phase: 'dawn', fog: false },
			{ turn: 4, phase: 'day', fog: false },
			{ turn: 5, phase: 'dusk', fog: true },
			{ turn: 6, phase: 'night', fog: true },
			{ turn: 7, phase: 'dawn', fog: false },
			{ turn: 8, phase: 'day', fog: false },
		];

		expected.forEach(({ turn, phase, fog }) => {
			const actualPhase = getDayPhase(turn);
			expect(actualPhase).toBe(phase);
			expect(isFogActive(actualPhase)).toBe(fog);
		});
	});
});

// ─── Unit Tests: Victory Check ──────────────────────────────────────

describe('checkVictory', () => {
	it('returns UNDECIDED when no one has enough cities', () => {
		const counts = new Map([
			['P1', 10],
			['P2', 8],
		]);
		const result = checkVictory(counts, 20);
		expect(result.state).toBe('UNDECIDED');
	});

	it('returns DECIDED when one player reaches citiesToWin', () => {
		const counts = new Map([
			['P1', 20],
			['P2', 8],
		]);
		const result = checkVictory(counts, 20);
		expect(result.state).toBe('DECIDED');
		expect(result.leader).toBe('P1');
	});

	it('returns TIE when multiple players reach citiesToWin equally', () => {
		const counts = new Map([
			['P1', 20],
			['P2', 20],
		]);
		const result = checkVictory(counts, 20);
		expect(result.state).toBe('TIE');
		expect(result.leader).toBeUndefined();
	});

	it('returns DECIDED if player exceeds citiesToWin', () => {
		const counts = new Map([
			['P1', 25],
			['P2', 10],
		]);
		const result = checkVictory(counts, 20);
		expect(result.state).toBe('DECIDED');
		expect(result.leader).toBe('P1');
	});

	it('handles single player (instant win)', () => {
		const counts = new Map([['P1', 20]]);
		const result = checkVictory(counts, 20);
		expect(result.state).toBe('DECIDED');
		expect(result.leader).toBe('P1');
	});

	it('handles many players with one leader', () => {
		const counts = new Map([
			['P1', 5],
			['P2', 3],
			['P3', 20],
			['P4', 2],
			['P5', 7],
		]);
		const result = checkVictory(counts, 20);
		expect(result.state).toBe('DECIDED');
		expect(result.leader).toBe('P3');
	});
});

describe('shouldMatchEnd', () => {
	it('returns true when 0 active players', () => {
		expect(shouldMatchEnd(0)).toBe(true);
	});

	it('returns true when 1 active player', () => {
		expect(shouldMatchEnd(1)).toBe(true);
	});

	it('returns false when 2+ active players', () => {
		expect(shouldMatchEnd(2)).toBe(false);
		expect(shouldMatchEnd(8)).toBe(false);
	});
});

// ─── Unit Tests: Promode Auto-Loss ──────────────────────────────────

describe('checkPromodeAutoLoss', () => {
	it('eliminates player when opponent has 2x their cities', () => {
		const result = checkPromodeAutoLoss(
			[
				{ id: 'P1', cityCount: 10 },
				{ id: 'P2', cityCount: 30 },
			],
			0.6
		);
		expect(result.eliminated).toContain('P1');
		expect(result.eliminated).not.toContain('P2');
	});

	it('warns player when opponent approaches 2x', () => {
		const result = checkPromodeAutoLoss(
			[
				{ id: 'P1', cityCount: 10 },
				{ id: 'P2', cityCount: 15 },
			],
			0.6
		);
		// 15 >= 10 * 2 * 0.6 = 12, so P1 gets a warning
		expect(result.warnings).toContain('P1');
		expect(result.eliminated).toHaveLength(0);
	});

	it('no elimination when city counts are balanced', () => {
		const result = checkPromodeAutoLoss(
			[
				{ id: 'P1', cityCount: 15 },
				{ id: 'P2', cityCount: 15 },
			],
			0.6
		);
		expect(result.eliminated).toHaveLength(0);
		expect(result.warnings).toHaveLength(0);
	});

	it('eliminates at exactly 2x', () => {
		const result = checkPromodeAutoLoss(
			[
				{ id: 'P1', cityCount: 10 },
				{ id: 'P2', cityCount: 20 },
			],
			0.6
		);
		expect(result.eliminated).toContain('P1');
	});

	it('does not eliminate when just below 2x', () => {
		const result = checkPromodeAutoLoss(
			[
				{ id: 'P1', cityCount: 10 },
				{ id: 'P2', cityCount: 19 },
			],
			0.6
		);
		expect(result.eliminated).toHaveLength(0);
	});
});

// ─── Unit Tests: processElimination ─────────────────────────────────

describe('processElimination', () => {
	it('signals FFA debuff when isFFA is true', () => {
		const result = processElimination(true, 5);
		expect(result.shouldApplyDebuff).toBe(true);
		expect(result.matchShouldEnd).toBe(false);
	});

	it('no debuff for non-FFA', () => {
		const result = processElimination(false, 1);
		expect(result.shouldApplyDebuff).toBe(false);
	});

	it('match should end when 1 player remains', () => {
		const result = processElimination(true, 1);
		expect(result.matchShouldEnd).toBe(true);
	});

	it('match should end when 0 players remain', () => {
		const result = processElimination(true, 0);
		expect(result.matchShouldEnd).toBe(true);
	});

	it('match continues with 2+ players', () => {
		const result = processElimination(true, 3);
		expect(result.matchShouldEnd).toBe(false);
	});
});

// ─── Integration Tests: FFA Game Simulation ─────────────────────────

describe('FFA Game Simulation', () => {
	describe('basic game flow', () => {
		it('creates FFA with correct mode', () => {
			const sim = GameSimulation.createFFA(8, 30);
			expect(sim.getModeName()).toBe('StandardMode');
			expect(sim.getMatchState()).toBe('modeSelection');
		});

		it('transitions through pre-game states to inProgress', () => {
			const sim = GameSimulation.createFFA(8, 30);
			sim.startGame();
			expect(sim.getMatchState()).toBe('inProgress');
		});

		it('has correct state sequence for Standard mode', () => {
			const sim = GameSimulation.createFFA(8, 30);
			const seq = sim.getStateSequence();
			expect(seq).toHaveLength(10);
			expect(seq[0]).toBe('UpdatePlayerStatusState');
			expect(seq[seq.length - 1]).toBe('ResetState');
			expect(seq).toContain('GameLoopState');
		});

		it('starts at turn 0', () => {
			const sim = GameSimulation.createFFA(8, 30);
			sim.startGame();
			expect(sim.getTurnNumber()).toBe(0);
		});

		it('all players start active', () => {
			const sim = GameSimulation.createFFA(8, 30);
			sim.startGame();
			expect(sim.getActivePlayers()).toHaveLength(8);
		});
	});

	describe('player elimination cascade', () => {
		it('eliminates players and ends game when 1 remains', () => {
			const sim = GameSimulation.createFFA(4, 30);
			sim.startGame();

			// Kill 3 players across 3 turns
			sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P1' });
			sim.scheduleEvent({ turn: 1, type: 'playerDead', playerId: 'P2' });
			sim.scheduleEvent({ turn: 2, type: 'playerDead', playerId: 'P3' });

			const snapshots = sim.runUntilEnd(10);

			// Game should end on turn 2 when P3 dies (only P4 remains)
			const lastSnapshot = snapshots[snapshots.length - 1];
			expect(lastSnapshot.matchState).toBe('postMatch');
			expect(sim.getWinner()).toBe('P4');
			expect(sim.getActivePlayers()).toHaveLength(1);
			expect(sim.getActivePlayers()[0].id).toBe('P4');
		});

		it('records eliminations in snapshots', () => {
			const sim = GameSimulation.createFFA(3, 30);
			sim.startGame();

			sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P1' });

			const snapshot = sim.runTurn();
			expect(snapshot.eliminated).toContain('P1');
			expect(sim.getActivePlayers()).toHaveLength(2);
		});
	});

	describe('player leave during game', () => {
		it('leaving player is eliminated', () => {
			const sim = GameSimulation.createFFA(3, 30);
			sim.startGame();

			sim.scheduleEvent({ turn: 0, type: 'playerLeft', playerId: 'P2' });

			const snapshot = sim.runTurn();
			expect(snapshot.eliminated).toContain('P2');
			expect(sim.getPlayer('P2')?.isActive).toBe(false);
		});

		it('game ends if leave causes 1 player remaining', () => {
			const sim = GameSimulation.createFFA(2, 30);
			sim.startGame();

			sim.scheduleEvent({ turn: 0, type: 'playerLeft', playerId: 'P1' });

			sim.runTurn();
			expect(sim.getMatchState()).toBe('postMatch');
			expect(sim.getWinner()).toBe('P2');
		});
	});

	describe('city capture → victory', () => {
		it('player wins by reaching citiesToWin threshold', () => {
			const sim = GameSimulation.createFFA(4, 20, 40);
			sim.startGame();

			// P1 captures cities from P2, P3, P4 over several turns
			for (let t = 0; t < 10; t++) {
				const target = `P${(t % 3) + 2}`; // P2, P3, P4 rotating
				sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P1', targetPlayerId: target });
			}

			const snapshots = sim.runUntilEnd(15);

			// P1 starts with 10 cities (40/4) and gains 1 per turn
			// After 10 captures: P1 has 20 cities → DECIDED
			const lastSnapshot = snapshots[snapshots.length - 1];
			expect(lastSnapshot.victoryState).toBe('DECIDED');
			expect(lastSnapshot.leader).toBe('P1');
		});

		it('losing all cities eliminates a player', () => {
			const sim = GameSimulation.createFFA(3, 20, 30);
			sim.startGame();

			// P1 starts with 10 cities. P2 captures all 10.
			for (let t = 0; t < 10; t++) {
				sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P2', targetPlayerId: 'P1' });
			}

			sim.runUntilEnd(15);

			// P1 should be eliminated at turn 9 (10 - 10 = 0 cities)
			const p1 = sim.getPlayer('P1');
			expect(p1?.isActive).toBe(false);
			expect(p1?.cityCount).toBe(0);
		});
	});

	describe('fog/night cycle in FFA', () => {
		it('fog cycle matches expected phases across turns', () => {
			const sim = GameSimulation.createFFA(4, 100); // high threshold so game doesn't end
			sim.startGame();

			const snapshots = sim.runUntilEnd(9);

			expect(snapshots[0].phase).toBe('day'); // turn 0
			expect(snapshots[0].fogActive).toBe(false);

			expect(snapshots[1].phase).toBe('dusk'); // turn 1
			expect(snapshots[1].fogActive).toBe(true);

			expect(snapshots[2].phase).toBe('night'); // turn 2
			expect(snapshots[2].fogActive).toBe(true);

			expect(snapshots[3].phase).toBe('dawn'); // turn 3
			expect(snapshots[3].fogActive).toBe(false);

			expect(snapshots[4].phase).toBe('day'); // turn 4
			expect(snapshots[4].fogActive).toBe(false);
		});
	});

	describe('restart blocked in FFA', () => {
		it('restart is always blocked in FFA', () => {
			const sim = GameSimulation.createFFA(3, 30);
			sim.startGame();

			// End the game first
			sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P1' });
			sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P2' });
			sim.runTurn();

			expect(sim.getMatchState()).toBe('postMatch');

			// Attempt restart — should be rejected
			const restarted = sim.attemptRestart('P3');
			expect(restarted).toBe(false);
			expect(sim.getMatchState()).toBe('postMatch');
		});
	});
});

// ─── Integration Tests: Promode 1v1 Simulation ─────────────────────

describe('Promode 1v1 Game Simulation', () => {
	describe('basic flow', () => {
		it('creates Promode with correct mode', () => {
			const sim = GameSimulation.createPromode1v1(30);
			expect(sim.getModeName()).toBe('PromodeMode');
		});

		it('has correct state sequence for Promode', () => {
			const sim = GameSimulation.createPromode1v1(30);
			const seq = sim.getStateSequence();
			expect(seq).toHaveLength(10);
			expect(seq).toContain('ProModeGameLoopState');
			expect(seq).toContain('SetPromodeTempVisionState');
			expect(seq).toContain('PromodeCountdownState');
		});

		it('starts with 2 players', () => {
			const sim = GameSimulation.createPromode1v1(30);
			sim.startGame();
			expect(sim.getActivePlayers()).toHaveLength(2);
		});
	});

	describe('city capture → victory', () => {
		it('player wins by reaching citiesToWin', () => {
			const sim = GameSimulation.createPromode1v1(25, 40);
			sim.startGame();

			// P1 captures cities from P2
			for (let t = 0; t < 5; t++) {
				sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P1', targetPlayerId: 'P2' });
			}

			const snapshots = sim.runUntilEnd(10);

			// P1 starts with 20, gains 5 → 25 → wins
			const lastSnapshot = snapshots[snapshots.length - 1];
			expect(lastSnapshot.victoryState).toBe('DECIDED');
			expect(lastSnapshot.leader).toBe('P1');
		});
	});

	describe('promode auto-loss at 2x deficit', () => {
		it('eliminates player behind 2x in city count', () => {
			const sim = GameSimulation.createPromode1v1(100, 40);
			sim.startGame();

			// P1 captures 7 cities from P2 (P1: 27, P2: 13 → P1 has >2x P2)
			for (let t = 0; t < 7; t++) {
				sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P1', targetPlayerId: 'P2' });
			}

			const snapshots = sim.runUntilEnd(10);

			// At turn 7, P1 has 27 and P2 has 13. 27 >= 13 * 2 = 26 → P2 auto-eliminated
			const eliminationTurn = snapshots.find((s) => s.eliminated.includes('P2'));
			expect(eliminationTurn).toBeDefined();
			expect(sim.getMatchState()).toBe('postMatch');
			expect(sim.getWinner()).toBe('P1');
		});

		it('does not eliminate when just below 2x threshold', () => {
			const sim = GameSimulation.createPromode1v1(100, 40);
			sim.startGame();

			// P1 captures 6 cities from P2 (P1: 26, P2: 14 → 26 < 14*2=28)
			for (let t = 0; t < 6; t++) {
				sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P1', targetPlayerId: 'P2' });
			}

			const snapshots = sim.runUntilEnd(7);

			// After 6 captures: P1=26, P2=14. 26 < 28 → no auto-loss
			const lastSnapshot = snapshots[snapshots.length - 1];
			expect(lastSnapshot.matchState).toBe('inProgress');
			expect(sim.getActivePlayers()).toHaveLength(2);
		});

		it('warns player when approaching 2x deficit', () => {
			const sim = GameSimulation.createPromode1v1(100, 40);
			sim.startGame();

			// P1 captures 4 cities (P1: 24, P2: 16)
			// Warning ratio 0.6: 24 >= 16 * 2 * 0.6 = 19.2 → P2 warned
			for (let t = 0; t < 4; t++) {
				sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P1', targetPlayerId: 'P2' });
			}

			const snapshots = sim.runUntilEnd(5);

			const warningTurn = snapshots.find((s) => s.warnings.includes('P2'));
			expect(warningTurn).toBeDefined();
		});
	});

	describe('forfeit handling', () => {
		it('forfeit eliminates player and opponent wins', () => {
			const sim = GameSimulation.createPromode1v1(30);
			sim.startGame();

			sim.scheduleEvent({ turn: 0, type: 'forfeit', playerId: 'P1' });

			sim.runTurn();
			expect(sim.getMatchState()).toBe('postMatch');
			expect(sim.getWinner()).toBe('P2');
			expect(sim.getPlayer('P1')?.isActive).toBe(false);
		});
	});

	describe('player leave → automatic win', () => {
		it('opponent wins when player disconnects', () => {
			const sim = GameSimulation.createPromode1v1(30);
			sim.startGame();

			sim.scheduleEvent({ turn: 1, type: 'playerLeft', playerId: 'P2' });

			const snapshots = sim.runUntilEnd(5);

			const endSnapshot = snapshots.find((s) => s.matchState === 'postMatch');
			expect(endSnapshot).toBeDefined();
			expect(sim.getWinner()).toBe('P1');
		});
	});

	describe('restart allowed after game over', () => {
		it('restart succeeds in non-FFA postMatch', () => {
			const sim = GameSimulation.createPromode1v1(30);
			sim.startGame();

			sim.scheduleEvent({ turn: 0, type: 'forfeit', playerId: 'P1' });
			sim.runTurn();

			expect(sim.getMatchState()).toBe('postMatch');

			const restarted = sim.attemptRestart('P2');
			expect(restarted).toBe(true);
			expect(sim.getMatchState()).toBe('preMatch');
		});
	});
});

// ─── Cross-Mode Lifecycle Tests ─────────────────────────────────────

describe('Cross-Mode Game Lifecycle', () => {
	it('FFA mode selection → correct state sequence → game start', () => {
		const sim = GameSimulation.createFFA(8, 30);
		expect(sim.getModeName()).toBe('StandardMode');
		expect(sim.getMatchState()).toBe('modeSelection');

		sim.startGame();
		expect(sim.getMatchState()).toBe('inProgress');
		expect(sim.getTurnNumber()).toBe(0);
	});

	it('Promode mode selection → correct state sequence → game start', () => {
		const sim = GameSimulation.createPromode1v1(30);
		expect(sim.getModeName()).toBe('PromodeMode');
		expect(sim.getMatchState()).toBe('modeSelection');

		sim.startGame();
		expect(sim.getMatchState()).toBe('inProgress');
	});

	it('complete FFA lifecycle: start → play → victory → postMatch', () => {
		const sim = GameSimulation.createFFA(3, 20, 30);
		sim.startGame();

		// P1 dominates, captures enough cities
		for (let t = 0; t < 10; t++) {
			sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P1', targetPlayerId: 'P2' });
		}

		const snapshots = sim.runUntilEnd(15);

		// Verify full lifecycle happened
		expect(snapshots.length).toBeGreaterThan(0);
		expect(snapshots[0].matchState).toBe('inProgress');

		const lastSnapshot = snapshots[snapshots.length - 1];
		expect(lastSnapshot.matchState).toBe('postMatch');
		expect(lastSnapshot.victoryState).toBe('DECIDED');
	});

	it('complete Promode lifecycle: start → play → auto-loss → restart → preMatch', () => {
		const sim = GameSimulation.createPromode1v1(100, 40);
		sim.startGame();

		// P1 dominates to trigger auto-loss
		for (let t = 0; t < 7; t++) {
			sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P1', targetPlayerId: 'P2' });
		}

		sim.runUntilEnd(10);
		expect(sim.getMatchState()).toBe('postMatch');

		// Restart
		const restarted = sim.attemptRestart('P1');
		expect(restarted).toBe(true);
		expect(sim.getMatchState()).toBe('preMatch');
	});

	it('multiple events in same turn are processed', () => {
		const sim = GameSimulation.createFFA(4, 30);
		sim.startGame();

		// Two deaths on the same turn
		sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P1' });
		sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P2' });

		const snapshot = sim.runTurn();
		expect(snapshot.eliminated).toContain('P1');
		expect(snapshot.eliminated).toContain('P2');
		expect(sim.getActivePlayers()).toHaveLength(2);
	});

	it('game tracks all snapshots', () => {
		const sim = GameSimulation.createFFA(3, 30);
		sim.startGame();

		sim.scheduleEvent({ turn: 3, type: 'playerDead', playerId: 'P1' });
		sim.scheduleEvent({ turn: 3, type: 'playerDead', playerId: 'P2' });

		sim.runUntilEnd(5);

		// Turns 0, 1, 2 run normally, turn 3 ends the game (2 deaths → 1 remaining)
		const allSnapshots = sim.getSnapshots();
		expect(allSnapshots.length).toBe(4); // turns 0, 1, 2, 3
	});

	it('promode has ProModeGameLoopState not GameLoopState', () => {
		const sim = GameSimulation.createPromode1v1(30);
		const seq = sim.getStateSequence();
		expect(seq).toContain('ProModeGameLoopState');
		expect(seq).not.toContain('GameLoopState');
	});

	it('FFA has GameLoopState not ProModeGameLoopState', () => {
		const sim = GameSimulation.createFFA(8, 30);
		const seq = sim.getStateSequence();
		expect(seq).toContain('GameLoopState');
		expect(seq).not.toContain('ProModeGameLoopState');
	});
});
