import { PlayerRatingData, SyncBuffer } from './types';
import { readRatings } from './rating-file-handler';
import { readGlobalRatings, writeGlobalRatings } from './global-rating-handler';
import {
	encodePlayerDataForSync,
	encodeSyncMessageToString,
	decodeSyncMessage,
	reassembleChunks,
	validateSyncMessage,
} from './rating-sync-protocol';
import { NameManager } from '../managers/names/name-manager';
import { ActivePlayer } from '../player/types/active-player';
import { RANKED_SEASON_ID, RATING_SYNC_ENABLED, RATING_SYNC_TIMEOUT, RATING_SYNC_CHUNK_DELAY } from 'src/configs/game-settings';
import { debugPrint } from '../utils/debug-print';

/**
 * Singleton manager for P2P rating synchronization
 * Coordinates the exchange of rating data between players at game start
 */
export class RatingSyncManager {
	private static instance: RatingSyncManager;

	private syncCache: gamecache;
	private syncBuffer: SyncBuffer;
	private isComplete: boolean;
	private isDeveloperMode: boolean;
	private seasonId: number;

	/**
	 * Private constructor to ensure singleton pattern
	 */
	private constructor() {
		this.isComplete = false;
		this.isDeveloperMode = false;
		this.seasonId = RANKED_SEASON_ID;

		// Initialize sync buffer
		this.syncBuffer = {
			chunks: new Map(),
			completedPlayers: new Set(),
			expectedPlayerCount: 0,
		};
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
	 * Enable developer mode (uses separate file path)
	 */
	public enableDeveloperMode(): void {
		this.isDeveloperMode = true;
	}

	/**
	 * Check if developer mode is enabled
	 * @returns True if in developer mode
	 */
	public isDeveloperModeEnabled(): boolean {
		return this.isDeveloperMode;
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
			return;
		}

		// Must have at least 2 players for sync to be useful
		if (humanPlayers.length < 2) {
			debugPrint('[RATING SYNC] Not enough players for sync');
			return;
		}

		debugPrint(`[RATING SYNC] Starting sync with ${humanPlayers.length} players`);

		// Initialize GameCache for sync
		this.initializeCache();

		// Setup expected player count
		this.syncBuffer.expectedPlayerCount = humanPlayers.length;

		// Broadcast local player's rating data
		this.broadcastPersonalRating();

		// Start collection timer (polls for data from other players)
		this.startCollectionTimer(humanPlayers);
	}

	/**
	 * Initialize the GameCache for sync
	 */
	private initializeCache(): void {
		// Flush any existing cache
		FlushGameCache(InitGameCache('rating_sync.dat'));

		// Create new cache
		this.syncCache = InitGameCache('rating_sync.dat');

		debugPrint('[RATING SYNC] Cache initialized');
	}

	/**
	 * Start collection timer to poll for data from other players
	 * Uses periodic polling instead of events since GameCache doesn't support triggers
	 * @param humanPlayers Array of human players
	 */
	private startCollectionTimer(humanPlayers: ActivePlayer[]): void {
		const collectionTimer = CreateTimer();
		let elapsed = 0.0;
		const pollInterval = 0.5; // Poll every 0.5 seconds

		TimerStart(collectionTimer, pollInterval, true, () => {
			elapsed += pollInterval;

			// Poll data from all players
			for (let i = 0; i < humanPlayers.length; i++) {
				const activePlayer = humanPlayers[i];
				const playerId = GetPlayerId(activePlayer.getPlayer());

				// Don't read our own data (we already have it)
				if (activePlayer.getPlayer() === GetLocalPlayer()) {
					continue;
				}

				// Try to read chunks from this player
				this.pollPlayerData(playerId);
			}

			// Stop after timeout
			if (elapsed >= RATING_SYNC_TIMEOUT) {
				PauseTimer(collectionTimer);
				DestroyTimer(collectionTimer);
				debugPrint('[RATING SYNC] Collection timeout reached');
				this.completeSync();
			}
		});

		debugPrint('[RATING SYNC] Collection timer started');
	}

	/**
	 * Broadcast local player's personal rating data
	 */
	private broadcastPersonalRating(): void {
		const localPlayer = GetLocalPlayer();
		const playerId = GetPlayerId(localPlayer);

		// Get player's BattleTag
		const nameManager = NameManager.getInstance();
		const btag = nameManager.getBtag(localPlayer);

		if (!btag) {
			debugPrint('[RATING SYNC] No BattleTag found for local player');
			return;
		}

		// Load personal rating file
		const sanitizedName = this.sanitizePlayerName(btag);
		const prefix = this.isDeveloperMode ? 'dev_ratings' : 'ratings';
		const filePath = `risk/${prefix}_${sanitizedName}_s${this.seasonId}.txt`;
		const ratingFile = readRatings(filePath);

		if (!ratingFile) {
			debugPrint('[RATING SYNC] No personal rating file found - skipping broadcast');
			return;
		}

		// Encode player data into chunks
		const messages = encodePlayerDataForSync(ratingFile.player, playerId);

		debugPrint(`[RATING SYNC] Broadcasting ${messages.length} chunks`);

		// Broadcast each chunk with a small delay between them
		let delay = 0.0;
		for (let i = 0; i < messages.length; i++) {
			const message = messages[i];
			const timer = CreateTimer();

			TimerStart(timer, delay, false, () => {
				DestroyTimer(timer);

				// Only local player broadcasts
				if (GetLocalPlayer() === localPlayer) {
					const protocolString = encodeSyncMessageToString(message);
					const key = `sync:${playerId}:${message.chunkIndex}`;

					// Store and sync
					StoreString(this.syncCache, 'data', key, protocolString);
					SyncStoredString(this.syncCache, 'data', key);

					debugPrint(`[RATING SYNC] Sent chunk ${message.chunkIndex + 1}/${messages.length}`);
				}
			});

			delay += RATING_SYNC_CHUNK_DELAY;
		}
	}

	/**
	 * Poll data from a specific player
	 * Reads all available chunks from the GameCache
	 * @param senderId Player ID to poll data from
	 */
	private pollPlayerData(senderId: number): void {
		// Skip if already completed
		if (this.syncBuffer.completedPlayers.has(senderId)) {
			return;
		}

		// Try to read chunks from this player
		// We don't know the total chunks yet, so try up to 10 chunks
		for (let chunkIdx = 0; chunkIdx < 10; chunkIdx++) {
			const key = `sync:${senderId}:${chunkIdx}`;
			const protocolString = GetStoredString(this.syncCache, 'data', key);

			if (!protocolString || protocolString === '') {
				continue;
			}

			// Decode message
			const message = decodeSyncMessage(protocolString);
			if (!message) {
				continue;
			}

			// Validate message
			if (!validateSyncMessage(message)) {
				continue;
			}

			// Store chunk in buffer
			if (!this.syncBuffer.chunks.has(senderId)) {
				this.syncBuffer.chunks.set(senderId, new Map());
			}

			const playerChunks = this.syncBuffer.chunks.get(senderId);
			if (playerChunks) {
				// Only add if we don't already have this chunk
				if (!playerChunks.has(message.chunkIndex)) {
					playerChunks.set(message.chunkIndex, message.payload);
				}

				// Check if we have all chunks from this player
				if (playerChunks.size === message.totalChunks) {
					this.syncBuffer.completedPlayers.add(senderId);
					debugPrint(`[RATING SYNC] Received all chunks from player ${senderId}`);
				}
			}
		}
	}


	/**
	 * Complete sync process - reassemble chunks and merge into global database
	 */
	private completeSync(): void {
		if (this.isComplete) {
			return;
		}

		this.isComplete = true;

		// Reassemble all player data from chunks
		const receivedPlayers: PlayerRatingData[] = [];

		this.syncBuffer.chunks.forEach((playerChunks, playerId) => {
			const totalChunks = playerChunks.size; // Assuming all chunks received
			const playerData = reassembleChunks(playerChunks, totalChunks);

			if (playerData) {
				receivedPlayers.push(playerData);
				debugPrint(`[RATING SYNC] Reassembled data for ${playerData.btag}`);
			} else {
				debugPrint(`[RATING SYNC] Failed to reassemble data for player ${playerId}`);
			}
		});

		// Add local player's own data
		const localPlayer = GetLocalPlayer();
		const nameManager = NameManager.getInstance();
		const btag = nameManager.getBtag(localPlayer);

		if (btag) {
			const sanitizedName = this.sanitizePlayerName(btag);
			const prefix = this.isDeveloperMode ? 'dev_ratings' : 'ratings';
			const filePath = `risk/${prefix}_${sanitizedName}_s${this.seasonId}.txt`;
			const ratingFile = readRatings(filePath);

			if (ratingFile) {
				receivedPlayers.push(ratingFile.player);
				debugPrint(`[RATING SYNC] Added local player data: ${btag}`);
			}
		}

		// Merge with existing global database
		this.mergeAndSave(receivedPlayers);
	}

	/**
	 * Merge received player data with existing global database and save
	 * @param newPlayers Array of player data received from sync
	 */
	private mergeAndSave(newPlayers: PlayerRatingData[]): void {
		// Load existing global database
		const existingData = readGlobalRatings(this.seasonId, this.isDeveloperMode);

		// Create map for efficient merging
		const playerMap = new Map<string, PlayerRatingData>();

		// Add existing players
		if (existingData) {
			for (let i = 0; i < existingData.players.length; i++) {
				const player = existingData.players[i];
				playerMap.set(player.btag, player);
			}
		}

		// Merge new players (newer timestamp wins)
		for (let i = 0; i < newPlayers.length; i++) {
			const newPlayer = newPlayers[i];
			const existing = playerMap.get(newPlayer.btag);

			if (!existing) {
				// New player - add to database
				playerMap.set(newPlayer.btag, newPlayer);
				debugPrint(`[RATING SYNC] Added new player: ${newPlayer.btag}`);
			} else if (newPlayer.lastUpdated > existing.lastUpdated) {
				// Incoming data is newer - replace
				playerMap.set(newPlayer.btag, newPlayer);
				debugPrint(`[RATING SYNC] Updated player: ${newPlayer.btag} (newer data)`);
			} else {
				// Keep existing (it's newer or same)
				debugPrint(`[RATING SYNC] Kept existing data for: ${newPlayer.btag}`);
			}
		}

		// Convert map back to array
		const mergedPlayers: PlayerRatingData[] = [];
		playerMap.forEach((player) => {
			mergedPlayers.push(player);
		});

		// Save to global database
		const globalData = {
			version: 1,
			seasonId: this.seasonId,
			checksum: '', // Will be generated by writeGlobalRatings
			players: mergedPlayers,
			playerCount: mergedPlayers.length,
		};

		const success = writeGlobalRatings(globalData, this.seasonId, this.isDeveloperMode);

		if (success) {
			debugPrint(`[RATING SYNC] Successfully saved ${mergedPlayers.length} players to global database`);
		} else {
			debugPrint('[RATING SYNC] Failed to save global database');
		}
	}

	/**
	 * Sanitize player name for file path
	 * @param name Player name/btag
	 * @returns Sanitized name
	 */
	private sanitizePlayerName(name: string): string {
		let sanitized = '';
		for (let i = 0; i < name.length; i++) {
			const char = name.charAt(i);
			if (
				(char >= 'a' && char <= 'z') ||
				(char >= 'A' && char <= 'Z') ||
				(char >= '0' && char <= '9') ||
				char === '_' ||
				char === '-'
			) {
				sanitized += char;
			} else if (char === ' ') {
				sanitized += '_';
			}
		}
		return sanitized || 'Player';
	}

	/**
	 * Reset sync state for testing
	 */
	public reset(): void {
		this.isComplete = false;
		this.syncBuffer = {
			chunks: new Map(),
			completedPlayers: new Set(),
			expectedPlayerCount: 0,
		};
	}
}
