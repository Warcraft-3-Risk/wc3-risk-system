/**
 * Pure game simulation logic — no WC3 API dependencies.
 *
 * Models complete game flows for FFA (StandardMode) and Promode 1v1
 * (PromodeMode) so that state transitions, turn progression, victory
 * conditions, and player events can be tested without the WC3 runtime.
 *
 * The logic here mirrors the production code in:
 *   - GameLoopState (turn ticking, fog cycle, victory checks)
 *   - ProModeGameLoopState (auto-loss at 2x deficit)
 *   - GameOverState (restart handling)
 *   - BaseState (player event routing, elimination)
 *   - EventCoordinator (mode selection → state machine)
 */

import {
	type GameModeName,
	type MatchState,
	type PlayerEvent,
	getStateSequence,
	resolveGameMode,
	transitionMatchState,
	canRestart,
	resolvePlayerEvent,
	PROMODE_SETTING,
} from './game-mode-logic';

// ─── Turn Progression ───────────────────────────────────────────────

export interface TurnResult {
	newTickCounter: number;
	turnEnded: boolean;
	newTurnNumber: number;
}

/**
 * Processes a single game tick.
 * Mirrors the timer callback in GameLoopState.onEnterState():
 *   tickCounter-- → if ≤ 0, end turn and start next.
 */
export function processTick(tickCounter: number, turnNumber: number, turnDuration: number): TurnResult {
	const newTick = tickCounter - 1;

	if (newTick <= 0) {
		return {
			newTickCounter: turnDuration,
			turnEnded: true,
			newTurnNumber: turnNumber + 1,
		};
	}

	return {
		newTickCounter: newTick,
		turnEnded: false,
		newTurnNumber: turnNumber,
	};
}

// ─── Day/Night Fog Cycle ────────────────────────────────────────────

export type DayPhase = 'day' | 'dusk' | 'night' | 'dawn';

/**
 * Determines the day/night phase for a given turn.
 * Mirrors GameLoopState.updateFogSettings():
 *   Turn 0: always day (first turn special case)
 *   Turn 1+: (turn - 1) % 4 → 0=dusk, 1=night, 2=dawn, 3=day
 */
export function getDayPhase(turn: number): DayPhase {
	if (turn === 0) return 'day';

	const phase = (turn - 1) % 4;
	switch (phase) {
		case 0:
			return 'dusk';
		case 1:
			return 'night';
		case 2:
			return 'dawn';
		case 3:
			return 'day';
		default:
			return 'day';
	}
}

/**
 * Returns the WC3 time-of-day value for a given phase.
 */
export function getTimeOfDay(phase: DayPhase): number {
	switch (phase) {
		case 'day':
			return 12.0;
		case 'dusk':
			return 18.0;
		case 'night':
			return 0.0;
		case 'dawn':
			return 6.0;
	}
}

/**
 * Whether fog-of-war is active during a given phase.
 * Fog is on during dusk and night, off during dawn and day.
 */
export function isFogActive(phase: DayPhase): boolean {
	return phase === 'dusk' || phase === 'night';
}

// ─── Victory Check ──────────────────────────────────────────────────

export type VictoryState = 'UNDECIDED' | 'TIE' | 'DECIDED';

/**
 * Check victory conditions based on city counts.
 * Mirrors VictoryManager.updateAndGetGameState():
 *   - If one participant has ≥ citiesToWin with a clear lead → DECIDED
 *   - If multiple participants are tied at ≥ citiesToWin → TIE
 *   - Otherwise → UNDECIDED
 */
export function checkVictory(
	cityCounts: Map<string, number>,
	citiesToWin: number,
): { state: VictoryState; leader: string | undefined } {
	let maxCount = 0;
	let leader: string | undefined;
	let tiedAtMax = 0;

	for (const [playerId, count] of cityCounts) {
		if (count > maxCount) {
			maxCount = count;
			leader = playerId;
			tiedAtMax = 1;
		} else if (count === maxCount) {
			tiedAtMax++;
		}
	}

	if (maxCount >= citiesToWin) {
		if (tiedAtMax > 1) {
			return { state: 'TIE', leader: undefined };
		}
		return { state: 'DECIDED', leader };
	}

	return { state: 'UNDECIDED', leader };
}

/**
 * Whether the match should end because only 1 (or 0) active players remain.
 * Mirrors GameLoopState.endIfLastActivePlayer().
 */
export function shouldMatchEnd(activePlayerCount: number): boolean {
	return activePlayerCount <= 1;
}

// ─── Promode Auto-Loss ──────────────────────────────────────────────

export interface PromodeAutoLossResult {
	/** Players that should be eliminated due to 2x city deficit */
	eliminated: string[];
	/** Players that received a warning (approaching 2x deficit) */
	warnings: string[];
}

/**
 * Check promode auto-loss conditions at end of turn.
 * Mirrors ProModeGameLoopState.onEndTurn():
 *   - If opponent has ≥ 2x your cities → eliminated
 *   - If opponent has ≥ 2x * warningRatio your cities → warning
 */
export function checkPromodeAutoLoss(
	participants: { id: string; cityCount: number }[],
	warningRatio: number,
): PromodeAutoLossResult {
	const eliminated: string[] = [];
	const warnings: string[] = [];

	for (const participant of participants) {
		const opponents = participants.filter((p) => p.id !== participant.id);
		const opponentTotal = opponents.reduce((sum, p) => sum + p.cityCount, 0);

		if (opponentTotal >= participant.cityCount * 2) {
			eliminated.push(participant.id);
		} else if (opponentTotal >= participant.cityCount * 2 * warningRatio) {
			warnings.push(participant.id);
		}
	}

	return { eliminated, warnings };
}

// ─── Player Elimination ─────────────────────────────────────────────

export interface EliminationResult {
	playerEliminated: boolean;
	shouldCheckVictory: boolean;
	shouldApplyDebuff: boolean;
	matchShouldEnd: boolean;
}

/**
 * Process a player elimination event.
 * Mirrors the flow through BaseState.onPlayerDead() → GameLoopState.onPlayerDead().
 */
export function processElimination(
	isFFA: boolean,
	activePlayersRemaining: number,
): EliminationResult {
	return {
		playerEliminated: true,
		shouldCheckVictory: true,
		shouldApplyDebuff: isFFA,
		matchShouldEnd: activePlayersRemaining <= 1,
	};
}

// ─── Game Simulation ────────────────────────────────────────────────

export interface SimPlayer {
	id: string;
	cityCount: number;
	isActive: boolean;
	isHuman: boolean;
	/** Team number (undefined for FFA) */
	teamId?: number;
	/** For Capitals mode: the capital city assigned to this player */
	capitalCity?: string;
}

export interface SimTeam {
	id: number;
	memberIds: string[];
	/** Whether the team still has active members */
	isActive: boolean;
}

export type SimMode = 'FFA' | 'Promode1v1' | 'PromodeTeam' | 'Capitals';

export interface SimConfig {
	mode: SimMode;
	playerCount: number;
	citiesToWin: number;
	turnDuration: number;
	nightFogEnabled: boolean;
	/** Warning ratio for promode auto-loss (default 0.6 from CITIES_TO_WIN_WARNING_RATIO) */
	warningRatio: number;
	/** Team assignments: array of arrays of player IDs (e.g. [['P1','P2'], ['P3','P4']]) */
	teams?: string[][];
}

export interface SimEvent {
	turn: number;
	tick?: number;
	type: 'playerDead' | 'playerLeft' | 'cityCapture' | 'forfeit' | 'restart' | 'capitalCapture';
	playerId: string;
	/** For cityCapture: the player gaining cities / losing cities */
	targetPlayerId?: string;
	/** For cityCapture: number of cities changing hands (default 1) */
	cityDelta?: number;
	/** For capitalCapture: the city name being captured */
	cityName?: string;
}

export interface SimTurnSnapshot {
	turn: number;
	phase: DayPhase;
	fogActive: boolean;
	players: SimPlayer[];
	teams?: SimTeam[];
	matchState: MatchState;
	victoryState: VictoryState;
	/** For FFA/Capitals: player ID. For team games: team ID as string (e.g. "Team 1") */
	leader: string | undefined;
	eliminated: string[];
	warnings: string[];
}

// ─── Team Victory Check ─────────────────────────────────────────────

/**
 * Check victory conditions based on team city counts.
 * Mirrors VictoryManager with team aggregation:
 *   - Each team's city count = sum of its active members' cities
 *   - If one team has ≥ citiesToWin with a clear lead → DECIDED
 *   - If multiple teams are tied at ≥ citiesToWin → TIE
 */
export function checkTeamVictory(
	teams: SimTeam[],
	players: Map<string, SimPlayer>,
	citiesToWin: number,
): { state: VictoryState; leaderTeamId: number | undefined } {
	let maxCount = 0;
	let leaderTeamId: number | undefined;
	let tiedAtMax = 0;

	for (const team of teams) {
		if (!team.isActive) continue;
		const teamCities = team.memberIds.reduce((sum, id) => {
			const p = players.get(id);
			return sum + (p ? p.cityCount : 0);
		}, 0);

		if (teamCities > maxCount) {
			maxCount = teamCities;
			leaderTeamId = team.id;
			tiedAtMax = 1;
		} else if (teamCities === maxCount && teamCities > 0) {
			tiedAtMax++;
		}
	}

	if (maxCount >= citiesToWin) {
		if (tiedAtMax > 1) {
			return { state: 'TIE', leaderTeamId: undefined };
		}
		return { state: 'DECIDED', leaderTeamId };
	}

	return { state: 'UNDECIDED', leaderTeamId };
}

/**
 * Check promode auto-loss conditions for team games.
 * Each team's total city count is compared against each opponent team's total.
 * If opponent total ≥ 2x team's total → team is eliminated.
 */
export function checkTeamPromodeAutoLoss(
	teams: SimTeam[],
	players: Map<string, SimPlayer>,
	warningRatio: number,
): PromodeAutoLossResult {
	const eliminated: string[] = [];
	const warnings: string[] = [];

	const activeTeams = teams.filter((t) => t.isActive);
	const teamCities = new Map<number, number>();

	for (const team of activeTeams) {
		const total = team.memberIds.reduce((sum, id) => {
			const p = players.get(id);
			return sum + (p ? p.cityCount : 0);
		}, 0);
		teamCities.set(team.id, total);
	}

	for (const team of activeTeams) {
		const myCities = teamCities.get(team.id) ?? 0;
		const opponentCities = activeTeams
			.filter((t) => t.id !== team.id)
			.reduce((sum, t) => sum + (teamCities.get(t.id) ?? 0), 0);

		if (opponentCities >= myCities * 2) {
			// Eliminate all active members of this team
			for (const memberId of team.memberIds) {
				const p = players.get(memberId);
				if (p?.isActive) eliminated.push(memberId);
			}
		} else if (opponentCities >= myCities * 2 * warningRatio) {
			// Warn all active members
			for (const memberId of team.memberIds) {
				const p = players.get(memberId);
				if (p?.isActive) warnings.push(memberId);
			}
		}
	}

	return { eliminated, warnings };
}

/**
 * Whether a team should be marked inactive.
 * A team is eliminated when all its members are inactive.
 */
export function isTeamEliminated(team: SimTeam, players: Map<string, SimPlayer>): boolean {
	return team.memberIds.every((id) => {
		const p = players.get(id);
		return !p || !p.isActive;
	});
}

/**
 * Count active teams remaining.
 */
export function countActiveTeams(teams: SimTeam[], players: Map<string, SimPlayer>): number {
	return teams.filter((t) => !isTeamEliminated(t, players)).length;
}

/**
 * Pure game simulation engine.
 *
 * Models a complete game from mode selection through termination.
 * Supports FFA, Promode (1v1, 2v2, 3v3, NvN up to 23 players),
 * and Capitals mode. All state transitions, victory checks, and
 * player events are resolved using the pure logic functions above — no WC3 API.
 */
export class GameSimulation {
	private config: SimConfig;
	private players: Map<string, SimPlayer>;
	private teams: SimTeam[];
	private matchState: MatchState;
	private victoryState: VictoryState;
	private leader: string | undefined;
	private turnNumber: number;
	private tickCounter: number;
	private events: SimEvent[];
	private stateSequence: string[];
	private currentStateIndex: number;
	private modeName: GameModeName;
	private snapshots: SimTurnSnapshot[];

	private constructor(config: SimConfig) {
		this.config = config;
		this.players = new Map();
		this.teams = [];
		this.matchState = 'modeSelection';
		this.victoryState = 'UNDECIDED';
		this.leader = undefined;
		this.turnNumber = 0;
		this.tickCounter = config.turnDuration;
		this.events = [];
		this.snapshots = [];
		this.currentStateIndex = 0;

		// Resolve mode
		if (config.mode === 'Capitals') {
			this.modeName = resolveGameMode({
				gameType: 'Capitals',
				isW3CMode: false,
				promodeSetting: PROMODE_SETTING.OFF,
			});
		} else if (config.mode === 'Promode1v1' || config.mode === 'PromodeTeam') {
			this.modeName = resolveGameMode({
				gameType: 'Standard',
				isW3CMode: false,
				promodeSetting: PROMODE_SETTING.PROMODE,
			});
		} else {
			this.modeName = resolveGameMode({
				gameType: 'Standard',
				isW3CMode: false,
				promodeSetting: PROMODE_SETTING.OFF,
			});
		}

		this.stateSequence = getStateSequence(this.modeName);
	}

	/** Whether this is a team game (non-FFA, non-Capitals-FFA) */
	private isTeamGame(): boolean {
		return this.teams.length > 0;
	}

	/** Whether this mode uses promode auto-loss checks */
	private isPromodeMode(): boolean {
		return this.config.mode === 'Promode1v1' || this.config.mode === 'PromodeTeam';
	}

	/** Whether this is FFA */
	private isFFA(): boolean {
		return this.config.mode === 'FFA';
	}

	/**
	 * Create a FFA (Standard mode) simulation.
	 * Cities are distributed evenly among players initially.
	 */
	static createFFA(playerCount: number, citiesToWin: number, totalCities?: number): GameSimulation {
		const sim = new GameSimulation({
			mode: 'FFA',
			playerCount,
			citiesToWin,
			turnDuration: 60,
			nightFogEnabled: true,
			warningRatio: 0.6,
		});

		const citiesPerPlayer = Math.floor((totalCities ?? playerCount * 5) / playerCount);
		for (let i = 0; i < playerCount; i++) {
			sim.players.set(`P${i + 1}`, {
				id: `P${i + 1}`,
				cityCount: citiesPerPlayer,
				isActive: true,
				isHuman: true,
			});
		}

		return sim;
	}

	/**
	 * Create a Promode 1v1 simulation.
	 */
	static createPromode1v1(citiesToWin: number, totalCities?: number): GameSimulation {
		const sim = new GameSimulation({
			mode: 'Promode1v1',
			playerCount: 2,
			citiesToWin,
			turnDuration: 60,
			nightFogEnabled: true,
			warningRatio: 0.6,
		});

		const citiesPerPlayer = Math.floor((totalCities ?? 40) / 2);
		sim.players.set('P1', { id: 'P1', cityCount: citiesPerPlayer, isActive: true, isHuman: true });
		sim.players.set('P2', { id: 'P2', cityCount: citiesPerPlayer, isActive: true, isHuman: true });

		return sim;
	}

	/**
	 * Create a Promode team game simulation (2v2, 3v3, NvN).
	 * @param teamSizes Array of team sizes, e.g. [2, 2] for 2v2, [3, 3] for 3v3
	 * @param citiesToWin City threshold for team victory (summed across team members)
	 * @param totalCities Total cities on the map (distributed evenly among all players)
	 */
	static createPromodeTeams(
		teamSizes: number[],
		citiesToWin: number,
		totalCities?: number,
	): GameSimulation {
		const totalPlayers = teamSizes.reduce((a, b) => a + b, 0);
		const teams: string[][] = [];

		const sim = new GameSimulation({
			mode: 'PromodeTeam',
			playerCount: totalPlayers,
			citiesToWin,
			turnDuration: 60,
			nightFogEnabled: true,
			warningRatio: 0.6,
			teams: [],
		});

		const citiesPerPlayer = Math.floor((totalCities ?? totalPlayers * 5) / totalPlayers);
		let playerIndex = 1;

		for (let t = 0; t < teamSizes.length; t++) {
			const teamMembers: string[] = [];
			for (let m = 0; m < teamSizes[t]; m++) {
				const id = `P${playerIndex}`;
				sim.players.set(id, {
					id,
					cityCount: citiesPerPlayer,
					isActive: true,
					isHuman: true,
					teamId: t + 1,
				});
				teamMembers.push(id);
				playerIndex++;
			}
			teams.push(teamMembers);
		}

		sim.config.teams = teams;

		// Create team objects
		for (let t = 0; t < teams.length; t++) {
			sim.teams.push({
				id: t + 1,
				memberIds: teams[t],
				isActive: true,
			});
		}

		return sim;
	}

	/**
	 * Create a Capitals mode simulation.
	 * Each player gets a capital city. Losing your capital = elimination.
	 */
	static createCapitals(
		playerCount: number,
		citiesToWin: number,
		totalCities?: number,
	): GameSimulation {
		const sim = new GameSimulation({
			mode: 'Capitals',
			playerCount,
			citiesToWin,
			turnDuration: 60,
			nightFogEnabled: true,
			warningRatio: 0.6,
		});

		const citiesPerPlayer = Math.floor((totalCities ?? playerCount * 5) / playerCount);
		for (let i = 0; i < playerCount; i++) {
			sim.players.set(`P${i + 1}`, {
				id: `P${i + 1}`,
				cityCount: citiesPerPlayer,
				isActive: true,
				isHuman: true,
				capitalCity: `Capital_P${i + 1}`,
			});
		}

		return sim;
	}

	/**
	 * Schedule an event to occur at a specific turn.
	 */
	scheduleEvent(event: SimEvent): void {
		this.events.push(event);
	}

	/**
	 * Transition the match through the pre-game states up to GameLoop.
	 * Mirrors: mode selection → UpdatePlayerStatus → Setup → ... → GameLoop enters.
	 */
	startGame(): void {
		// Mode selection → preMatch
		this.matchState = transitionMatchState('modeSelection', 'setupComplete') ?? 'preMatch';

		// Pre-game states advance until GameLoop
		const gameLoopVariants = ['GameLoopState', 'ProModeGameLoopState', 'CapitalsGameLoopState'];
		for (let i = 0; i < this.stateSequence.length; i++) {
			this.currentStateIndex = i;
			if (gameLoopVariants.includes(this.stateSequence[i])) {
				break;
			}
		}

		// Enter GameLoop → inProgress
		this.matchState = transitionMatchState('preMatch', 'gameLoopEnter') ?? 'inProgress';
		this.turnNumber = 0;
		this.tickCounter = this.config.turnDuration;
	}

	/**
	 * Run one complete turn and return a snapshot.
	 */
	runTurn(): SimTurnSnapshot {
		if (this.matchState !== 'inProgress') {
			return this.takeSnapshot([]);
		}

		const turnEliminated: string[] = [];
		const turnWarnings: string[] = [];

		// Process events scheduled for this turn
		const turnEvents = this.events.filter((e) => e.turn === this.turnNumber);
		for (const event of turnEvents) {
			this.processEvent(event, turnEliminated);
		}

		// Check if match should end after events
		if (this.matchState !== 'inProgress') {
			const snapshot = this.takeSnapshot(turnEliminated);
			this.snapshots.push(snapshot);
			return snapshot;
		}

		// Update team active status
		this.updateTeamStatus();

		// Check victory conditions (city count) — team or FFA
		if (this.isTeamGame()) {
			const teamVictory = checkTeamVictory(this.teams, this.players, this.config.citiesToWin);
			this.victoryState = teamVictory.state;
			this.leader = teamVictory.leaderTeamId !== undefined ? `Team ${teamVictory.leaderTeamId}` : undefined;

			if (this.victoryState === 'DECIDED') {
				this.matchState = 'postMatch';
			}

			// Check if only 1 active team remains
			const activeTeamCount = countActiveTeams(this.teams, this.players);
			if (activeTeamCount <= 1 && this.matchState === 'inProgress') {
				const remainingTeam = this.teams.find((t) => !isTeamEliminated(t, this.players));
				if (remainingTeam) {
					this.leader = `Team ${remainingTeam.id}`;
					this.victoryState = 'DECIDED';
				}
				this.matchState = 'postMatch';
			}
		} else {
			const cityCounts = new Map<string, number>();
			for (const [id, player] of this.players) {
				if (player.isActive) {
					cityCounts.set(id, player.cityCount);
				}
			}

			const victory = checkVictory(cityCounts, this.config.citiesToWin);
			this.victoryState = victory.state;
			this.leader = victory.leader;

			if (this.victoryState === 'DECIDED') {
				this.matchState = 'postMatch';
			}
		}

		// Promode auto-loss check at end of turn
		if (this.isPromodeMode() && this.matchState === 'inProgress') {
			if (this.isTeamGame()) {
				const autoLoss = checkTeamPromodeAutoLoss(this.teams, this.players, this.config.warningRatio);

				for (const eliminatedId of autoLoss.eliminated) {
					const player = this.players.get(eliminatedId);
					if (player && player.isActive) {
						player.isActive = false;
						turnEliminated.push(eliminatedId);
					}
				}
				turnWarnings.push(...autoLoss.warnings);

				// Re-check team status and match end
				this.updateTeamStatus();
				const activeTeamCount = countActiveTeams(this.teams, this.players);
				if (activeTeamCount <= 1) {
					const remaining = this.teams.find((t) => !isTeamEliminated(t, this.players));
					this.leader = remaining ? `Team ${remaining.id}` : undefined;
					this.victoryState = 'DECIDED';
					this.matchState = 'postMatch';
				}
			} else {
				const activeParticipants = Array.from(this.players.values())
					.filter((p) => p.isActive)
					.map((p) => ({ id: p.id, cityCount: p.cityCount }));

				const autoLoss = checkPromodeAutoLoss(activeParticipants, this.config.warningRatio);

				for (const eliminatedId of autoLoss.eliminated) {
					const player = this.players.get(eliminatedId);
					if (player) {
						player.isActive = false;
						turnEliminated.push(eliminatedId);
					}
				}
				turnWarnings.push(...autoLoss.warnings);

				// Re-check if match should end after auto-loss
				const activeCount = Array.from(this.players.values()).filter((p) => p.isActive).length;
				if (shouldMatchEnd(activeCount)) {
					const remaining = Array.from(this.players.values()).find((p) => p.isActive);
					this.leader = remaining?.id;
					this.victoryState = 'DECIDED';
					this.matchState = 'postMatch';
				}
			}
		}

		const snapshot = this.takeSnapshot(turnEliminated, turnWarnings);
		this.snapshots.push(snapshot);

		// Advance to next turn
		if (this.matchState === 'inProgress') {
			this.turnNumber++;
		}

		return snapshot;
	}

	/**
	 * Run the simulation until the match ends or maxTurns is reached.
	 */
	runUntilEnd(maxTurns: number): SimTurnSnapshot[] {
		const results: SimTurnSnapshot[] = [];

		for (let t = 0; t < maxTurns; t++) {
			const snapshot = this.runTurn();
			results.push(snapshot);

			if (this.matchState !== 'inProgress') {
				break;
			}
		}

		return results;
	}

	/**
	 * Attempt to restart the game after it ends.
	 * Returns whether the restart was accepted.
	 */
	attemptRestart(playerId: string): boolean {
		const humanCount = Array.from(this.players.values()).filter((p) => p.isHuman).length;
		const result = canRestart(this.matchState, this.isFFA(), humanCount);

		if (result === 'allowed') {
			// Transition through postMatch → resetComplete → preMatch
			this.matchState = transitionMatchState('postMatch', 'resetComplete') ?? 'preMatch';
			return true;
		}

		return false;
	}

	// ─── Accessors ──────────────────────────────────────────────────

	getMatchState(): MatchState {
		return this.matchState;
	}

	getActivePlayers(): SimPlayer[] {
		return Array.from(this.players.values()).filter((p) => p.isActive);
	}

	getPlayer(id: string): SimPlayer | undefined {
		return this.players.get(id);
	}

	getWinner(): string | undefined {
		return this.leader;
	}

	getModeName(): GameModeName {
		return this.modeName;
	}

	getStateSequence(): string[] {
		return [...this.stateSequence];
	}

	getTurnNumber(): number {
		return this.turnNumber;
	}

	getVictoryState(): VictoryState {
		return this.victoryState;
	}

	getSnapshots(): SimTurnSnapshot[] {
		return [...this.snapshots];
	}

	getTeams(): SimTeam[] {
		return this.teams.map((t) => ({ ...t, memberIds: [...t.memberIds] }));
	}

	// ─── Internal ───────────────────────────────────────────────────

	/** Update team isActive flags based on member status */
	private updateTeamStatus(): void {
		for (const team of this.teams) {
			team.isActive = !isTeamEliminated(team, this.players);
		}
	}

	/** Check if match should end (team or FFA) and update state accordingly */
	private checkMatchEnd(turnEliminated: string[]): void {
		if (this.isTeamGame()) {
			this.updateTeamStatus();
			const activeTeamCount = countActiveTeams(this.teams, this.players);
			if (activeTeamCount <= 1) {
				const remaining = this.teams.find((t) => !isTeamEliminated(t, this.players));
				this.leader = remaining ? `Team ${remaining.id}` : undefined;
				this.victoryState = 'DECIDED';
				this.matchState = 'postMatch';
			}
		} else {
			const activeCount = Array.from(this.players.values()).filter((p) => p.isActive).length;
			const result = processElimination(this.isFFA(), activeCount);
			if (result.matchShouldEnd) {
				const remaining = Array.from(this.players.values()).find((p) => p.isActive);
				this.leader = remaining?.id;
				this.victoryState = 'DECIDED';
				this.matchState = 'postMatch';
			}
		}
	}

	private processEvent(event: SimEvent, turnEliminated: string[]): void {
		switch (event.type) {
			case 'cityCapture': {
				const capturer = this.players.get(event.playerId);
				const loser = event.targetPlayerId ? this.players.get(event.targetPlayerId) : undefined;
				const delta = event.cityDelta ?? 1;

				if (capturer) capturer.cityCount += delta;
				if (loser) {
					loser.cityCount = Math.max(0, loser.cityCount - delta);
					// If a player loses all cities, they are eliminated
					if (loser.cityCount === 0 && loser.isActive) {
						loser.isActive = false;
						turnEliminated.push(loser.id);
						this.checkMatchEnd(turnEliminated);
					}
				}
				break;
			}

			case 'capitalCapture': {
				// Capitals mode: capturing a capital eliminates the owner
				const capturer = this.players.get(event.playerId);
				const loser = event.targetPlayerId ? this.players.get(event.targetPlayerId) : undefined;
				const delta = event.cityDelta ?? 1;

				if (capturer) capturer.cityCount += delta;
				if (loser) {
					loser.cityCount = Math.max(0, loser.cityCount - delta);

					// The capital is captured — eliminate the player
					if (loser.isActive) {
						loser.isActive = false;
						turnEliminated.push(loser.id);
						this.checkMatchEnd(turnEliminated);
					}
				}
				break;
			}

			case 'playerDead':
			case 'playerLeft': {
				const player = this.players.get(event.playerId);
				if (player && player.isActive) {
					player.isActive = false;
					turnEliminated.push(event.playerId);
					this.checkMatchEnd(turnEliminated);
				}
				break;
			}

			case 'forfeit': {
				const player = this.players.get(event.playerId);
				if (player && player.isActive) {
					player.isActive = false;
					turnEliminated.push(event.playerId);

					if (this.isTeamGame()) {
						this.checkMatchEnd(turnEliminated);
					} else {
						const activeCount = Array.from(this.players.values()).filter((p) => p.isActive).length;
						const eventResult = resolvePlayerEvent(
							'forfeit',
							this.matchState,
							this.isFFA(),
							activeCount,
							Array.from(this.players.values()).filter((p) => p.isHuman && p.isActive).length,
						);

						if (eventResult.shouldTransitionToPostMatch) {
							const remaining = Array.from(this.players.values()).find((p) => p.isActive);
							this.leader = remaining?.id;
							this.victoryState = 'DECIDED';
							this.matchState = 'postMatch';
						}
					}
				}
				break;
			}

			case 'restart': {
				const humanCount = Array.from(this.players.values()).filter((p) => p.isHuman && p.isActive).length;
				const restartResult = canRestart(this.matchState, this.isFFA(), humanCount);

				if (restartResult === 'triggerPostMatch') {
					this.matchState = 'postMatch';
				}
				break;
			}
		}
	}

	private takeSnapshot(eliminated: string[], warnings: string[] = []): SimTurnSnapshot {
		const phase = this.config.nightFogEnabled ? getDayPhase(this.turnNumber) : 'day';

		return {
			turn: this.turnNumber,
			phase,
			fogActive: this.config.nightFogEnabled ? isFogActive(phase) : false,
			players: Array.from(this.players.values()).map((p) => ({ ...p })),
			teams: this.teams.length > 0 ? this.teams.map((t) => ({ ...t, memberIds: [...t.memberIds] })) : undefined,
			matchState: this.matchState,
			victoryState: this.victoryState,
			leader: this.leader,
			eliminated,
			warnings,
		};
	}
}
