import { PlayerRatingData } from './types';
import { readRatings, validateChecksum } from './rating-file-handler';
import { readOthersRatings, writeOthersRatings } from './global-rating-handler';
import { HexColors } from '../utils/hex-colors';
import { NameManager } from '../managers/names/name-manager';
import { ActivePlayer } from '../player/types/active-player';
import {
	RANKED_SEASON_ID,
	RANKED_SEASON_RESET_KEY,
	RATING_SYNC_TIMEOUT,
	RATING_SYNC_TOP_PLAYERS
} from 'src/configs/game-settings';
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
	 * Uses staggered SyncRequest creation to prevent frame lag with many players
	 * @param humanPlayers Array of human players (excludes AI)
	 */
	public startSync(humanPlayers: ActivePlayer[]): void {
		const localPlayer = GetLocalPlayer();
		const localPlayerId = GetPlayerId(localPlayer);
		const localBtag = NameManager.getInstance().getBtag(localPlayer);
		const isLocalObserver = IsPlayerObserver(localPlayer);

		debugPrint(`[RATING SYNC] ========== SYNC START ==========`);
		debugPrint(`[RATING SYNC] Local player: ${localBtag} (id=${localPlayerId}, isObserver=${isLocalObserver})`);
		debugPrint(`[RATING SYNC] Human players count: ${humanPlayers.length}`);

		// Log all human players
		for (let i = 0; i < humanPlayers.length; i++) {
			const ap = humanPlayers[i];
			const p = ap.getPlayer();
			const pId = GetPlayerId(p);
			const pBtag = NameManager.getInstance().getBtag(p);
			const pIsObs = IsPlayerObserver(p);
			debugPrint(`[RATING SYNC]   Player ${i}: ${pBtag} (id=${pId}, isObserver=${pIsObs})`);
		}

		// If single player (no other humans to sync with), just load local data
		if (humanPlayers.length < 2) {
			debugPrint(`[RATING SYNC] Only ${humanPlayers.length} human(s), using local-only mode`);
			this.loadLocalDataOnly();
			return;
		}

		// Filter out observers - WC3's BlzSendSyncData() doesn't work for observers
		// Observers can't send sync data, so we only create SyncRequests for non-observer players
		const nonObserverPlayers: ActivePlayer[] = [];
		for (let i = 0; i < humanPlayers.length; i++) {
			const ap = humanPlayers[i];
			if (!IsPlayerObserver(ap.getPlayer())) {
				nonObserverPlayers.push(ap);
			}
		}

		debugPrint(`[RATING SYNC] Non-observer players: ${nonObserverPlayers.length} (filtered from ${humanPlayers.length})`);

		// If no non-observer players (all observers), use local-only mode
		// Observers can't send sync data, so there's nothing to sync
		if (nonObserverPlayers.length < 1) {
			debugPrint(`[RATING SYNC] Only observers in lobby, using local-only mode`);
			this.loadLocalDataOnly();
			return;
		}

		debugPrint(`[RATING SYNC] Starting P2P sync with ${nonObserverPlayers.length} non-observer players, timeout=${RATING_SYNC_TIMEOUT}s`);

		this.expectedPlayerCount = nonObserverPlayers.length;
		this.completedSyncs = 0;

		// Stagger SyncRequest creation to prevent frame lag
		// Create one SyncRequest every 0.1 seconds for smoother performance
		const SYNC_STAGGER_DELAY = 0.1;
		let currentIndex = 0;
		const syncStartTime = os.time();

		const staggerTimer = CreateTimer();
		TimerStart(staggerTimer, SYNC_STAGGER_DELAY, true, () => {
			if (currentIndex >= nonObserverPlayers.length) {
				// All SyncRequests created, stop the timer
				PauseTimer(staggerTimer);
				DestroyTimer(staggerTimer);
				debugPrint(`[RATING SYNC] All ${nonObserverPlayers.length} SyncRequests created`);
				return;
			}

			const activePlayer = nonObserverPlayers[currentIndex];
			const player = activePlayer.getPlayer();
			const playerId = GetPlayerId(player);
			const playerBtag = NameManager.getInstance().getBtag(player);
			const isObserver = IsPlayerObserver(player);
			const isSource = player === localPlayer;

			debugPrint(`[RATING SYNC] Creating SyncRequest ${currentIndex + 1}/${nonObserverPlayers.length} for ${playerBtag} (id=${playerId}, isObserver=${isObserver}, isSource=${isSource})`);

			// Build the data to sync for this player
			const dataToSync = this.buildPlayerSyncData(player);
			const serializedData = this.serializePlayerData(dataToSync);

			debugPrint(`[RATING SYNC]   -> Built ${dataToSync.length} players to sync (serialized length: ${serializedData.length} chars)`);

			// Create SyncRequest - w3ts handles chunking automatically
			const mapPlayer = MapPlayer.fromHandle(player);
			new SyncRequest(mapPlayer, serializedData)
				.then((res, req) => {
					const elapsed = os.time() - syncStartTime;
					const receivedPlayers = this.deserializePlayerData(res.data);
					debugPrint(`[RATING SYNC] SyncRequest COMPLETED for ${playerBtag} (id=${playerId}) after ${elapsed}s`);
					debugPrint(`[RATING SYNC]   -> Received ${receivedPlayers.length} players (data length: ${res.data.length} chars)`);
					if (receivedPlayers.length > 0 && receivedPlayers.length <= 5) {
						// Log individual players if only a few
						for (let j = 0; j < receivedPlayers.length; j++) {
							debugPrint(`[RATING SYNC]   -> Player ${j}: ${receivedPlayers[j].btag} (rating=${receivedPlayers[j].rating})`);
						}
					} else if (receivedPlayers.length > 5) {
						// Just log first and last few
						debugPrint(`[RATING SYNC]   -> First: ${receivedPlayers[0].btag} (rating=${receivedPlayers[0].rating})`);
						debugPrint(`[RATING SYNC]   -> Last: ${receivedPlayers[receivedPlayers.length - 1].btag}`);
					}
					this.handleSyncComplete(playerId, res.data);
				})
				.catch((res, req) => {
					const elapsed = os.time() - syncStartTime;
					debugPrint(`[RATING SYNC] SyncRequest FAILED/TIMEOUT for ${playerBtag} (id=${playerId}) after ${elapsed}s`);
					this.handleSyncComplete(playerId, '');
				});

			currentIndex++;
		});

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
		const targetBtag = NameManager.getInstance().getBtag(player);
		const localBtag = NameManager.getInstance().getBtag(localPlayer);

		// Only the local player builds their actual data
		if (player !== localPlayer) {
			debugPrint(`[RATING SYNC] buildPlayerSyncData: Skipping ${targetBtag} (not local player ${localBtag})`);
			return playersToSync;
		}

		const nameManager = NameManager.getInstance();
		const btag = nameManager.getBtag(localPlayer);

		if (!btag) {
			debugPrint(`[RATING SYNC] buildPlayerSyncData: ERROR - No btag for local player!`);
			return playersToSync;
		}

		debugPrint(`[RATING SYNC] buildPlayerSyncData: Building data for local player ${btag}`);

		// 1. Add personal rating data
		const hash = this.sanitizePlayerName(btag);
		const resetKey = RANKED_SEASON_RESET_KEY || '';
		// Must use .txt extension - WC3 only supports .txt and .pld file extensions
		const filePath = `risk/p${this.seasonId}${resetKey}_${hash}.txt`;
		debugPrint(`[RATING SYNC]   -> Reading personal file: ${filePath}`);
		const ratingFile = readRatings(filePath);

		// Validate checksum if file exists
		const isValidFile = ratingFile && validateChecksum(ratingFile);
		debugPrint(`[RATING SYNC]   -> Personal file exists: ${ratingFile !== null}, valid: ${isValidFile}`);
		if (ratingFile && !isValidFile) {
			print(`${HexColors.RED}WARNING:|r Your rating file was corrupted. Starting fresh with default rating.`);
		}

		if (isValidFile) {
			// Finalize pending game if exists (crash recovery)
			// This ensures other players receive the correct updated values
			if (ratingFile.player.pendingGame) {
				const pg = ratingFile.player.pendingGame;
				ratingFile.player.rating = pg.rating;
				ratingFile.player.wins = pg.wins;
				ratingFile.player.losses = pg.losses;
				ratingFile.player.gamesPlayed = pg.gamesPlayed;
				ratingFile.player.totalKillValue = pg.totalKillValue;
				ratingFile.player.totalDeathValue = pg.totalDeathValue;
				ratingFile.player.totalPlacement = pg.totalPlacement;
				ratingFile.player.lastUpdated = pg.timestamp;
				delete ratingFile.player.pendingGame;
				debugPrint(`[RATING SYNC]   -> Finalized pending game for sync: ${btag}`);
			}
			debugPrint(`[RATING SYNC]   -> Personal data: rating=${ratingFile.player.rating}, games=${ratingFile.player.gamesPlayed}`);
			playersToSync.push(ratingFile.player);
		} else {
			// New player or corrupted file - add default starting data
			debugPrint(`[RATING SYNC]   -> Using default data (new player or corrupted file)`);
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
		debugPrint(`[RATING SYNC]   -> Reading others database for hash: ${hash}`);
		const othersData = readOthersRatings(hash, this.seasonId);
		if (othersData && othersData.players.length > 0) {
			debugPrint(`[RATING SYNC]   -> Others database has ${othersData.players.length} players`);
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
			let addedCount = 0;
			for (let i = 0; i < topPlayers.length; i++) {
				const otherPlayer = topPlayers[i];
				if (otherPlayer.btag !== btag) {
					playersToSync.push(otherPlayer);
					addedCount++;
				}
			}
			debugPrint(`[RATING SYNC]   -> Added ${addedCount} players from others database`);
		} else {
			debugPrint(`[RATING SYNC]   -> No others database found or empty`);
		}

		debugPrint(`[RATING SYNC]   -> Total players to sync: ${playersToSync.length}`);
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
			lines.push(
				`${p.btag}:${math.floor(p.rating || 0)}:${math.floor(p.gamesPlayed || 0)}:${math.floor(p.lastUpdated || 0)}:${math.floor(p.wins || 0)}:${math.floor(p.losses || 0)}:${math.floor(p.totalKillValue || 0)}:${math.floor(p.totalDeathValue || 0)}:${math.floor(p.totalPlacement || 0)}`
			);
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
					totalPlacement: parts.length >= 9 ? tonumber(parts[8]) || 0 : 0,
				});
			}
		}
		return players;
	}

	/**
	 * Handle completed sync from a player
	 */
	private handleSyncComplete(playerId: number, data: string): void {
		debugPrint(`[RATING SYNC] handleSyncComplete: playerId=${playerId}, isComplete=${this.isComplete}, completedSyncs=${this.completedSyncs}/${this.expectedPlayerCount}`);

		if (this.isComplete) {
			debugPrint(`[RATING SYNC]   -> Ignoring (sync already complete)`);
			return; // Already completed
		}

		const players = this.deserializePlayerData(data);
		this.receivedPlayerData.set(playerId, players);
		this.completedSyncs++;

		debugPrint(`[RATING SYNC]   -> Stored ${players.length} players for playerId=${playerId}`);
		debugPrint(`[RATING SYNC]   -> Progress: ${this.completedSyncs}/${this.expectedPlayerCount} syncs complete`);

		// Check if all syncs are complete
		if (this.completedSyncs >= this.expectedPlayerCount) {
			debugPrint(`[RATING SYNC]   -> All syncs received, calling completeSync()`);
			this.completeSync();
		}
	}

	/**
	 * Start timeout timer for sync completion
	 */
	private startTimeoutTimer(): void {
		debugPrint(`[RATING SYNC] Starting timeout timer: ${RATING_SYNC_TIMEOUT}s`);
		const timeoutTimer = CreateTimer();

		TimerStart(timeoutTimer, RATING_SYNC_TIMEOUT, false, () => {
			DestroyTimer(timeoutTimer);
			debugPrint(`[RATING SYNC] TIMEOUT TRIGGERED! isComplete=${this.isComplete}, completedSyncs=${this.completedSyncs}/${this.expectedPlayerCount}`);
			if (!this.isComplete) {
				debugPrint(`[RATING SYNC]   -> Forcing completeSync() due to timeout`);
				this.completeSync();
			} else {
				debugPrint(`[RATING SYNC]   -> Sync already complete, timeout ignored`);
			}
		});
	}

	/**
	 * Load local data only (no P2P sync)
	 * Used for single player games or when sync is disabled
	 */
	private loadLocalDataOnly(): void {
		debugPrint(`[RATING SYNC] ========== LOCAL ONLY MODE ==========`);

		const receivedPlayers: PlayerRatingData[] = [];

		// Add local player's own data (most accurate)
		const localPlayer = GetLocalPlayer();
		const nameManager = NameManager.getInstance();
		const btag = nameManager.getBtag(localPlayer);
		const isLocalObserver = IsPlayerObserver(localPlayer);

		debugPrint(`[RATING SYNC] Local player: ${btag} (isObserver=${isLocalObserver})`);

		if (btag) {
			const hash = this.sanitizePlayerName(btag);
			const resetKey = RANKED_SEASON_RESET_KEY || '';
			// Must use .txt extension - WC3 only supports .txt and .pld file extensions
			const filePath = `risk/p${this.seasonId}${resetKey}_${hash}.txt`;
			const ratingFile = readRatings(filePath);

			// Validate checksum if file exists
			const isValidFile = ratingFile && validateChecksum(ratingFile);
			if (ratingFile && !isValidFile) {
				print(`${HexColors.RED}WARNING:|r Your rating file was corrupted. Starting fresh with default rating.`);
			}

			if (isValidFile) {
				// Finalize pending game if exists (crash recovery)
				// This applies the pending game values to the base player data
				if (ratingFile.player.pendingGame) {
					const pg = ratingFile.player.pendingGame;
					ratingFile.player.rating = pg.rating;
					ratingFile.player.wins = pg.wins;
					ratingFile.player.losses = pg.losses;
					ratingFile.player.gamesPlayed = pg.gamesPlayed;
					ratingFile.player.totalKillValue = pg.totalKillValue;
					ratingFile.player.totalDeathValue = pg.totalDeathValue;
					ratingFile.player.totalPlacement = pg.totalPlacement;
					ratingFile.player.lastUpdated = pg.timestamp;
					delete ratingFile.player.pendingGame;
					debugPrint(`[RATING SYNC] Finalized pending game for ${btag}`);
				}
				receivedPlayers.push(ratingFile.player);
			} else {
				// New player or corrupted file - add default starting data (same as P2P sync does)
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
		this.loadOthersDatabase(receivedPlayers);

		// Sort all players by rating and take top N for consistent leaderboard
		const sortedPlayers = receivedPlayers.slice().sort((a, b) => {
			if (b.rating !== a.rating) {
				return b.rating - a.rating;
			}
			if (b.gamesPlayed !== a.gamesPlayed) {
				return b.gamesPlayed - a.gamesPlayed;
			}
			if (a.btag < b.btag) return -1;
			if (a.btag > b.btag) return 1;
			return 0;
		});
		const topPlayers = sortedPlayers.slice(0, RATING_SYNC_TOP_PLAYERS);

		// Load only top N players into memory
		const ratingManager = RatingManager.getInstance();
		ratingManager.loadPlayersFromSync(topPlayers);

		// Initialize all current game players with default data (if they don't have any)
		// If not in top N, they'll have _isSynced = false and won't appear in leaderboard
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

		// Save "others" file with top N players
		this.saveOthersFile(topPlayers);

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
		debugPrint(`[RATING SYNC] loadOthersDatabase: Loading for hash ${sanitizedName}`);

		const othersData = readOthersRatings(sanitizedName, this.seasonId);

		if (!othersData || othersData.players.length === 0) {
			debugPrint(`[RATING SYNC]   -> No others data found or empty`);
			return;
		}

		debugPrint(`[RATING SYNC]   -> Found ${othersData.players.length} players in others database`);

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
		let addedCount = 0;
		let skippedCount = 0;
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
				addedCount++;
			} else {
				skippedCount++;
			}
		}

		debugPrint(`[RATING SYNC]   -> Added ${addedCount} players, skipped ${skippedCount} duplicates`);
	}

	/**
	 * Complete sync process - merge all received player databases
	 * Implements distributed rating system with deduplication (keeping newest data)
	 * Uses batched processing to prevent frame lag with many players
	 */
	private completeSync(): void {
		debugPrint(`[RATING SYNC] ========== COMPLETE SYNC ==========`);
		debugPrint(`[RATING SYNC] isComplete=${this.isComplete}, completedSyncs=${this.completedSyncs}/${this.expectedPlayerCount}`);

		if (this.isComplete) {
			debugPrint(`[RATING SYNC]   -> Already complete, returning`);
			return;
		}

		this.isComplete = true;

		// Extract self-reported entries (first entry from each player's payload is their own data)
		// These are authoritative and will override any other data about the same player
		const selfReportedData: Map<string, PlayerRatingData> = new Map();

		// Flatten all received player data into a single array for batched processing
		const allReceivedPlayers: PlayerRatingData[] = [];
		debugPrint(`[RATING SYNC] Received data from ${this.receivedPlayerData.size} players:`);
		this.receivedPlayerData.forEach((playersData, playerId) => {
			const count = playersData ? playersData.length : 0;
			debugPrint(`[RATING SYNC]   -> playerId=${playerId}: ${count} players`);
			if (playersData && playersData.length > 0) {
				// First entry is always the player's own self-reported data
				selfReportedData.set(playersData[0].btag, playersData[0]);
				for (let i = 0; i < playersData.length; i++) {
					allReceivedPlayers.push(playersData[i]);
				}
			}
		});
		debugPrint(`[RATING SYNC] Total received players (before dedup): ${allReceivedPlayers.length}`);
		debugPrint(`[RATING SYNC] Self-reported entries: ${selfReportedData.size}`);

		// Map to track all players (btag -> PlayerRatingData)
		// When duplicates exist, keep the one with newest lastUpdated timestamp
		const allPlayersMap: Map<string, PlayerRatingData> = new Map();

		// Helper function to add or merge player data
		const addOrMergePlayer = (player: PlayerRatingData) => {
			const existing = allPlayersMap.get(player.btag);
			if (!existing) {
				allPlayersMap.set(player.btag, player);
			} else {
				if (player.lastUpdated > existing.lastUpdated) {
					allPlayersMap.set(player.btag, player);
				}
			}
		};

		// Batch processing configuration - use conservative values for smoother performance
		const BATCH_SIZE = 50; // Process 50 players per frame
		const BATCH_DELAY = 0.05; // Spread work across more frames
		let currentIndex = 0;

		const processBatch = () => {
			// Process a batch of players
			const endIndex = Math.min(currentIndex + BATCH_SIZE, allReceivedPlayers.length);
			for (let i = currentIndex; i < endIndex; i++) {
				addOrMergePlayer(allReceivedPlayers[i]);
			}
			currentIndex = endIndex;

			if (currentIndex < allReceivedPlayers.length) {
				// More players to process, schedule next batch
				const batchTimer = CreateTimer();
				TimerStart(batchTimer, BATCH_DELAY, false, () => {
					DestroyTimer(batchTimer);
					processBatch();
				});
			} else {
				// All players processed, finalize sync
				this.finalizeSyncAfterBatching(allPlayersMap, allReceivedPlayers.length, selfReportedData);
			}
		};

		// Start batch processing (or finalize immediately if no data)
		if (allReceivedPlayers.length > 0) {
			processBatch();
		} else {
			this.finalizeSyncAfterBatching(allPlayersMap, 0, selfReportedData);
		}
	}

	/**
	 * Finalize sync after batched processing is complete
	 * @param allPlayersMap Map of merged player data
	 * @param totalPlayersReceived Total count of players received from sync
	 * @param selfReportedData Self-reported entries from active game players (authoritative)
	 */
	private finalizeSyncAfterBatching(allPlayersMap: Map<string, PlayerRatingData>, totalPlayersReceived: number, selfReportedData: Map<string, PlayerRatingData>): void {
		debugPrint(`[RATING SYNC] ========== FINALIZE SYNC ==========`);
		debugPrint(`[RATING SYNC] allPlayersMap size: ${allPlayersMap.size}, totalPlayersReceived: ${totalPlayersReceived}`);

		// Override with self-reported data from active game players
		// A player's own data is always authoritative over what others have about them
		debugPrint(`[RATING SYNC] Applying ${selfReportedData.size} self-reported overrides...`);
		selfReportedData.forEach((playerData, playerBtag) => {
			const existing = allPlayersMap.get(playerBtag);
			if (existing) {
				debugPrint(`[RATING SYNC]   -> Override ${playerBtag}: rating ${existing.rating} -> ${playerData.rating} (self-reported)`);
			} else {
				debugPrint(`[RATING SYNC]   -> Adding ${playerBtag}: rating=${playerData.rating} (self-reported)`);
			}
			allPlayersMap.set(playerBtag, playerData);
		});

		// Ensure local player has data (from personal file or fresh default)
		const localPlayer = GetLocalPlayer();
		const nameManager = NameManager.getInstance();
		const btag = nameManager.getBtag(localPlayer);
		const isLocalObserver = IsPlayerObserver(localPlayer);
		debugPrint(`[RATING SYNC] Local player: ${btag} (isObserver=${isLocalObserver})`);

		if (btag && !allPlayersMap.has(btag)) {
			// Local player not in sync data at all - read personal file or create fresh default
			const hash = this.sanitizePlayerName(btag);
			const resetKey = RANKED_SEASON_RESET_KEY || '';
			const filePath = `risk/p${this.seasonId}${resetKey}_${hash}.txt`;
			const ratingFile = readRatings(filePath);
			const isValidFile = ratingFile && validateChecksum(ratingFile);

			if (ratingFile && !isValidFile) {
				print(`${HexColors.RED}WARNING:|r Your rating file was corrupted. Starting fresh with default rating.`);
			}

			if (isValidFile) {
				allPlayersMap.set(ratingFile.player.btag, ratingFile.player);
			} else {
				const timestamp = math.floor(os.time());
				allPlayersMap.set(btag, {
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

		// Convert map to array
		const mergedPlayers: PlayerRatingData[] = [];
		allPlayersMap.forEach((player) => {
			mergedPlayers.push(player);
		});

		debugPrint(`[RATING SYNC] Merged players count: ${mergedPlayers.length}`);

		// If P2P sync failed (no data received from other players), load local "others" database as fallback
		if (totalPlayersReceived === 0) {
			debugPrint(`[RATING SYNC] WARNING: No data received from sync! Using FALLBACK path`);
			const fallbackPlayers: PlayerRatingData[] = [];

			// Add players already in mergedPlayers (local player's personal file)
			for (let i = 0; i < mergedPlayers.length; i++) {
				fallbackPlayers.push(mergedPlayers[i]);
			}

			// Load local "others" database
			debugPrint(`[RATING SYNC]   -> Loading local others database...`);
			this.loadOthersDatabase(fallbackPlayers);
			debugPrint(`[RATING SYNC]   -> After loading others: ${fallbackPlayers.length} players`);

			// Use fallback data instead of empty merged data
			this.mergeAndSave(fallbackPlayers);
		} else {
			// Normal P2P sync succeeded
			debugPrint(`[RATING SYNC] P2P sync succeeded with ${totalPlayersReceived} total entries, using NORMAL path`);
			this.mergeAndSave(mergedPlayers);
		}
	}

	/**
	 * Save "others" rating file with top N OTHER players (excluding local player)
	 * IMPORTANT: Merges with existing "others" database to prevent data loss from sync issues
	 * Sorts by rating and limits to RATING_SYNC_TOP_PLAYERS to prevent unbounded growth
	 * @param allPlayers Array of all player data from sync
	 */
	private saveOthersFile(allPlayers: PlayerRatingData[]): void {
		debugPrint(`[RATING SYNC] saveOthersFile: Input ${allPlayers.length} players from sync`);

		// Get local player's btag (to exclude from "others" database)
		const localPlayer = GetLocalPlayer();
		const nameManager = NameManager.getInstance();
		const localBtag = nameManager.getBtag(localPlayer);
		const isLocalObserver = IsPlayerObserver(localPlayer);
		const sanitizedName = this.getSanitizedLocalPlayerName();

		debugPrint(`[RATING SYNC]   -> Local player: ${localBtag} (isObserver=${isLocalObserver})`);

		// CRITICAL FIX: Load existing "others" database first and merge with synced data
		// This prevents data loss when sync fails or returns incomplete data (common with observers)
		// Same pattern as updateOthersDatabase() uses at game end
		const existingOthersData = readOthersRatings(sanitizedName, this.seasonId);
		const playerMap = new Map<string, PlayerRatingData>();

		// Add existing players from "others" database first
		if (existingOthersData && existingOthersData.players.length > 0) {
			debugPrint(`[RATING SYNC]   -> Loading existing others database: ${existingOthersData.players.length} players`);
			for (let i = 0; i < existingOthersData.players.length; i++) {
				const player = existingOthersData.players[i];
				if (player.btag !== localBtag) {
					playerMap.set(player.btag, player);
				}
			}
		} else {
			debugPrint(`[RATING SYNC]   -> No existing others database found`);
		}

		// Merge synced players (newer timestamp wins)
		let updatedCount = 0;
		let newCount = 0;
		for (let i = 0; i < allPlayers.length; i++) {
			const player = allPlayers[i];
			if (player.btag === localBtag) {
				continue; // Skip self
			}

			const existing = playerMap.get(player.btag);
			if (!existing) {
				playerMap.set(player.btag, player);
				newCount++;
			} else if (player.lastUpdated > existing.lastUpdated) {
				playerMap.set(player.btag, player);
				updatedCount++;
			}
		}

		debugPrint(`[RATING SYNC]   -> Merged: ${newCount} new, ${updatedCount} updated, ${playerMap.size} total`);

		if (playerMap.size === 0) {
			debugPrint(`[RATING SYNC]   -> No other players to save, returning`);
			return;
		}

		// Convert map to array
		const mergedPlayers: PlayerRatingData[] = [];
		playerMap.forEach((player) => {
			mergedPlayers.push(player);
		});

		// Sort by rating (descending) to keep the best players
		mergedPlayers.sort((a, b) => {
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
		const topPlayers = mergedPlayers.slice(0, RATING_SYNC_TOP_PLAYERS);

		debugPrint(`[RATING SYNC]   -> After limit: ${topPlayers.length} players (limit=${RATING_SYNC_TOP_PLAYERS})`);
		if (topPlayers.length > 0) {
			debugPrint(`[RATING SYNC]   -> First: ${topPlayers[0].btag} (rating=${topPlayers[0].rating})`);
			if (topPlayers.length > 1) {
				debugPrint(`[RATING SYNC]   -> Last: ${topPlayers[topPlayers.length - 1].btag} (rating=${topPlayers[topPlayers.length - 1].rating})`);
			}
		}

		// Save to local "others" database for this account
		const othersData = {
			version: 1,
			seasonId: this.seasonId,
			checksum: '', // Will be generated by writeOthersRatings
			players: topPlayers,
			playerCount: topPlayers.length,
		};

		debugPrint(`[RATING SYNC]   -> Writing to others file for hash: ${sanitizedName}`);
		writeOthersRatings(othersData, sanitizedName, this.seasonId);
		debugPrint(`[RATING SYNC]   -> Others file saved successfully`);
	}

	/**
	 * Merge all received player data and save to local "others" database
	 * Also loads data into RatingManager's memory for use during the game
	 * Filters to top N players by rating to ensure consistent leaderboard across all players
	 * @param allPlayers Array of all player data (from sync + local "others" database)
	 */
	private mergeAndSave(allPlayers: PlayerRatingData[]): void {
		debugPrint(`[RATING SYNC] ========== MERGE AND SAVE ==========`);
		debugPrint(`[RATING SYNC] Input: ${allPlayers.length} players to process`);

		const ratingManager = RatingManager.getInstance();

		// Sort all merged players by rating (descending) to find the global top N
		const sortedPlayers = allPlayers.slice().sort((a, b) => {
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

		// Take only top N players - this ensures everyone's leaderboard shows the same players
		// RATING_SYNC_TOP_PLAYERS defines the leaderboard size (e.g., 100)
		const topPlayers = sortedPlayers.slice(0, RATING_SYNC_TOP_PLAYERS);
		debugPrint(`[RATING SYNC] Sorted and took top ${topPlayers.length} players (limit: ${RATING_SYNC_TOP_PLAYERS})`);

		if (topPlayers.length > 0) {
			debugPrint(`[RATING SYNC]   -> Top player: ${topPlayers[0].btag} (rating=${topPlayers[0].rating})`);
			if (topPlayers.length > 1) {
				debugPrint(`[RATING SYNC]   -> Last player: ${topPlayers[topPlayers.length - 1].btag} (rating=${topPlayers[topPlayers.length - 1].rating})`);
			}
		}

		// Load only top N players into memory (marked as synced)
		// This ensures leaderboard shows exactly top N players
		debugPrint(`[RATING SYNC] Loading ${topPlayers.length} players into RatingManager memory...`);
		ratingManager.loadPlayersFromSync(topPlayers);

		// Initialize current game players with default data if they're not in top N
		// These will have _isSynced = false, so they won't appear in leaderboard
		// but their data is still available for in-game display
		const currentPlayers: ActivePlayer[] = [];
		PlayerManager.getInstance().players.forEach((player) => {
			currentPlayers.push(player);
		});
		debugPrint(`[RATING SYNC] Initializing ${currentPlayers.length} current game players...`);
		ratingManager.initializeCurrentGamePlayers(currentPlayers);

		// Ensure local player's personal file is loaded (finalizes any pending entry)
		// This must happen before saving to prevent sync data from overwriting authoritative personal file data
		const localPlayer = GetLocalPlayer();
		const localBtag = NameManager.getInstance().getBtag(localPlayer);
		if (localBtag) {
			debugPrint(`[RATING SYNC] Ensuring personal file loaded for ${localBtag}...`);
			ratingManager.loadPlayerRating(localBtag);
			debugPrint(`[RATING SYNC] Saving personal rating file for ${localBtag}...`);
			ratingManager.savePlayerRating(localBtag);
		}

		// Save "others" file with top N players (excluding local player)
		// Use the same topPlayers list to ensure consistency
		debugPrint(`[RATING SYNC] Saving others file with ${topPlayers.length} players...`);
		this.saveOthersFile(topPlayers);

		// Mark sync as fully complete - safe for UI to access now
		this.syncFullyCompleted = true;
		debugPrint(`[RATING SYNC] ========== SYNC FULLY COMPLETE ==========`);
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
			hash1 = (hash1 << 5) + hash1 + name.charCodeAt(i);
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
