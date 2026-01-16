import { GameRatingResult, PlayerRatingData, RatingFileData, OthersRatingFileData } from './types';
import { readRatings, validateChecksum, writeRatings } from './rating-file-handler';
import { readOthersRatings, writeOthersRatings } from './global-rating-handler';
import {
	calculateExpectedPlacement,
	calculatePerformanceMultiplier,
	calculatePlacementPoints,
	calculateRatingAdvantageMultiplier,
	calculateRatingChange,
} from './rating-calculator';
import { RANKED_MIN_PLAYERS, RANKED_MINIMUM_RATING, RANKED_SEASON_ID, RANKED_STARTING_RATING, DEVELOPER_MODE, RATING_SYNC_TOP_PLAYERS } from 'src/configs/game-settings';
import { ActivePlayer } from '../player/types/active-player';
import { NameManager } from '../managers/names/name-manager';
import { HexColors } from '../utils/hex-colors';
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
	private currentGameId: string;

	/**
	 * Private constructor to ensure singleton pattern
	 */
	private constructor() {
		this.ratingData = new Map();
		this.gameResults = new Map();
		this.loadedPlayers = new Set();
		this.isRankedGameFlag = false;
		this.seasonId = RANKED_SEASON_ID;
	}

	/**
	 * Generate a hash-only identifier for file naming
	 * Uses only hash (no readable name) to:
	 * 1. Prevent collisions when players have similar names
	 * 2. Make file purpose less obvious to players
	 * @param name Player's full btag (e.g., "PlayerName#1234")
	 * @returns Hash string for file naming
	 */
	private sanitizePlayerName(name: string): string {
		// Generate two different hashes and combine them for uniqueness
		// Hash 1: djb2 algorithm
		let hash1 = 5381;
		for (let i = 0; i < name.length; i++) {
			hash1 = ((hash1 << 5) + hash1) + name.charCodeAt(i);
			hash1 = hash1 & hash1;
		}

		// Hash 2: sdbm algorithm
		let hash2 = 0;
		for (let i = 0; i < name.length; i++) {
			hash2 = name.charCodeAt(i) + (hash2 << 6) + (hash2 << 16) - hash2;
			hash2 = hash2 & hash2;
		}

		// Combine both hashes into a single hex string
		const hex1 = Math.abs(hash1).toString(16).padStart(8, '0');
		const hex2 = Math.abs(hash2).toString(16).padStart(8, '0');

		return `${hex1}${hex2}`;
	}

	/**
	 * Get file path for a specific player
	 * File naming is obscured to prevent easy identification
	 * @param btag Player's BattleTag
	 * @returns File path for this player's rating file
	 */
	private getPlayerFilePath(btag: string): string {
		const hash = this.sanitizePlayerName(btag);
		// Use single-letter prefix: 'd' for dev, 'p' for prod
		const prefix = DEVELOPER_MODE ? 'd' : 'p';
		// Must use .txt extension - WC3 only supports .txt and .pld file extensions
		return `risk/${prefix}${this.seasonId}_${hash}.txt`;
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
	 * Check if developer mode is enabled (from game-settings.ts config)
	 * @returns True if RANKED_DEVELOPER_MODE is enabled
	 */
	public isDeveloperModeEnabled(): boolean {
		return DEVELOPER_MODE;
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
			// Corrupted file - player will start fresh and regenerate file at game end
			print(`${HexColors.RED}WARNING:|r Your rating file was corrupted. Starting fresh with default rating.`);
			this.loadedPlayers.add(btag);
			return false;
		}

		// Load valid data for this player
		// Mark as synced since file-loaded data is authoritative
		data.player._isSynced = true;
		this.ratingData.set(data.player.btag, data.player);

		// Finalize pending game if exists
		if (data.player.pendingGame) {
			const playerData = this.ratingData.get(data.player.btag);
			if (playerData && playerData.pendingGame) {
				playerData.rating = playerData.pendingGame.rating;
				playerData.wins = playerData.pendingGame.wins;
				playerData.losses = playerData.pendingGame.losses;
				playerData.gamesPlayed = playerData.pendingGame.gamesPlayed;
				playerData.totalKillValue = playerData.pendingGame.totalKillValue;
				playerData.totalDeathValue = playerData.pendingGame.totalDeathValue;
				playerData.totalPlacement = playerData.pendingGame.totalPlacement;
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
	public savePlayerRating(btag: string): boolean {
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
	 * @param isFFA Whether the game is in FFA mode (pass from SettingsContext.isFFA())
	 * @returns True if game is FFA mode and has more than RANKED_MIN_PLAYERS human players (or in developer mode)
	 */
	public checkRankedGameEligibility(humanPlayerCount: number, isFFA: boolean): boolean {
		// In developer mode, always enable ranked (for testing)
		if (DEVELOPER_MODE) {
			this.isRankedGameFlag = true;
			return true;
		}

		// Normal mode: require FFA mode AND minimum player count
		if (!isFFA) {
			this.isRankedGameFlag = false;
			return false;
		}

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
	 * Get player's showRating preference (default: true)
	 * Automatically loads player's rating file if not loaded yet
	 * @param btag Player's BattleTag
	 * @returns True if player wants to show rating, false to hide
	 */
	public getShowRatingPreference(btag: string): boolean {
		// Load player's rating if not loaded yet
		if (!this.loadedPlayers.has(btag)) {
			this.loadPlayerRating(btag);
		}

		const data = this.ratingData.get(btag);
		if (!data) {
			return true; // Default to showing rating for new players
		}
		return data.showRating !== undefined ? data.showRating : true;
	}

	/**
	 * Set player's showRating preference and save to file
	 * @param btag Player's BattleTag
	 * @param showRating True to show rating, false to hide
	 * @returns True if preference was saved successfully
	 */
	public setShowRatingPreference(btag: string, showRating: boolean): boolean {
		// Load player's rating if not loaded yet
		if (!this.loadedPlayers.has(btag)) {
			this.loadPlayerRating(btag);
		}

		// Get or create player data
		let playerData = this.ratingData.get(btag);
		if (!playerData) {
			// Create new player data with default values
			const timestamp = math.floor(os.time());
			playerData = {
				btag: btag,
				rating: RANKED_STARTING_RATING,
				gamesPlayed: 0,
				lastUpdated: timestamp,
				wins: 0,
				losses: 0,
				totalKillValue: 0,
				totalDeathValue: 0,
				totalPlacement: 0,
				showRating: showRating,
				_isSynced: false, // Default-initialized, not from sync
			};
			this.ratingData.set(btag, playerData);
		} else {
			// Update existing player data
			playerData.showRating = showRating;
		}

		// Save to file immediately
		return this.savePlayerRating(btag);
	}

	/**
	 * Load multiple players into memory from sync data
	 * @param players Array of player rating data to load
	 */
	public loadPlayersFromSync(players: PlayerRatingData[]): void {
		for (let i = 0; i < players.length; i++) {
			const player = players[i];

			// Mark as loaded
			if (!this.loadedPlayers.has(player.btag)) {
				this.loadedPlayers.add(player.btag);
			}

			// Mark as synced (actually loaded from files, not default-initialized)
			player._isSynced = true;

			// Add or update in rating data map
			this.ratingData.set(player.btag, player);
		}
	}

	/**
	 * Initialize all current game players with default rating data if they don't have any loaded yet
	 * This ensures the leaderboard shows all players even in fresh games with no history
	 * @param players Array of ActivePlayer objects in the current game
	 */
	public initializeCurrentGamePlayers(players: ActivePlayer[]): void {
		const timestamp = math.floor(os.time());

		for (let i = 0; i < players.length; i++) {
			const player = players[i];
			const btag = NameManager.getInstance().getBtag(player.getPlayer());

			// Skip if this player already has data loaded
			if (this.ratingData.has(btag)) {
				continue;
			}

			// Create default rating data for new player
			const defaultData: PlayerRatingData = {
				btag: btag,
				rating: RANKED_STARTING_RATING,
				gamesPlayed: 0,
				lastUpdated: timestamp,
				wins: 0,
				losses: 0,
				totalKillValue: 0,
				totalDeathValue: 0,
				totalPlacement: 0,
				showRating: true, // Default to showing rating
				_isSynced: false, // Mark as NOT synced (default-initialized)
			};

			this.ratingData.set(btag, defaultData);
			this.loadedPlayers.add(btag);
		}
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
	 * Get only synced players' rating data (excludes default-initialized players)
	 * Used by leaderboard to show only players from top N synced database
	 * @returns Array of synced player rating data
	 */
	public getSyncedPlayersOnly(): PlayerRatingData[] {
		const players: PlayerRatingData[] = [];

		this.ratingData.forEach((data) => {
			// Only include players that were actually synced (not default-initialized)
			if (data._isSynced === true) {
				players.push(data);
			}
		});

		return players;
	}

	/**
	 * Get top 500 players by rating (strict filter)
	 * Used by leaderboard to show only the highest-rated players
	 * Excludes players with 0 games played (no meaningful data)
	 * @returns Array of top 500 players sorted by rating descending
	 */
	public getTop500Players(): PlayerRatingData[] {
		// Get all synced players
		const syncedPlayers = this.getSyncedPlayersOnly();

		// Filter out players who have never played a game
		// These are new players with default data (rating 1000, games 0)
		const playersWithGames = syncedPlayers.filter((player) => player.gamesPlayed > 0);

		// Sort by rating descending, then by games played, then alphabetically
		const sorted = playersWithGames.slice().sort((a, b) => {
			if (b.rating !== a.rating) {
				return b.rating - a.rating;
			}
			// Tiebreaker: more games played wins
			if (b.gamesPlayed !== a.gamesPlayed) {
				return b.gamesPlayed - a.gamesPlayed;
			}
			// Final tiebreaker: alphabetical
			if (a.btag < b.btag) return -1;
			if (a.btag > b.btag) return 1;
			return 0;
		});

		// Return top 500 only
		return sorted.slice(0, 500);
	}

	/**
	 * Check if leaderboard has any meaningful data
	 * @returns True if there are players with at least 1 game played
	 */
	public hasLeaderboardData(): boolean {
		return this.getTop500Players().length > 0;
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
		// Also filter out computer players (unless in developer mode)
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

			// Exclude computer/AI players in normal mode (prevents cheating)
			// Include them in developer mode (for testing purposes)
			if (!DEVELOPER_MODE && GetPlayerController(player.getPlayer()) !== MAP_CONTROL_USER) {
				return false;
			}

			return true;
		});

		// If too few eligible players remain, don't calculate ratings
		// Skip this check in developer mode to allow singleplayer testing
		if (eligiblePlayers.length < 2 && !DEVELOPER_MODE) {
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
					totalKillValue: 0,
					totalDeathValue: 0,
					totalPlacement: 0,
					_isSynced: true, // Created during rating calculation, treat as synced
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

			// Accumulate K/D values from current game
			const killsDeaths = player.trackedData.killsDeaths.get(player.getPlayer());
			const currentKillValue = killsDeaths ? killsDeaths.killValue : 0;
			const currentDeathValue = killsDeaths ? killsDeaths.deathValue : 0;
			playerData.totalKillValue = (playerData.totalKillValue || 0) + currentKillValue;
			playerData.totalDeathValue = (playerData.totalDeathValue || 0) + currentDeathValue;

			// Accumulate placement (1-based for human readability: 1st, 2nd, etc.)
			playerData.totalPlacement = (playerData.totalPlacement || 0) + (placement + 1);

			// Mark as synced - player now has real game data, not just default-initialized
			playerData._isSynced = true;

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

		// Clear any pending games since this is the final result and save each player's PERSONAL file
		// Only save personal rating files for HUMAN players (not Computer/AI)
		for (let i = 0; i < eligiblePlayers.length; i++) {
			const player = eligiblePlayers[i];
			const btag = NameManager.getInstance().getBtag(player.getPlayer());
			const playerData = this.ratingData.get(btag);
			if (playerData && playerData.pendingGame) {
				delete playerData.pendingGame;
			}

			// Only save personal rating file for HUMAN players
			// Computer/AI players will ONLY be stored in the "others" file, not individual files
			const isHuman = GetPlayerController(player.getPlayer()) === MAP_CONTROL_USER;
			if (isHuman) {
				const saved = this.savePlayerRating(btag);
				if (!saved) {
					print(`${HexColors.RED}ERROR:|r Failed to save rating for ${btag}`);
				}
			}
		}

		// Update "others" ratings database with all OTHER players from this game
		this.updateOthersDatabase();
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
		// Also filter out computer players (unless in developer mode)
		const eligiblePlayers = ranks.filter((player) => {
			const turnDied = player.trackedData.turnDied;
			const maxCities = player.trackedData.cities.max;

			if (turnDied < 0) {
				return false;
			}

			if (maxCities === 0) {
				return false;
			}

			// Exclude computer/AI players in normal mode (prevents cheating)
			// Include them in developer mode (for testing purposes)
			if (!DEVELOPER_MODE && GetPlayerController(player.getPlayer()) !== MAP_CONTROL_USER) {
				return false;
			}

			return true;
		});

		// Need at least 2 players to calculate ratings
		// Skip this check in developer mode to allow singleplayer testing
		if (eligiblePlayers.length < 2 && !DEVELOPER_MODE) {
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
					totalKillValue: 0,
					totalDeathValue: 0,
					totalPlacement: 0,
					_isSynced: true, // Created during in-progress save, treat as synced
				};
				this.ratingData.set(btag, playerData);
			}

			// Calculate preliminary stats with floor
			const preliminaryRating = Math.max(RANKED_MINIMUM_RATING, currentRating + totalChange);
			const preliminaryWins = playerData.wins + (placement === 0 ? 1 : 0);
			const preliminaryLosses = playerData.losses + (placement === 0 ? 0 : 1);
			const preliminaryGamesPlayed = playerData.gamesPlayed + 1;

			// Get current game K/D values from player's tracked data
			const killsDeaths = player.trackedData.killsDeaths.get(player.getPlayer());
			const currentKillValue = killsDeaths ? killsDeaths.killValue : 0;
			const currentDeathValue = killsDeaths ? killsDeaths.deathValue : 0;
			const preliminaryTotalKillValue = (playerData.totalKillValue || 0) + currentKillValue;
			const preliminaryTotalDeathValue = (playerData.totalDeathValue || 0) + currentDeathValue;

			// Calculate preliminary total placement (1-based: 1st, 2nd, etc.)
			const preliminaryTotalPlacement = (playerData.totalPlacement || 0) + (placement + 1);

			// Store in pending game (overwrite if exists)
			playerData.pendingGame = {
				gameId: this.currentGameId,
				rating: preliminaryRating,
				wins: preliminaryWins,
				losses: preliminaryLosses,
				gamesPlayed: preliminaryGamesPlayed,
				totalKillValue: preliminaryTotalKillValue,
				totalDeathValue: preliminaryTotalDeathValue,
				totalPlacement: preliminaryTotalPlacement,
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

	/**
	 * Update "others" ratings database with all OTHER players from this game
	 * (Your own stats are saved separately in your personal file)
	 * Merges with existing "others" database, keeping newest data for each player
	 */
	private updateOthersDatabase(): void {
		// Get local player's btag (to exclude from "others")
		const localPlayer = GetLocalPlayer();
		const localBtag = NameManager.getInstance().getBtag(localPlayer);
		const sanitizedName = this.sanitizePlayerName(localBtag);

		// Get all OTHER players from memory (exclude local player)
		const otherPlayers: PlayerRatingData[] = [];
		this.ratingData.forEach((playerData) => {
			// Skip local player - their stats are in their personal file
			if (playerData.btag === localBtag) {
				return;
			}

			// Create a clean copy without pendingGame field
			const cleanPlayerData: PlayerRatingData = {
				btag: playerData.btag,
				rating: playerData.rating,
				gamesPlayed: playerData.gamesPlayed,
				lastUpdated: playerData.lastUpdated,
				wins: playerData.wins,
				losses: playerData.losses,
				totalKillValue: playerData.totalKillValue || 0,
				totalDeathValue: playerData.totalDeathValue || 0,
			};
			otherPlayers.push(cleanPlayerData);
		});

		if (otherPlayers.length === 0) {
			return;
		}

		// Load existing "others" database for this account
		const existingData = readOthersRatings(sanitizedName, this.seasonId, DEVELOPER_MODE);

		// Create map for efficient merging
		const playerMap = new Map<string, PlayerRatingData>();

		// Add existing players from others database
		if (existingData) {
			for (let i = 0; i < existingData.players.length; i++) {
				const player = existingData.players[i];
				playerMap.set(player.btag, player);
			}
		}

		// Merge other players from current game (newer timestamp wins)
		for (let i = 0; i < otherPlayers.length; i++) {
			const newPlayer = otherPlayers[i];
			const existing = playerMap.get(newPlayer.btag);

			if (!existing || newPlayer.lastUpdated > existing.lastUpdated) {
				playerMap.set(newPlayer.btag, newPlayer);
			}
		}

		// Convert map back to array
		const allMergedPlayers: PlayerRatingData[] = [];
		playerMap.forEach((player) => {
			allMergedPlayers.push(player);
		});

		// Sort by rating (descending) to keep the best players
		allMergedPlayers.sort((a, b) => {
			if (b.rating !== a.rating) {
				return b.rating - a.rating;
			}
			// Tiebreaker: more games played wins
			if (b.gamesPlayed !== a.gamesPlayed) {
				return b.gamesPlayed - a.gamesPlayed;
			}
			// Final tiebreaker: alphabetical by btag
			if (a.btag < b.btag) return -1;
			if (a.btag > b.btag) return 1;
			return 0;
		});

		// Limit to top N players (RATING_SYNC_TOP_PLAYERS)
		// This ensures the "others" file doesn't grow unbounded
		// When a new player enters the top N, they replace the lowest-rated player
		const mergedPlayers = allMergedPlayers.slice(0, RATING_SYNC_TOP_PLAYERS);

		// Save to others database for this account
		const othersData: OthersRatingFileData = {
			version: 1,
			seasonId: this.seasonId,
			checksum: '', // Will be generated by writeOthersRatings
			players: mergedPlayers,
			playerCount: mergedPlayers.length,
		};

		writeOthersRatings(othersData, sanitizedName, this.seasonId, DEVELOPER_MODE);
	}
}
