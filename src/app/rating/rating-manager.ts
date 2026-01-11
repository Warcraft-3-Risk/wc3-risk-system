import { GameRatingResult, PlayerRatingData, RatingFileData } from './types';
import { readRatings, validateChecksum, writeRatings } from './rating-file-handler';
import {
	calculateExpectedPlacement,
	calculatePerformanceMultiplier,
	calculatePlacementPoints,
	calculateRatingAdvantageMultiplier,
	calculateRatingChange,
} from './rating-calculator';
import { RANKED_MIN_PLAYERS, RANKED_MINIMUM_RATING, RANKED_SEASON_ID, RANKED_STARTING_RATING } from 'src/configs/game-settings';
import { ActivePlayer } from '../player/types/active-player';
import { NameManager } from '../managers/names/name-manager';
import { HexColors } from '../utils/hex-colors';
import { File } from 'w3ts';
import { GlobalGameData } from '../game/state/global-game-state';
import { debugPrint } from '../utils/debug-print';

/**
 * Singleton manager for the rating system
 * Handles loading, calculating, and saving player ratings
 */
export class RatingManager {
	private static instance: RatingManager;

	private ratingData: Map<string, PlayerRatingData>;
	private gameResults: Map<string, GameRatingResult>;
	private isRankedGameFlag: boolean;
	private seasonId: number;
	private loadedPlayers: Set<string>; // Track which players have been loaded
	private isDeveloperMode: boolean;
	private currentGameId: string;

	/**
	 * Private constructor to ensure singleton pattern
	 */
	private constructor() {
		this.ratingData = new Map();
		this.gameResults = new Map();
		this.loadedPlayers = new Set();
		this.isRankedGameFlag = false;
		this.isDeveloperMode = false;
		this.seasonId = RANKED_SEASON_ID;
	}

	/**
	 * Sanitize player name for use in file name
	 * Combines safe characters with a hash to prevent collisions
	 * @param name Player name
	 * @returns Sanitized name with hash suffix
	 */
	private sanitizePlayerName(name: string): string {
		// Extract alphanumeric characters only
		let sanitized = '';
		for (let i = 0; i < name.length; i++) {
			const char = name.charAt(i);
			if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9') || char === '_' || char === '-') {
				sanitized += char;
			}
		}

		// Generate hash from original name to prevent collisions
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = (hash << 5) - hash + name.charCodeAt(i);
			hash = hash & hash; // Convert to 32-bit integer
		}
		const hashStr = Math.abs(hash).toString(16);

		// Use first 12 chars of sanitized name + hash
		const safeName = sanitized.length > 0 ? sanitized.substring(0, 12) : 'Player';
		return `${safeName}_${hashStr}`;
	}

	/**
	 * Get file path for a specific player
	 * @param btag Player's BattleTag
	 * @returns File path for this player's rating file
	 */
	private getPlayerFilePath(btag: string): string {
		const sanitizedName = this.sanitizePlayerName(btag);
		const prefix = this.isDeveloperMode ? 'dev_ratings' : 'ratings';
		return `risk/${prefix}_${sanitizedName}_s${this.seasonId}.txt`;
	}

	/**
	 * @returns The singleton instance of RatingManager
	 */
	public static getInstance(): RatingManager {
		if (this.instance == null) {
			this.instance = new RatingManager();
		}

		return this.instance;
	}

	/**
	 * Enable developer mode for singleplayer testing
	 * Uses separate rating files to avoid polluting real ratings
	 */
	public enableDeveloperMode(): void {
		this.isDeveloperMode = true;
		// Clear loaded players to force reload with dev prefix
		this.loadedPlayers.clear();
		this.ratingData.clear();
	}

	/**
	 * Check if developer mode is enabled
	 * @returns True if in developer/singleplayer mode
	 */
	public isDeveloperModeEnabled(): boolean {
		return this.isDeveloperMode;
	}

	/**
	 * Load rating for a specific player from their personal file
	 * @param btag Player's BattleTag
	 * @returns True if rating loaded successfully
	 */
	public loadPlayerRating(btag: string): boolean {
		// Skip if already loaded
		if (this.loadedPlayers.has(btag)) {
			return true;
		}

		const filePath = this.getPlayerFilePath(btag);
		const data = readRatings(filePath);

		if (!data) {
			// No file exists yet - player will start fresh
			this.loadedPlayers.add(btag);
			return true;
		}

		// Validate checksum
		if (!validateChecksum(data)) {
			// Corrupted file - create backup and reset
			const timestamp = math.floor(os.time());
			const corruptedPath = filePath.replace('.txt', `_corrupted_${timestamp}.txt`);

			try {
				const originalData = File.read(filePath);
				if (originalData) {
					File.write(corruptedPath, originalData);
				}
			} catch (error) {
				// Ignore backup error
			}

			// Notify player
			print(`${HexColors.RED}WARNING:|r Your rating file was corrupted. Starting fresh.`);
			this.loadedPlayers.add(btag);
			return false;
		}

		// Load valid data for this player
		this.ratingData.set(data.player.btag, data.player);

		// Finalize pending game if exists
		if (data.player.pendingGame) {
			const playerData = this.ratingData.get(data.player.btag);
			if (playerData && playerData.pendingGame) {
				playerData.rating = playerData.pendingGame.rating;
				playerData.wins = playerData.pendingGame.wins;
				playerData.losses = playerData.pendingGame.losses;
				playerData.gamesPlayed = playerData.pendingGame.gamesPlayed;
				playerData.lastUpdated = playerData.pendingGame.timestamp;
				delete playerData.pendingGame;

				// Save immediately to finalize
				this.savePlayerRating(btag);
			}
		}

		this.loadedPlayers.add(btag);
		return true;
	}

	/**
	 * Save rating for a specific player to their personal file
	 * @param btag Player's BattleTag
	 * @returns True if save succeeded
	 */
	private savePlayerRating(btag: string): boolean {
		const playerData = this.ratingData.get(btag);
		if (!playerData) {
			return false;
		}

		const filePath = this.getPlayerFilePath(btag);
		const data: RatingFileData = {
			version: 1,
			seasonId: this.seasonId,
			checksum: '', // Will be generated by writeRatings
			player: playerData,
		};

		return writeRatings(filePath, data);
	}

	/**
	 * Check if the current game qualifies as ranked
	 * @param humanPlayerCount Number of human players in the game
	 * @returns True if game has more than RANKED_MIN_PLAYERS human players (or in developer mode)
	 */
	public checkRankedGameEligibility(humanPlayerCount: number): boolean {
		// In developer mode, always enable ranked (for testing)
		if (this.isDeveloperMode) {
			this.isRankedGameFlag = true;
			return true;
		}

		// Normal mode: require minimum player count
		this.isRankedGameFlag = humanPlayerCount > RANKED_MIN_PLAYERS;
		return this.isRankedGameFlag;
	}

	/**
	 * Check if current game is ranked
	 * @returns True if game is ranked
	 */
	public isRankedGame(): boolean {
		return this.isRankedGameFlag;
	}

	/**
	 * Generate unique game ID for crash recovery
	 * Uses timestamp and match count to ensure uniqueness
	 */
	public generateGameId(): void {
		const timestamp = math.floor(os.time());
		const matchCount = GlobalGameData.matchCount;
		this.currentGameId = `${timestamp}_${matchCount}`;
	}

	/**
	 * Get current game ID
	 * @returns Current game ID or empty string if not generated
	 */
	public getCurrentGameId(): string {
		return this.currentGameId || '';
	}

	/**
	 * Get player's current rating (or starting rating if new)
	 * Automatically loads player's rating file if not loaded yet
	 * @param btag Player's BattleTag
	 * @returns Current rating
	 */
	public getPlayerRating(btag: string): number {
		// Load player's rating if not loaded yet
		if (!this.loadedPlayers.has(btag)) {
			this.loadPlayerRating(btag);
		}

		const data = this.ratingData.get(btag);
		if (!data) {
			return RANKED_STARTING_RATING;
		}
		return data.rating;
	}

	/**
	 * Get game results for display
	 * @returns Map of btag to game rating result
	 */
	public getRatingResults(): Map<string, GameRatingResult> {
		return this.gameResults;
	}

	/**
	 * Get player's full rating data
	 * Automatically loads player's rating file if not loaded yet
	 * @param btag Player's BattleTag
	 * @returns Player rating data or null if not found
	 */
	public getPlayerData(btag: string): PlayerRatingData | null {
		// Load player's rating if not loaded yet
		if (!this.loadedPlayers.has(btag)) {
			this.loadPlayerRating(btag);
		}

		const data = this.ratingData.get(btag);
		if (!data) {
			return null;
		}
		return data;
	}

	/**
	 * Get all loaded players' rating data
	 * @returns Array of all loaded player rating data
	 */
	public getAllLoadedPlayers(): PlayerRatingData[] {
		const players: PlayerRatingData[] = [];
		this.ratingData.forEach((data) => {
			players.push(data);
		});
		return players;
	}

	/**
	 * Calculate and save ratings for all players at game end
	 * @param ranks Array of players sorted by rank (1st place = index 0)
	 */
	public calculateAndSaveRatings(ranks: ActivePlayer[]): void {
		if (!this.isRankedGameFlag) {
			return;
		}

		this.gameResults.clear();
		const timestamp = math.floor(os.time());

		// Filter out players who left very early (during countdown before game started)
		// These players likely had connection issues before the game actually started
		const eligiblePlayers = ranks.filter((player) => {
			const turnDied = player.trackedData.turnDied;
			const maxCities = player.trackedData.cities.max;

			// Exclude if left before game started (turnDied = -1 means left during countdown)
			if (turnDied < 0) {
				return false;
			}

			// Exclude if never owned any cities (didn't participate)
			if (maxCities === 0) {
				return false;
			}

			return true;
		});

		// If too few eligible players remain, don't calculate ratings
		// Skip this check in developer mode to allow singleplayer testing
		if (eligiblePlayers.length < 2 && !this.isDeveloperMode) {
			const host = Player(0);
			DisplayTimedTextToPlayer(
				host,
				0,
				0,
				15,
				`${HexColors.WARNING}Rating calculation skipped:|r Too few eligible players (early crashes/leaves).`
			);
			return;
		}

		// First pass: Get all current ratings for eligible players
		const playerRatings: Map<string, number> = new Map();
		eligiblePlayers.forEach((player) => {
			const btag = NameManager.getInstance().getBtag(player.getPlayer());
			playerRatings.set(btag, this.getPlayerRating(btag));
		});

		// Calculate rating changes for each eligible player
		eligiblePlayers.forEach((player, index) => {
			const btag = NameManager.getInstance().getBtag(player.getPlayer());
			const placement = index; // 0-based: 0 = 1st, 1 = 2nd, etc.

			// Get current rating
			const currentRating = playerRatings.get(btag) || RANKED_STARTING_RATING;

			// Build array of opponent ratings (all eligible players except this player)
			const opponentRatings: number[] = [];
			eligiblePlayers.forEach((opponent) => {
				const opponentBtag = NameManager.getInstance().getBtag(opponent.getPlayer());
				if (opponentBtag !== btag) {
					opponentRatings.push(playerRatings.get(opponentBtag) || RANKED_STARTING_RATING);
				}
			});

			// Calculate rating change components
			const basePlacementPoints = calculatePlacementPoints(placement);
			const expectedPlacement = calculateExpectedPlacement(currentRating, opponentRatings);
			const performanceMultiplier = calculatePerformanceMultiplier(placement, expectedPlacement);
			const ratingAdvantageMultiplier = calculateRatingAdvantageMultiplier(currentRating, opponentRatings);
			const adjustedPlacementPoints = Math.floor(basePlacementPoints * performanceMultiplier * ratingAdvantageMultiplier);
			const totalChange = calculateRatingChange(placement, currentRating, opponentRatings);

			// Get or create player rating data
			let playerData = this.ratingData.get(btag);
			if (!playerData) {
				playerData = {
					btag: btag,
					rating: RANKED_STARTING_RATING,
					gamesPlayed: 0,
					lastUpdated: timestamp,
					wins: 0,
					losses: 0,
				};
				this.ratingData.set(btag, playerData);
			}

			// Apply rating change with floor
			const oldRating = playerData.rating;
			const newRating = Math.max(RANKED_MINIMUM_RATING, oldRating + totalChange);

			playerData.rating = newRating;
			playerData.gamesPlayed += 1;
			playerData.lastUpdated = timestamp;

			// Track win/loss (1st place = win, everything else = loss)
			if (placement === 0) {
				playerData.wins += 1;
			} else {
				playerData.losses += 1;
			}

			debugPrint(
				`Rating update for ${btag}: ${oldRating} -> ${newRating} (change: ${totalChange}, expected: ${expectedPlacement}, actual: ${placement})`
			);

			// Store game result for display
			this.gameResults.set(btag, {
				btag: btag,
				basePlacementPoints: basePlacementPoints,
				performanceMultiplier: performanceMultiplier,
				ratingAdvantageMultiplier: ratingAdvantageMultiplier,
				adjustedPlacementPoints: adjustedPlacementPoints,
				totalChange: totalChange,
				oldRating: oldRating,
				newRating: newRating,
				expectedPlacement: expectedPlacement,
				actualPlacement: placement,
			});
		});

		// Clear any pending games since this is the final result and save each player
		for (let i = 0; i < eligiblePlayers.length; i++) {
			const player = eligiblePlayers[i];
			const btag = NameManager.getInstance().getBtag(player.getPlayer());
			const playerData = this.ratingData.get(btag);
			if (playerData && playerData.pendingGame) {
				delete playerData.pendingGame;
			}

			// Save this player's rating to their personal file
			const saved = this.savePlayerRating(btag);
			if (!saved) {
				print(`${HexColors.RED}ERROR:|r Failed to save rating for ${btag}`);
			}
		}
	}

	/**
	 * Save preliminary ratings during game for crash recovery
	 * Called at the end of each turn to allow recovery from crashes
	 * @param ranks Array of players sorted by current rank
	 * @param currentTurn Current turn number
	 */
	public saveRatingsInProgress(ranks: ActivePlayer[], currentTurn: number): void {
		if (!this.isRankedGameFlag || !this.currentGameId) {
			return;
		}

		const timestamp = math.floor(os.time());

		// Filter out players who left very early (same logic as final calculation)
		const eligiblePlayers = ranks.filter((player) => {
			const turnDied = player.trackedData.turnDied;
			const maxCities = player.trackedData.cities.max;

			if (turnDied < 0) {
				return false;
			}

			if (maxCities === 0) {
				return false;
			}

			return true;
		});

		// Need at least 2 players to calculate ratings
		// Skip this check in developer mode to allow singleplayer testing
		if (eligiblePlayers.length < 2 && !this.isDeveloperMode) {
			return;
		}

		// First pass: Get all current ratings for eligible players
		const playerRatings: Map<string, number> = new Map();
		eligiblePlayers.forEach((player) => {
			const btag = NameManager.getInstance().getBtag(player.getPlayer());
			playerRatings.set(btag, this.getPlayerRating(btag));
		});

		// Calculate preliminary rating changes for each eligible player
		eligiblePlayers.forEach((player, index) => {
			const btag = NameManager.getInstance().getBtag(player.getPlayer());
			const placement = index;

			const currentRating = playerRatings.get(btag) || RANKED_STARTING_RATING;

			// Build array of opponent ratings
			const opponentRatings: number[] = [];
			eligiblePlayers.forEach((opponent) => {
				const opponentBtag = NameManager.getInstance().getBtag(opponent.getPlayer());
				if (opponentBtag !== btag) {
					opponentRatings.push(playerRatings.get(opponentBtag) || RANKED_STARTING_RATING);
				}
			});

			// Calculate total rating change
			const totalChange = calculateRatingChange(placement, currentRating, opponentRatings);

			// Get or create player rating data
			let playerData = this.ratingData.get(btag);
			if (!playerData) {
				playerData = {
					btag: btag,
					rating: RANKED_STARTING_RATING,
					gamesPlayed: 0,
					lastUpdated: timestamp,
					wins: 0,
					losses: 0,
				};
				this.ratingData.set(btag, playerData);
			}

			// Calculate preliminary stats with floor
			const preliminaryRating = Math.max(RANKED_MINIMUM_RATING, currentRating + totalChange);
			const preliminaryWins = playerData.wins + (placement === 0 ? 1 : 0);
			const preliminaryLosses = playerData.losses + (placement === 0 ? 0 : 1);
			const preliminaryGamesPlayed = playerData.gamesPlayed + 1;

			debugPrint(
				`saveRatingsInProgress: ${btag} - Turn ${currentTurn}, Placement: ${placement + 1}, Rating: ${currentRating} -> ${preliminaryRating} (${totalChange > 0 ? '+' : ''}${totalChange})`
			);

			// Store in pending game (overwrite if exists)
			playerData.pendingGame = {
				gameId: this.currentGameId,
				rating: preliminaryRating,
				wins: preliminaryWins,
				losses: preliminaryLosses,
				gamesPlayed: preliminaryGamesPlayed,
				turn: currentTurn,
				timestamp: timestamp,
			};

			// Save this player's rating with pending game
			const saved = this.savePlayerRating(btag);
			if (!saved) {
				debugPrint(`Failed to save pending rating for ${btag}`);
			}
		});
	}
}
