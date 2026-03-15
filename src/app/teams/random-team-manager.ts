import { ActivePlayer } from '../player/types/active-player';
import { PlayerManager } from '../player/player-manager';
import { GlobalGameData } from '../game/state/global-game-state';
import { ShuffleArray } from '../utils/utils';

export class RandomTeamManager {
	private static instance: RandomTeamManager;
	private teamHistory: number[][] = [];
	private observerCounts: Map<player, number> = new Map();
	private currentObserver: player | null = null;

	private constructor() {}

	public static getInstance(): RandomTeamManager {
		if (this.instance == null) {
			this.instance = new RandomTeamManager();
		}
		return this.instance;
	}

	public static hasInstance(): boolean {
		return this.instance != null;
	}

	/**
	 * Assigns players into 2 random teams with anti-repeat logic.
	 * If odd count, selects an observer (rotated fairly) and removes them from matchPlayers.
	 * Returns the team arrays for TeamManager.createWithPresetTeams().
	 */
	public assignRandomTeams(): ActivePlayer[][] {
		const players = GlobalGameData.matchPlayers;
		const pool = [...players];

		// Handle odd player count - pick observer
		if (pool.length % 2 !== 0 && pool.length > 2) {
			const observerIdx = this.pickObserverIndex(pool);
			const observer = pool.splice(observerIdx, 1)[0];
			this.currentObserver = observer.getPlayer();

			// Track observer count for fair rotation
			const count = this.observerCounts.get(this.currentObserver) || 0;
			this.observerCounts.set(this.currentObserver, count + 1);

			// Set as observer so they can spectate
			SetPlayerState(this.currentObserver, PLAYER_STATE_OBSERVER, 1);

			// Remove from matchPlayers so they don't participate in team logic
			const matchIdx = GlobalGameData.matchPlayers.indexOf(observer);
			if (matchIdx >= 0) {
				GlobalGameData.matchPlayers.splice(matchIdx, 1);
			}
		}

		// Generate candidate splits and pick the one with least overlap to history
		const bestSplit = this.generateBestSplit(pool);

		// Record history (team1 player IDs)
		this.teamHistory.push(bestSplit.team1.map((p) => GetPlayerId(p.getPlayer())));

		return [bestSplit.team1, bestSplit.team2];
	}

	/**
	 * Restores the previous round's observer back to active player state.
	 * Should be called before prepareMatchData in UpdatePlayerStatusState.
	 */
	public restorePreviousObserver(): void {
		if (this.currentObserver != null) {
			if (GetPlayerSlotState(this.currentObserver) === PLAYER_SLOT_STATE_PLAYING) {
				PlayerManager.getInstance().obsToActive(this.currentObserver);

				// Reset tracked data since they skipped the reset in ResetState
				const player = PlayerManager.getInstance().players.get(this.currentObserver);
				if (player) {
					player.trackedData.reset();
					player.trackedData.setKDMaps();
				}
			}
			this.currentObserver = null;
		}
	}

	/**
	 * Static helper to restore previous observer if RandomTeamManager exists.
	 */
	public static restorePreviousObserverIfNeeded(): void {
		if (this.instance != null) {
			this.instance.restorePreviousObserver();
		}
	}

	public getCurrentObserver(): player | null {
		return this.currentObserver;
	}

	private pickObserverIndex(players: ActivePlayer[]): number {
		// Find the minimum observer count
		let minCount = Infinity;
		for (let i = 0; i < players.length; i++) {
			const count = this.observerCounts.get(players[i].getPlayer()) || 0;
			if (count < minCount) {
				minCount = count;
			}
		}

		// Collect candidates with the minimum count
		const candidates: number[] = [];
		for (let i = 0; i < players.length; i++) {
			const count = this.observerCounts.get(players[i].getPlayer()) || 0;
			if (count === minCount) {
				candidates.push(i);
			}
		}

		// Pick randomly among candidates
		return candidates[Math.floor(Math.random() * candidates.length)];
	}

	private generateBestSplit(players: ActivePlayer[]): { team1: ActivePlayer[]; team2: ActivePlayer[] } {
		const halfSize = Math.floor(players.length / 2);
		let bestSplit: { team1: ActivePlayer[]; team2: ActivePlayer[] } | null = null;
		let bestScore = Infinity;

		const CANDIDATES = 50;

		for (let attempt = 0; attempt < CANDIDATES; attempt++) {
			const shuffled = [...players];
			ShuffleArray(shuffled);

			const team1 = shuffled.slice(0, halfSize);
			const team2 = shuffled.slice(halfSize);

			const score = this.scoreOverlap(team1);

			if (score < bestScore) {
				bestScore = score;
				bestSplit = { team1, team2 };
			}
		}

		return bestSplit!;
	}

	/**
	 * Scores how much a team1 composition overlaps with historical team compositions.
	 * Lower score = more different from history = preferred.
	 * Recent history is weighted more heavily.
	 */
	private scoreOverlap(team1: ActivePlayer[]): number {
		if (this.teamHistory.length === 0) return 0;

		const team1Ids = new Set(team1.map((p) => GetPlayerId(p.getPlayer())));
		let totalOverlap = 0;

		for (let i = 0; i < this.teamHistory.length; i++) {
			const historicalTeam = this.teamHistory[i];
			const recency = i + 1; // more recent = higher index = higher weight
			let overlap = 0;

			for (const id of historicalTeam) {
				if (team1Ids.has(id)) {
					overlap++;
				}
			}

			// Check complement (team2 matching historical team1)
			const complementOverlap = historicalTeam.length - overlap;
			const maxOverlap = Math.max(overlap, complementOverlap);

			totalOverlap += maxOverlap * recency;
		}

		return totalOverlap;
	}
}
