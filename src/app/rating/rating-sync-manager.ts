import { PlayerRatingData } from './types';
import { readRatings } from './rating-file-handler';
import { readOthersRatings, writeOthersRatings } from './global-rating-handler';
import { NameManager } from '../managers/names/name-manager';
import { ActivePlayer } from '../player/types/active-player';
import { RANKED_SEASON_ID, RATING_SYNC_ENABLED, RATING_SYNC_TIMEOUT, DEVELOPER_MODE, RATING_SYNC_TOP_PLAYERS } from 'src/configs/game-settings';
import { debugPrint } from '../utils/debug-print';
import { RatingManager } from './rating-manager';
import { PlayerManager } from '../player/player-manager';
import { MapPlayer, SyncRequest } from 'w3ts';

/**
 * Singleton manager for P2P rating synchronization
 * Coordinates the exchange of rating data between players at game start
 * Uses w3ts SyncRequest for reliable P2P transmission with automatic chunking
 */
export class RatingSyncManager {
	private static instance: RatingSyncManager;

	private receivedPlayerData: Map<number, PlayerRatingData[]>; // playerId -> their synced players
	private expectedPlayerCount: number;
	private completedSyncs: number;
	private isComplete: boolean;
	private seasonId: number;
	private syncFullyCompleted: boolean;

	/**
	 * Private constructor to ensure singleton pattern
	 */
	private constructor() {
		this.isComplete = false;
		this.syncFullyCompleted = false;
		this.seasonId = RANKED_SEASON_ID;
		this.receivedPlayerData = new Map();
		this.expectedPlayerCount = 0;
		this.completedSyncs = 0;
	}

	/**
	 * Get the singleton instance
	 * @returns RatingSyncManager instance
	 */
	public static getInstance(): RatingSyncManager {
		if (!this.instance) {
			this.instance = new RatingSyncManager();
		}
		return this.instance;
	}

	/**
	 * Check if developer mode is enabled (from game-settings.ts config)
	 * @returns True if DEVELOPER_MODE is enabled
	 */
	public isDeveloperModeEnabled(): boolean {
		return DEVELOPER_MODE;
	}

	/**
	 * Check if rating synchronization has fully completed
	 * Used by UI to prevent desyncs from premature access
	 * @returns True if sync is complete and safe to access rating data
	 */
	public isSyncComplete(): boolean {
		return this.syncFullyCompleted;
	}

	/**
	 * Get hash identifier for local player (same logic as RatingManager)
	 * @returns Hash string for file naming
	 */
	private getSanitizedLocalPlayerName(): string {
		const localBtag = NameManager.getInstance().getBtag(GetLocalPlayer());
		return this.sanitizePlayerName(localBtag);
	}

	/**
	 * Start P2P rating synchronization
	 * Main entry point - call this at game start (countdown phase)
	 * @param humanPlayers Array of human players (excludes AI)
	 */
	public startSync(humanPlayers: ActivePlayer[]): void {
		// Check if sync is enabled
		if (!RATING_SYNC_ENABLED) {
			debugPrint('[RATING SYNC] P2P sync is disabled');
			this.loadLocalDataOnly();
			return;
		}

		// If single player (no other humans to sync with), just load local data
		if (humanPlayers.length < 2) {
			debugPrint('[RATING SYNC] Single player - loading local data only');
			this.loadLocalDataOnly();
			return;
		}

		this.expectedPlayerCount = humanPlayers.length;
		this.completedSyncs = 0;

		// Create SyncRequest for each player's data
		for (let i = 0; i < humanPlayers.length; i++) {
			const activePlayer = humanPlayers[i];
			const player = activePlayer.getPlayer();
			const playerId = GetPlayerId(player);

			// Build the data to sync for this player
			const dataToSync = this.buildPlayerSyncData(player);
			const serializedData = this.serializePlayerData(dataToSync);

			// Create SyncRequest - w3ts handles chunking automatically
			const mapPlayer = MapPlayer.fromHandle(player);
			new SyncRequest(mapPlayer, serializedData)
				.then((res, req) => {
					this.handleSyncComplete(playerId, res.data);
				})
				.catch((res, req) => {
					debugPrint(`[RATING SYNC] Sync failed for player ${playerId}: timeout`);
					this.handleSyncComplete(playerId, '');
				});
		}

		// Start timeout timer as backup
		this.startTimeoutTimer();
	}

	/**
	 * Build the sync data for a player (their personal data + others database)
	 * @param player The player to build data for
	 * @returns Array of player rating data to sync
	 */
	private buildPlayerSyncData(player: player): PlayerRatingData[] {
		const playersToSync: PlayerRatingData[] = [];
		const localPlayer = GetLocalPlayer();

		// Only the local player builds their actual data
		if (player !== localPlayer) {
			return playersToSync;
		}

		const nameManager = NameManager.getInstance();
		const btag = nameManager.getBtag(localPlayer);

		if (!btag) {
			return playersToSync;
		}

		// 1. Add personal rating data
		const hash = this.sanitizePlayerName(btag);
		const prefix = DEVELOPER_MODE ? 'd' : 'p';
		// Must use .txt extension - WC3 only supports .txt and .pld file extensions
		const filePath = `risk/${prefix}${this.seasonId}_${hash}.txt`;
		const ratingFile = readRatings(filePath);

		if (ratingFile) {
			playersToSync.push(ratingFile.player);
		} else {
			// New player - add default starting data
			const timestamp = math.floor(os.time());
			playersToSync.push({
				btag: btag,
				rating: 1000,
				gamesPlayed: 0,
				lastUpdated: timestamp,
				wins: 0,
				losses: 0,
				totalKillValue: 0,
				totalDeathValue: 0,
				totalPlacement: 0,
			});
		}

		// 2. Add top N players from "others" database
		const othersData = readOthersRatings(hash, this.seasonId, DEVELOPER_MODE);
		if (othersData && othersData.players.length > 0) {
			// Sort by rating descending
			const sortedPlayers = othersData.players.sort((a, b) => {
				if (b.rating !== a.rating) {
					return b.rating - a.rating;
				}
				if (a.btag < b.btag) return -1;
				if (a.btag > b.btag) return 1;
				return 0;
			});

			// Take top N players (don't include personal data again)
			const topPlayers = sortedPlayers.slice(0, RATING_SYNC_TOP_PLAYERS);
			for (let i = 0; i < topPlayers.length; i++) {
				const otherPlayer = topPlayers[i];
				if (otherPlayer.btag !== btag) {
					playersToSync.push(otherPlayer);
				}
			}
		}

		return playersToSync;
	}

	/**
	 * Serialize player data array to string format for transmission
	 * Format: btag:rating:games:updated:wins:losses:killVal:deathVal:totalPlacement separated by newlines
	 */
	private serializePlayerData(players: PlayerRatingData[]): string {
		const lines: string[] = [];
		for (let i = 0; i < players.length; i++) {
			const p = players[i];
			lines.push(`${p.btag}:${math.floor(p.rating || 0)}:${math.floor(p.gamesPlayed || 0)}:${math.floor(p.lastUpdated || 0)}:${math.floor(p.wins || 0)}:${math.floor(p.losses || 0)}:${math.floor(p.totalKillValue || 0)}:${math.floor(p.totalDeathValue || 0)}:${math.floor(p.totalPlacement || 0)}`);
		}
		return lines.join('\n');
	}

	/**
	 * Deserialize player data from string format
	 */
	private deserializePlayerData(data: string): PlayerRatingData[] {
		const players: PlayerRatingData[] = [];
		if (!data || data === '') {
			return players;
		}

		const lines = data.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line === '') continue;

			const parts = line.split(':');
			if (parts.length >= 8) {
				players.push({
					btag: parts[0],
					rating: tonumber(parts[1]) || 0,
					gamesPlayed: tonumber(parts[2]) || 0,
					lastUpdated: tonumber(parts[3]) || 0,
					wins: tonumber(parts[4]) || 0,
					losses: tonumber(parts[5]) || 0,
					totalKillValue: tonumber(parts[6]) || 0,
					totalDeathValue: tonumber(parts[7]) || 0,
					totalPlacement: parts.length >= 9 ? (tonumber(parts[8]) || 0) : 0,
				});
			}
		}
		return players;
	}

	/**
	 * Handle completed sync from a player
	 */
	private handleSyncComplete(playerId: number, data: string): void {
		if (this.isComplete) {
			return; // Already completed
		}

		const players = this.deserializePlayerData(data);
		this.receivedPlayerData.set(playerId, players);
		this.completedSyncs++;

		// Check if all syncs are complete
		if (this.completedSyncs >= this.expectedPlayerCount) {
			this.completeSync();
		}
	}

	/**
	 * Start timeout timer for sync completion
	 */
	private startTimeoutTimer(): void {
		const timeoutTimer = CreateTimer();

		TimerStart(timeoutTimer, RATING_SYNC_TIMEOUT, false, () => {
			DestroyTimer(timeoutTimer);
			if (!this.isComplete) {
				this.completeSync();
			}
		});
	}

	/**
	 * Load local data only (no P2P sync)
	 * Used for single player games or when sync is disabled
	 */
	private loadLocalDataOnly(): void {
		debugPrint('[RATING SYNC] loadLocalDataOnly() called');
		const receivedPlayers: PlayerRatingData[] = [];

		// Add local player's own data (most accurate)
		const localPlayer = GetLocalPlayer();
		const nameManager = NameManager.getInstance();
		const btag = nameManager.getBtag(localPlayer);
		debugPrint(`[RATING SYNC] Local player btag: ${btag || 'NULL'}`);

		if (btag) {
			const hash = this.sanitizePlayerName(btag);
			const prefix = DEVELOPER_MODE ? 'd' : 'p';
			// Must use .txt extension - WC3 only supports .txt and .pld file extensions
			const filePath = `risk/${prefix}${this.seasonId}_${hash}.txt`;
			const ratingFile = readRatings(filePath);

			if (ratingFile) {
				receivedPlayers.push(ratingFile.player);
			} else {
				// New player - add default starting data (same as P2P sync does)
				const timestamp = math.floor(os.time());
				receivedPlayers.push({
					btag: btag,
					rating: 1000,
					gamesPlayed: 0,
					lastUpdated: timestamp,
					wins: 0,
					losses: 0,
					totalKillValue: 0,
					totalDeathValue: 0,
					totalPlacement: 0,
				});
			}
		}

		// Load local "others" database (historical data about other players)
		// This includes computer players from previous games (in dev mode)
		this.loadOthersDatabase(receivedPlayers);

		// Load all data into RatingManager's memory
		const ratingManager = RatingManager.getInstance();
		ratingManager.loadPlayersFromSync(receivedPlayers);

		// Initialize all current game players with default data (if they don't have any)
		const currentPlayers: ActivePlayer[] = [];
		PlayerManager.getInstance().players.forEach((player) => {
			currentPlayers.push(player);
		});
		ratingManager.initializeCurrentGamePlayers(currentPlayers);

		// Save local player's rating file immediately (creates file for new players)
		if (btag) {
			debugPrint(`[RATING SYNC] Saving rating file for ${btag}`);
			const saved = ratingManager.savePlayerRating(btag);
			debugPrint(`[RATING SYNC] Save result: ${saved ? 'SUCCESS' : 'FAILED'}`);
		}

		// Regenerate "others" file with ALL loaded players (including newly initialized ones)
		// This ensures computer players (in dev mode) get saved to the "others" file
		const allLoadedPlayers = ratingManager.getAllLoadedPlayers();
		this.saveOthersFile(allLoadedPlayers);

		// Mark sync as complete
		this.syncFullyCompleted = true;
	}



	/**
	 * Load local "others" database (historical data about other players)
	 * Loads top N players by rating (configurable via RATING_SYNC_TOP_PLAYERS)
	 * @param receivedPlayers Array to add loaded player data to
	 */
	private loadOthersDatabase(receivedPlayers: PlayerRatingData[]): void {
		const sanitizedName = this.getSanitizedLocalPlayerName();
		const othersData = readOthersRatings(sanitizedName, this.seasonId, DEVELOPER_MODE);

		if (!othersData || othersData.players.length === 0) {
			return;
		}

		// Sort players by rating (descending), then by btag (alphabetically) for deterministic ordering
		const sortedPlayers = othersData.players.sort((a, b) => {
			if (b.rating !== a.rating) {
				return b.rating - a.rating;
			}
			if (a.btag < b.btag) return -1;
			if (a.btag > b.btag) return 1;
			return 0;
		});

		// Take only top N players (configurable)
		const topPlayers = sortedPlayers.slice(0, RATING_SYNC_TOP_PLAYERS);

		// Add top players from others database
		for (let i = 0; i < topPlayers.length; i++) {
			const otherPlayer = topPlayers[i];

			// Check if this player is already in receivedPlayers (avoid duplicates)
			let alreadyExists = false;
			for (let j = 0; j < receivedPlayers.length; j++) {
				if (receivedPlayers[j].btag === otherPlayer.btag) {
					alreadyExists = true;
					break;
				}
			}

			if (!alreadyExists) {
				receivedPlayers.push(otherPlayer);
			}
		}
	}

	/**
	 * Complete sync process - merge all received player databases
	 * Implements distributed rating system with deduplication (keeping newest data)
	 */
	private completeSync(): void {
		if (this.isComplete) {
			return;
		}

		this.isComplete = true;

		// Map to track all players (btag -> PlayerRatingData)
		// When duplicates exist, keep the one with newest lastUpdated timestamp
		const allPlayersMap: Map<string, PlayerRatingData> = new Map();

		// Helper function to add or merge player data
		const addOrMergePlayer = (player: PlayerRatingData) => {
			const existing = allPlayersMap.get(player.btag);
			if (!existing) {
				// New player - add it
				allPlayersMap.set(player.btag, player);
			} else {
				// Duplicate - keep the one with newest lastUpdated timestamp
				if (player.lastUpdated > existing.lastUpdated) {
					allPlayersMap.set(player.btag, player);
				}
			}
		};

		// 1. Process all received player databases from P2P sync
		let totalPlayersReceived = 0;
		this.receivedPlayerData.forEach((playersData, playerId) => {
			if (playersData && playersData.length > 0) {
				totalPlayersReceived += playersData.length;

				// Merge each player with deduplication
				for (let i = 0; i < playersData.length; i++) {
					addOrMergePlayer(playersData[i]);
				}
			}
		});

		// 2. Add local player's own data (highest priority - most accurate)
		const localPlayer = GetLocalPlayer();
		const nameManager = NameManager.getInstance();
		const btag = nameManager.getBtag(localPlayer);

		if (btag) {
			const hash = this.sanitizePlayerName(btag);
			const prefix = DEVELOPER_MODE ? 'd' : 'p';
			// Must use .txt extension - WC3 only supports .txt and .pld file extensions
			const filePath = `risk/${prefix}${this.seasonId}_${hash}.txt`;
			const ratingFile = readRatings(filePath);

			if (ratingFile) {
				// Force override with local data (always most accurate for yourself)
				allPlayersMap.set(ratingFile.player.btag, ratingFile.player);
			}
		}

		// Convert map to array
		const mergedPlayers: PlayerRatingData[] = [];
		allPlayersMap.forEach((player) => {
			mergedPlayers.push(player);
		});

		// If P2P sync failed (no data received from other players), load local "others" database as fallback
		if (totalPlayersReceived === 0) {
			const fallbackPlayers: PlayerRatingData[] = [];

			// Add players already in mergedPlayers (local player's personal file)
			for (let i = 0; i < mergedPlayers.length; i++) {
				fallbackPlayers.push(mergedPlayers[i]);
			}

			// Load local "others" database
			this.loadOthersDatabase(fallbackPlayers);

			// Use fallback data instead of empty merged data
			this.mergeAndSave(fallbackPlayers);
		} else {
			// Normal P2P sync succeeded
			this.mergeAndSave(mergedPlayers);
		}
	}

	/**
	 * Save "others" rating file with top N OTHER players (excluding local player)
	 * Sorts by rating and limits to RATING_SYNC_TOP_PLAYERS to prevent unbounded growth
	 * @param allPlayers Array of all player data
	 */
	private saveOthersFile(allPlayers: PlayerRatingData[]): void {
		// Get local player's btag (to exclude from "others" database)
		const localPlayer = GetLocalPlayer();
		const nameManager = NameManager.getInstance();
		const localBtag = nameManager.getBtag(localPlayer);

		// Separate OTHER players (exclude local player) for saving to "others" file
		const otherPlayers: PlayerRatingData[] = [];
		for (let i = 0; i < allPlayers.length; i++) {
			const player = allPlayers[i];
			if (player.btag !== localBtag) {
				otherPlayers.push(player);
			}
		}

		if (otherPlayers.length === 0) {
			return;
		}

		// Sort by rating (descending) to keep the best players
		otherPlayers.sort((a, b) => {
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
		const topPlayers = otherPlayers.slice(0, RATING_SYNC_TOP_PLAYERS);

		// Save to local "others" database for this account
		const sanitizedName = this.getSanitizedLocalPlayerName();
		const othersData = {
			version: 1,
			seasonId: this.seasonId,
			checksum: '', // Will be generated by writeOthersRatings
			players: topPlayers,
			playerCount: topPlayers.length,
		};

		writeOthersRatings(othersData, sanitizedName, this.seasonId, DEVELOPER_MODE);
	}

	/**
	 * Merge all received player data and save to local "others" database
	 * Also loads data into RatingManager's memory for use during the game
	 * @param allPlayers Array of all player data (from sync + local "others" + Computer players)
	 */
	private mergeAndSave(allPlayers: PlayerRatingData[]): void {
		// Load all players into RatingManager's memory for use during the game
		const ratingManager = RatingManager.getInstance();
		ratingManager.loadPlayersFromSync(allPlayers);

		// Initialize all current game players with default data (if they don't have any)
		// This ensures the leaderboard shows all players even in fresh games
		const currentPlayers: ActivePlayer[] = [];
		PlayerManager.getInstance().players.forEach((player) => {
			currentPlayers.push(player);
		});
		ratingManager.initializeCurrentGamePlayers(currentPlayers);

		// Save local player's rating file immediately (creates file for new players)
		// This ensures crash recovery works even if player leaves before game ends
		const localPlayer = GetLocalPlayer();
		const localBtag = NameManager.getInstance().getBtag(localPlayer);
		if (localBtag) {
			ratingManager.savePlayerRating(localBtag);
		}

		// Save "others" file with ALL loaded players (including newly initialized ones)
		// This ensures computer players (in dev mode) get saved to the "others" file
		const allLoadedPlayers = ratingManager.getAllLoadedPlayers();
		this.saveOthersFile(allLoadedPlayers);

		// Mark sync as fully complete - safe for UI to access now
		this.syncFullyCompleted = true;
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
	 * Reset sync state for testing
	 */
	public reset(): void {
		this.isComplete = false;
		this.syncFullyCompleted = false;
		this.receivedPlayerData = new Map();
		this.expectedPlayerCount = 0;
		this.completedSyncs = 0;
	}
}
