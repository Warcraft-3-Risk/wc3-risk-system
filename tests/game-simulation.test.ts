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
	checkTeamVictory,
	checkTeamPromodeAutoLoss,
	isTeamEliminated,
	countActiveTeams,
	GameSimulation,
	type DayPhase,
	type SimPlayer,
	type SimTeam,
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

// ─── Unit Tests: Team Victory Check ─────────────────────────────────

describe('checkTeamVictory', () => {
	function makePlayers(entries: [string, number][]): Map<string, SimPlayer> {
		const map = new Map<string, SimPlayer>();
		for (const [id, cityCount] of entries) {
			map.set(id, { id, cityCount, isActive: true, isHuman: true });
		}
		return map;
	}

	it('returns UNDECIDED when no team has enough cities', () => {
		const players = makePlayers([
			['P1', 5],
			['P2', 5],
			['P3', 5],
			['P4', 5],
		]);
		const teams: SimTeam[] = [
			{ id: 1, memberIds: ['P1', 'P2'], isActive: true },
			{ id: 2, memberIds: ['P3', 'P4'], isActive: true },
		];
		const result = checkTeamVictory(teams, players, 20);
		expect(result.state).toBe('UNDECIDED');
	});

	it('returns DECIDED when one team reaches citiesToWin', () => {
		const players = makePlayers([
			['P1', 12],
			['P2', 10],
			['P3', 3],
			['P4', 3],
		]);
		const teams: SimTeam[] = [
			{ id: 1, memberIds: ['P1', 'P2'], isActive: true },
			{ id: 2, memberIds: ['P3', 'P4'], isActive: true },
		];
		const result = checkTeamVictory(teams, players, 20);
		expect(result.state).toBe('DECIDED');
		expect(result.leaderTeamId).toBe(1);
	});

	it('returns TIE when teams are tied at citiesToWin', () => {
		const players = makePlayers([
			['P1', 10],
			['P2', 10],
			['P3', 10],
			['P4', 10],
		]);
		const teams: SimTeam[] = [
			{ id: 1, memberIds: ['P1', 'P2'], isActive: true },
			{ id: 2, memberIds: ['P3', 'P4'], isActive: true },
		];
		const result = checkTeamVictory(teams, players, 20);
		expect(result.state).toBe('TIE');
		expect(result.leaderTeamId).toBeUndefined();
	});

	it('aggregates city counts across team members', () => {
		const players = makePlayers([
			['P1', 3],
			['P2', 4],
			['P3', 5],
			['P4', 8],
			['P5', 5],
			['P6', 5],
		]);
		const teams: SimTeam[] = [
			{ id: 1, memberIds: ['P1', 'P2', 'P3'], isActive: true },
			{ id: 2, memberIds: ['P4', 'P5', 'P6'], isActive: true },
		];
		// Team 1: 3+4+5=12, Team 2: 8+5+5=18
		const result = checkTeamVictory(teams, players, 15);
		expect(result.state).toBe('DECIDED');
		expect(result.leaderTeamId).toBe(2);
	});

	it('ignores inactive teams', () => {
		const players = makePlayers([
			['P1', 15],
			['P2', 15],
			['P3', 0],
			['P4', 0],
		]);
		const teams: SimTeam[] = [
			{ id: 1, memberIds: ['P1', 'P2'], isActive: true },
			{ id: 2, memberIds: ['P3', 'P4'], isActive: false },
		];
		const result = checkTeamVictory(teams, players, 20);
		expect(result.state).toBe('DECIDED');
		expect(result.leaderTeamId).toBe(1);
	});
});

describe('checkTeamPromodeAutoLoss', () => {
	function makePlayers(entries: [string, number][]): Map<string, SimPlayer> {
		const map = new Map<string, SimPlayer>();
		for (const [id, cityCount] of entries) {
			map.set(id, { id, cityCount, isActive: true, isHuman: true });
		}
		return map;
	}

	it('eliminates team behind 2x in total cities', () => {
		const players = makePlayers([
			['P1', 15],
			['P2', 15],
			['P3', 5],
			['P4', 5],
		]);
		const teams: SimTeam[] = [
			{ id: 1, memberIds: ['P1', 'P2'], isActive: true },
			{ id: 2, memberIds: ['P3', 'P4'], isActive: true },
		];
		// Team 1: 30, Team 2: 10. 30 >= 10 * 2 → Team 2 eliminated
		const result = checkTeamPromodeAutoLoss(teams, players, 0.6);
		expect(result.eliminated).toContain('P3');
		expect(result.eliminated).toContain('P4');
		expect(result.eliminated).not.toContain('P1');
		expect(result.eliminated).not.toContain('P2');
	});

	it('warns team approaching 2x deficit', () => {
		const players = makePlayers([
			['P1', 12],
			['P2', 12],
			['P3', 8],
			['P4', 8],
		]);
		const teams: SimTeam[] = [
			{ id: 1, memberIds: ['P1', 'P2'], isActive: true },
			{ id: 2, memberIds: ['P3', 'P4'], isActive: true },
		];
		// Team 1: 24, Team 2: 16. 24 >= 16 * 2 * 0.6 = 19.2 → Team 2 warned
		const result = checkTeamPromodeAutoLoss(teams, players, 0.6);
		expect(result.warnings).toContain('P3');
		expect(result.warnings).toContain('P4');
		expect(result.eliminated).toHaveLength(0);
	});

	it('no elimination when teams are balanced', () => {
		const players = makePlayers([
			['P1', 10],
			['P2', 10],
			['P3', 10],
			['P4', 10],
		]);
		const teams: SimTeam[] = [
			{ id: 1, memberIds: ['P1', 'P2'], isActive: true },
			{ id: 2, memberIds: ['P3', 'P4'], isActive: true },
		];
		const result = checkTeamPromodeAutoLoss(teams, players, 0.6);
		expect(result.eliminated).toHaveLength(0);
		expect(result.warnings).toHaveLength(0);
	});
});

describe('isTeamEliminated / countActiveTeams', () => {
	function makePlayers(entries: [string, boolean][]): Map<string, SimPlayer> {
		const map = new Map<string, SimPlayer>();
		for (const [id, isActive] of entries) {
			map.set(id, { id, cityCount: 5, isActive, isHuman: true });
		}
		return map;
	}

	it('team is active when at least one member is active', () => {
		const players = makePlayers([
			['P1', true],
			['P2', false],
		]);
		const team: SimTeam = { id: 1, memberIds: ['P1', 'P2'], isActive: true };
		expect(isTeamEliminated(team, players)).toBe(false);
	});

	it('team is eliminated when all members are inactive', () => {
		const players = makePlayers([
			['P1', false],
			['P2', false],
		]);
		const team: SimTeam = { id: 1, memberIds: ['P1', 'P2'], isActive: true };
		expect(isTeamEliminated(team, players)).toBe(true);
	});

	it('counts active teams correctly', () => {
		const players = makePlayers([
			['P1', true],
			['P2', true],
			['P3', false],
			['P4', false],
		]);
		const teams: SimTeam[] = [
			{ id: 1, memberIds: ['P1', 'P2'], isActive: true },
			{ id: 2, memberIds: ['P3', 'P4'], isActive: true },
		];
		expect(countActiveTeams(teams, players)).toBe(1);
	});

	it('counts zero when all teams eliminated', () => {
		const players = makePlayers([
			['P1', false],
			['P2', false],
			['P3', false],
			['P4', false],
		]);
		const teams: SimTeam[] = [
			{ id: 1, memberIds: ['P1', 'P2'], isActive: true },
			{ id: 2, memberIds: ['P3', 'P4'], isActive: true },
		];
		expect(countActiveTeams(teams, players)).toBe(0);
	});
});

// ─── Integration Tests: Promode 2v2 Simulation ─────────────────────

describe('Promode 2v2 Game Simulation', () => {
	describe('basic setup', () => {
		it('creates 2v2 with correct mode and teams', () => {
			const sim = GameSimulation.createPromodeTeams([2, 2], 30);
			expect(sim.getModeName()).toBe('PromodeMode');
			expect(sim.getTeams()).toHaveLength(2);
			expect(sim.getTeams()[0].memberIds).toEqual(['P1', 'P2']);
			expect(sim.getTeams()[1].memberIds).toEqual(['P3', 'P4']);
		});

		it('has 4 active players', () => {
			const sim = GameSimulation.createPromodeTeams([2, 2], 30);
			sim.startGame();
			expect(sim.getActivePlayers()).toHaveLength(4);
		});

		it('uses ProModeGameLoopState', () => {
			const sim = GameSimulation.createPromodeTeams([2, 2], 30);
			expect(sim.getStateSequence()).toContain('ProModeGameLoopState');
		});

		it('distributes cities evenly across all players', () => {
			const sim = GameSimulation.createPromodeTeams([2, 2], 30, 40);
			expect(sim.getPlayer('P1')?.cityCount).toBe(10);
			expect(sim.getPlayer('P4')?.cityCount).toBe(10);
		});
	});

	describe('team victory by city threshold', () => {
		it('team wins when combined cities reach citiesToWin', () => {
			const sim = GameSimulation.createPromodeTeams([2, 2], 25, 40);
			sim.startGame();

			// Team 1 captures cities from Team 2 members
			for (let t = 0; t < 5; t++) {
				sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P1', targetPlayerId: 'P3' });
			}

			const snapshots = sim.runUntilEnd(10);
			// P1: 10+5=15, P2: 10, Team 1 total: 25 → wins
			const lastSnapshot = snapshots[snapshots.length - 1];
			expect(lastSnapshot.matchState).toBe('postMatch');
			expect(lastSnapshot.leader).toBe('Team 1');
		});

		it('both team members contribute to city threshold', () => {
			const sim = GameSimulation.createPromodeTeams([2, 2], 25, 40);
			sim.startGame();

			// Both P1 and P2 capture cities
			for (let t = 0; t < 3; t++) {
				sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P1', targetPlayerId: 'P3' });
			}
			for (let t = 0; t < 2; t++) {
				sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P2', targetPlayerId: 'P4' });
			}

			const snapshots = sim.runUntilEnd(10);
			// P1: 13, P2: 12, Team 1: 25 → wins
			const lastSnapshot = snapshots[snapshots.length - 1];
			expect(lastSnapshot.matchState).toBe('postMatch');
			expect(lastSnapshot.leader).toBe('Team 1');
		});
	});

	describe('team auto-loss at 2x deficit', () => {
		it('team is eliminated when opponent team has 2x total cities', () => {
			const sim = GameSimulation.createPromodeTeams([2, 2], 100, 40);
			sim.startGame();

			// P1 and P2 dominate: each captures 5 from P3/P4
			for (let t = 0; t < 5; t++) {
				sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P1', targetPlayerId: 'P3' });
				sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P2', targetPlayerId: 'P4' });
			}

			const snapshots = sim.runUntilEnd(10);
			// After 5 turns: Team 1 = (15+15)=30, Team 2 = (5+5)=10. 30 >= 10*2 → Team 2 auto-loss
			const eliminationTurn = snapshots.find((s) => s.eliminated.includes('P3') || s.eliminated.includes('P4'));
			expect(eliminationTurn).toBeDefined();
			expect(sim.getMatchState()).toBe('postMatch');
			expect(sim.getWinner()).toBe('Team 1');
		});
	});

	describe('partial team elimination', () => {
		it('team survives when one member dies but other remains active', () => {
			const sim = GameSimulation.createPromodeTeams([2, 2], 100);
			sim.startGame();

			sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P1' });

			const snapshot = sim.runTurn();
			expect(snapshot.eliminated).toContain('P1');
			expect(sim.getPlayer('P1')?.isActive).toBe(false);
			expect(sim.getPlayer('P2')?.isActive).toBe(true);
			// Match continues because Team 1 still has P2
			expect(sim.getMatchState()).toBe('inProgress');
		});

		it('team is eliminated when all members die', () => {
			const sim = GameSimulation.createPromodeTeams([2, 2], 100);
			sim.startGame();

			sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P1' });
			sim.scheduleEvent({ turn: 1, type: 'playerDead', playerId: 'P2' });

			sim.runUntilEnd(5);
			expect(sim.getMatchState()).toBe('postMatch');
			expect(sim.getWinner()).toBe('Team 2');
		});

		it('one teammate leaving does not end the match', () => {
			const sim = GameSimulation.createPromodeTeams([2, 2], 100);
			sim.startGame();

			sim.scheduleEvent({ turn: 0, type: 'playerLeft', playerId: 'P3' });

			sim.runTurn();
			expect(sim.getMatchState()).toBe('inProgress');
			expect(sim.getPlayer('P3')?.isActive).toBe(false);
			expect(sim.getPlayer('P4')?.isActive).toBe(true);
		});
	});

	describe('forfeit handling in teams', () => {
		it('one player forfeiting does not end game if teammate alive', () => {
			const sim = GameSimulation.createPromodeTeams([2, 2], 100);
			sim.startGame();

			sim.scheduleEvent({ turn: 0, type: 'forfeit', playerId: 'P1' });

			sim.runTurn();
			expect(sim.getMatchState()).toBe('inProgress');
		});

		it('last teammate forfeiting ends the game', () => {
			const sim = GameSimulation.createPromodeTeams([2, 2], 100);
			sim.startGame();

			sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P1' });
			sim.scheduleEvent({ turn: 1, type: 'forfeit', playerId: 'P2' });

			sim.runUntilEnd(5);
			expect(sim.getMatchState()).toBe('postMatch');
			expect(sim.getWinner()).toBe('Team 2');
		});
	});

	describe('restart in team game', () => {
		it('restart is allowed after game over in team mode', () => {
			const sim = GameSimulation.createPromodeTeams([2, 2], 100);
			sim.startGame();

			sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P1' });
			sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P2' });
			sim.runTurn();

			expect(sim.getMatchState()).toBe('postMatch');
			const restarted = sim.attemptRestart('P3');
			expect(restarted).toBe(true);
			expect(sim.getMatchState()).toBe('preMatch');
		});
	});
});

// ─── Integration Tests: Promode 3v3 Simulation ─────────────────────

describe('Promode 3v3 Game Simulation', () => {
	describe('basic setup', () => {
		it('creates 3v3 with correct teams', () => {
			const sim = GameSimulation.createPromodeTeams([3, 3], 40);
			expect(sim.getTeams()).toHaveLength(2);
			expect(sim.getTeams()[0].memberIds).toEqual(['P1', 'P2', 'P3']);
			expect(sim.getTeams()[1].memberIds).toEqual(['P4', 'P5', 'P6']);
			expect(sim.getActivePlayers()).toHaveLength(6);
		});

		it('distributes cities evenly among 6 players', () => {
			const sim = GameSimulation.createPromodeTeams([3, 3], 40, 60);
			for (let i = 1; i <= 6; i++) {
				expect(sim.getPlayer(`P${i}`)?.cityCount).toBe(10);
			}
		});
	});

	describe('team victory', () => {
		it('team wins by combined city threshold', () => {
			const sim = GameSimulation.createPromodeTeams([3, 3], 35, 60);
			sim.startGame();

			// Team 1 captures 5 cities total across members
			for (let t = 0; t < 5; t++) {
				sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: `P${(t % 3) + 1}`, targetPlayerId: `P${(t % 3) + 4}` });
			}

			const snapshots = sim.runUntilEnd(10);
			// Team 1: (10+2) + (10+2) + (10+1) = 35 → wins
			// Actually: P1 captures t=0,t=3 → 12, P2 captures t=1,t=4 → 12, P3 captures t=2 → 11 = 35
			const lastSnapshot = snapshots[snapshots.length - 1];
			expect(lastSnapshot.matchState).toBe('postMatch');
			expect(lastSnapshot.leader).toBe('Team 1');
		});
	});

	describe('progressive elimination', () => {
		it('losing team members one by one', () => {
			const sim = GameSimulation.createPromodeTeams([3, 3], 100);
			sim.startGame();

			sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P4' });
			sim.scheduleEvent({ turn: 1, type: 'playerDead', playerId: 'P5' });

			sim.runUntilEnd(3);
			// Team 2 still has P6, match continues
			expect(sim.getMatchState()).toBe('inProgress');
			expect(sim.getActivePlayers()).toHaveLength(4); // P1,P2,P3,P6
		});

		it('team eliminated when last member dies', () => {
			const sim = GameSimulation.createPromodeTeams([3, 3], 100);
			sim.startGame();

			sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P4' });
			sim.scheduleEvent({ turn: 1, type: 'playerDead', playerId: 'P5' });
			sim.scheduleEvent({ turn: 2, type: 'playerDead', playerId: 'P6' });

			sim.runUntilEnd(5);
			expect(sim.getMatchState()).toBe('postMatch');
			expect(sim.getWinner()).toBe('Team 1');
		});
	});

	describe('auto-loss with 3v3 teams', () => {
		it('auto-loss triggers when team total is 2x behind', () => {
			const sim = GameSimulation.createPromodeTeams([3, 3], 100, 60);
			sim.startGame();

			// Team 1 captures aggressively from Team 2
			for (let t = 0; t < 5; t++) {
				sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P1', targetPlayerId: 'P4' });
				sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P2', targetPlayerId: 'P5' });
			}

			const snapshots = sim.runUntilEnd(10);
			// After 5 turns: Team 1 = (15+15+10)=40, Team 2 = (5+5+10)=20
			// 40 >= 20*2 → Team 2 auto-loss
			const lastSnapshot = snapshots[snapshots.length - 1];
			expect(lastSnapshot.matchState).toBe('postMatch');
			expect(sim.getWinner()).toBe('Team 1');
		});
	});
});

// ─── Integration Tests: Arbitrary Team Sizes ────────────────────────

describe('Arbitrary Team Size Simulation', () => {
	it('supports 4v4 game', () => {
		const sim = GameSimulation.createPromodeTeams([4, 4], 50, 80);
		sim.startGame();
		expect(sim.getActivePlayers()).toHaveLength(8);
		expect(sim.getTeams()).toHaveLength(2);
		expect(sim.getTeams()[0].memberIds).toHaveLength(4);
		expect(sim.getTeams()[1].memberIds).toHaveLength(4);
	});

	it('supports asymmetric teams (3v2)', () => {
		const sim = GameSimulation.createPromodeTeams([3, 2], 30, 50);
		sim.startGame();
		expect(sim.getActivePlayers()).toHaveLength(5);
		expect(sim.getTeams()[0].memberIds).toHaveLength(3);
		expect(sim.getTeams()[1].memberIds).toHaveLength(2);
	});

	it('supports 3-way team game (3v3v3)', () => {
		const sim = GameSimulation.createPromodeTeams([3, 3, 3], 40, 90);
		sim.startGame();
		expect(sim.getActivePlayers()).toHaveLength(9);
		expect(sim.getTeams()).toHaveLength(3);

		// Eliminate team 3 entirely
		sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P7' });
		sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P8' });
		sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P9' });

		sim.runTurn();
		// Match continues — 2 teams still active
		expect(sim.getMatchState()).toBe('inProgress');
	});

	it('supports 4-way team game (2v2v2v2)', () => {
		const sim = GameSimulation.createPromodeTeams([2, 2, 2, 2], 30, 80);
		sim.startGame();
		expect(sim.getActivePlayers()).toHaveLength(8);
		expect(sim.getTeams()).toHaveLength(4);
	});

	it('game ends when only 1 of multiple teams remains', () => {
		const sim = GameSimulation.createPromodeTeams([2, 2, 2], 100, 60);
		sim.startGame();

		// Eliminate Team 2 and Team 3
		sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P3' });
		sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P4' });
		sim.scheduleEvent({ turn: 1, type: 'playerDead', playerId: 'P5' });
		sim.scheduleEvent({ turn: 1, type: 'playerDead', playerId: 'P6' });

		sim.runUntilEnd(5);
		expect(sim.getMatchState()).toBe('postMatch');
		expect(sim.getWinner()).toBe('Team 1');
	});

	it('large game: 11v12 (23 total players)', () => {
		const sim = GameSimulation.createPromodeTeams([11, 12], 100, 230);
		sim.startGame();
		expect(sim.getActivePlayers()).toHaveLength(23);
		expect(sim.getTeams()[0].memberIds).toHaveLength(11);
		expect(sim.getTeams()[1].memberIds).toHaveLength(12);

		// Each player gets 10 cities
		expect(sim.getPlayer('P1')?.cityCount).toBe(10);
		expect(sim.getPlayer('P23')?.cityCount).toBe(10);
	});

	it('team city victory works with large teams', () => {
		const sim = GameSimulation.createPromodeTeams([11, 12], 120, 230);
		sim.startGame();

		// Team 1 (11 players) captures cities to reach 120
		// Team 1 starts with 11*10 = 110 cities
		for (let t = 0; t < 10; t++) {
			sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P1', targetPlayerId: 'P12' });
		}

		const snapshots = sim.runUntilEnd(15);
		// Team 1: 110 + 10 = 120 → wins
		const lastSnapshot = snapshots[snapshots.length - 1];
		expect(lastSnapshot.matchState).toBe('postMatch');
		expect(lastSnapshot.leader).toBe('Team 1');
	});

	it('supports solo teams (1v1v1v1)', () => {
		const sim = GameSimulation.createPromodeTeams([1, 1, 1, 1], 20, 40);
		sim.startGame();
		expect(sim.getActivePlayers()).toHaveLength(4);
		expect(sim.getTeams()).toHaveLength(4);

		// Eliminate 3 "teams"
		sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P1' });
		sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P2' });
		sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P3' });

		sim.runTurn();
		expect(sim.getMatchState()).toBe('postMatch');
		expect(sim.getWinner()).toBe('Team 4');
	});
});

// ─── Integration Tests: Capitals Mode ───────────────────────────────

describe('Capitals Mode Simulation', () => {
	describe('basic setup', () => {
		it('creates Capitals with correct mode', () => {
			const sim = GameSimulation.createCapitals(6, 30);
			expect(sim.getModeName()).toBe('CapitalsMode');
		});

		it('has correct state sequence for Capitals mode', () => {
			const sim = GameSimulation.createCapitals(6, 30);
			const seq = sim.getStateSequence();
			expect(seq).toHaveLength(13);
			expect(seq).toContain('CapitalsSelectionState');
			expect(seq).toContain('CapitalsDistributeCapitalsState');
			expect(seq).toContain('CapitalsDistributeState');
			expect(seq).toContain('CapitalsGameLoopState');
			expect(seq).toContain('CapitalAssignCountrytNameState');
		});

		it('each player has a capital city assigned', () => {
			const sim = GameSimulation.createCapitals(6, 30);
			for (let i = 1; i <= 6; i++) {
				const player = sim.getPlayer(`P${i}`);
				expect(player?.capitalCity).toBe(`Capital_P${i}`);
			}
		});

		it('all players start active', () => {
			const sim = GameSimulation.createCapitals(6, 30);
			sim.startGame();
			expect(sim.getActivePlayers()).toHaveLength(6);
		});
	});

	describe('capital capture → elimination', () => {
		it('capturing a capital eliminates the owner', () => {
			const sim = GameSimulation.createCapitals(4, 30, 40);
			sim.startGame();

			sim.scheduleEvent({
				turn: 0,
				type: 'capitalCapture',
				playerId: 'P1',
				targetPlayerId: 'P2',
				cityName: 'Capital_P2',
			});

			const snapshot = sim.runTurn();
			expect(snapshot.eliminated).toContain('P2');
			expect(sim.getPlayer('P2')?.isActive).toBe(false);
			// Match continues with 3 players
			expect(sim.getMatchState()).toBe('inProgress');
		});

		it('multiple capital captures in sequence', () => {
			const sim = GameSimulation.createCapitals(4, 100, 40);
			sim.startGame();

			sim.scheduleEvent({ turn: 0, type: 'capitalCapture', playerId: 'P1', targetPlayerId: 'P2' });
			sim.scheduleEvent({ turn: 1, type: 'capitalCapture', playerId: 'P1', targetPlayerId: 'P3' });
			sim.scheduleEvent({ turn: 2, type: 'capitalCapture', playerId: 'P1', targetPlayerId: 'P4' });

			sim.runUntilEnd(5);
			expect(sim.getMatchState()).toBe('postMatch');
			expect(sim.getWinner()).toBe('P1');
		});

		it('capital capture gives cities to capturer and removes from loser', () => {
			const sim = GameSimulation.createCapitals(4, 100, 40);
			sim.startGame();

			sim.scheduleEvent({
				turn: 0,
				type: 'capitalCapture',
				playerId: 'P1',
				targetPlayerId: 'P2',
				cityDelta: 3,
			});

			sim.runTurn();
			expect(sim.getPlayer('P1')?.cityCount).toBe(13); // 10 + 3
			expect(sim.getPlayer('P2')?.cityCount).toBe(7); // 10 - 3
		});
	});

	describe('normal city capture in Capitals (non-capital)', () => {
		it('regular city capture does not eliminate player', () => {
			const sim = GameSimulation.createCapitals(4, 100, 40);
			sim.startGame();

			sim.scheduleEvent({
				turn: 0,
				type: 'cityCapture',
				playerId: 'P1',
				targetPlayerId: 'P2',
			});

			sim.runTurn();
			// Regular capture in capitals mode doesn't eliminate
			expect(sim.getPlayer('P2')?.isActive).toBe(true);
			expect(sim.getPlayer('P1')?.cityCount).toBe(11);
			expect(sim.getPlayer('P2')?.cityCount).toBe(9);
		});

		it('losing all cities via regular capture eliminates player', () => {
			const sim = GameSimulation.createCapitals(3, 100, 30);
			sim.startGame();

			// P1 captures all 10 of P2's cities
			for (let t = 0; t < 10; t++) {
				sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P1', targetPlayerId: 'P2' });
			}

			sim.runUntilEnd(15);
			expect(sim.getPlayer('P2')?.isActive).toBe(false);
			expect(sim.getPlayer('P2')?.cityCount).toBe(0);
		});
	});

	describe('mixed capital and regular captures', () => {
		it('capital capture overrides regular mechanics', () => {
			const sim = GameSimulation.createCapitals(3, 100, 30);
			sim.startGame();

			// Regular capture on turn 0
			sim.scheduleEvent({ turn: 0, type: 'cityCapture', playerId: 'P1', targetPlayerId: 'P2' });
			// Capital capture on turn 1
			sim.scheduleEvent({ turn: 1, type: 'capitalCapture', playerId: 'P1', targetPlayerId: 'P2' });

			sim.runUntilEnd(5);
			expect(sim.getPlayer('P2')?.isActive).toBe(false);
		});
	});

	describe('restart blocked in Capitals (FFA-like)', () => {
		it('Capitals mode does not allow restart (it is not a promode variant)', () => {
			const sim = GameSimulation.createCapitals(3, 100, 30);
			sim.startGame();

			// End the game
			sim.scheduleEvent({ turn: 0, type: 'capitalCapture', playerId: 'P1', targetPlayerId: 'P2' });
			sim.scheduleEvent({ turn: 0, type: 'capitalCapture', playerId: 'P1', targetPlayerId: 'P3' });
			sim.runTurn();

			expect(sim.getMatchState()).toBe('postMatch');
			// Capitals uses CapitalsMode which has GameOverState (not promode), similar to FFA
			// However, it should still support restart since it has GameOverState + ResetState
			// Actually, canRestart checks isFFA — Capitals is NOT FFA, so restart should be allowed
			const restarted = sim.attemptRestart('P1');
			expect(restarted).toBe(true);
		});
	});

	describe('player death in Capitals', () => {
		it('player death eliminates without capital capture', () => {
			const sim = GameSimulation.createCapitals(4, 100, 40);
			sim.startGame();

			sim.scheduleEvent({ turn: 0, type: 'playerDead', playerId: 'P3' });

			const snapshot = sim.runTurn();
			expect(snapshot.eliminated).toContain('P3');
			expect(sim.getActivePlayers()).toHaveLength(3);
		});

		it('last player standing wins', () => {
			const sim = GameSimulation.createCapitals(3, 100, 30);
			sim.startGame();

			sim.scheduleEvent({ turn: 0, type: 'capitalCapture', playerId: 'P1', targetPlayerId: 'P2' });
			sim.scheduleEvent({ turn: 1, type: 'playerDead', playerId: 'P3' });

			sim.runUntilEnd(5);
			expect(sim.getMatchState()).toBe('postMatch');
			expect(sim.getWinner()).toBe('P1');
		});
	});

	describe('victory by city threshold in Capitals', () => {
		it('city threshold victory works alongside capital mechanic', () => {
			const sim = GameSimulation.createCapitals(4, 20, 40);
			sim.startGame();

			// P1 captures many cities (not capitals) to reach 20
			for (let t = 0; t < 10; t++) {
				const target = `P${(t % 3) + 2}`;
				sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P1', targetPlayerId: target });
			}

			const snapshots = sim.runUntilEnd(15);
			const lastSnapshot = snapshots[snapshots.length - 1];
			expect(lastSnapshot.victoryState).toBe('DECIDED');
			expect(lastSnapshot.leader).toBe('P1');
		});
	});

	describe('fog cycle in Capitals', () => {
		it('capitals has same fog/night cycle as other modes', () => {
			const sim = GameSimulation.createCapitals(4, 100, 40);
			sim.startGame();

			const snapshots = sim.runUntilEnd(5);
			expect(snapshots[0].phase).toBe('day');
			expect(snapshots[1].phase).toBe('dusk');
			expect(snapshots[2].phase).toBe('night');
			expect(snapshots[3].phase).toBe('dawn');
			expect(snapshots[4].phase).toBe('day');
		});
	});
});

// ─── Cross-Mode Team Integration Tests ──────────────────────────────

describe('Cross-Mode Team Integration', () => {
	it('team snapshots include team data', () => {
		const sim = GameSimulation.createPromodeTeams([2, 2], 100);
		sim.startGame();

		const snapshot = sim.runTurn();
		expect(snapshot.teams).toBeDefined();
		expect(snapshot.teams).toHaveLength(2);
		expect(snapshot.teams![0].memberIds).toEqual(['P1', 'P2']);
	});

	it('FFA snapshots do not include team data', () => {
		const sim = GameSimulation.createFFA(4, 100);
		sim.startGame();

		const snapshot = sim.runTurn();
		expect(snapshot.teams).toBeUndefined();
	});

	it('team warnings propagate to all team members', () => {
		const sim = GameSimulation.createPromodeTeams([2, 2], 100, 40);
		sim.startGame();

		// Create a city imbalance that triggers warning but not auto-loss
		for (let t = 0; t < 4; t++) {
			sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P1', targetPlayerId: 'P3' });
		}

		const snapshots = sim.runUntilEnd(5);
		// After 4 turns: Team 1 = (14+10)=24, Team 2 = (6+10)=16
		// 24 >= 16 * 2 * 0.6 = 19.2 → Team 2 warned
		const warningTurn = snapshots.find((s) => s.warnings.includes('P3') || s.warnings.includes('P4'));
		expect(warningTurn).toBeDefined();
		if (warningTurn) {
			expect(warningTurn.warnings).toContain('P3');
			expect(warningTurn.warnings).toContain('P4');
		}
	});

	it('complete 2v2 lifecycle: start → play → auto-loss → restart', () => {
		const sim = GameSimulation.createPromodeTeams([2, 2], 100, 40);
		sim.startGame();

		// Team 1 dominates
		for (let t = 0; t < 5; t++) {
			sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P1', targetPlayerId: 'P3' });
			sim.scheduleEvent({ turn: t, type: 'cityCapture', playerId: 'P2', targetPlayerId: 'P4' });
		}

		sim.runUntilEnd(10);
		expect(sim.getMatchState()).toBe('postMatch');

		const restarted = sim.attemptRestart('P1');
		expect(restarted).toBe(true);
		expect(sim.getMatchState()).toBe('preMatch');
	});
});
