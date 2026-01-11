/**
 * Pending game data for crash recovery
 * Stores preliminary rating updates that get overwritten each turn
 */
export interface PendingGameData {
	/** Unique game identifier (timestamp_matchcount) */
	gameId: string;
	/** Preliminary rating for this game */
	rating: number;
	/** Preliminary wins count */
	wins: number;
	/** Preliminary losses count */
	losses: number;
	/** Preliminary games played count */
	gamesPlayed: number;
	/** Last turn this was updated */
	turn: number;
	/** Timestamp of last update */
	timestamp: number;
}

/**
 * Data structure for individual player rating information
 */
export interface PlayerRatingData {
	/** Player's BattleTag identifier (e.g., "PlayerName#1234") */
	btag: string;
	/** Current rating points */
	rating: number;
	/** Total number of ranked games played */
	gamesPlayed: number;
	/** Timestamp of last rating update */
	lastUpdated: number;
	/** Total number of wins */
	wins: number;
	/** Total number of losses */
	losses: number;
	/** @deprecated Total kill value across all games (no longer used in rating calculation) */
	totalKillValue?: number;
	/** @deprecated Total death value across all games (no longer used in rating calculation) */
	totalDeathValue?: number;
	/** Pending game data for crash recovery (optional) */
	pendingGame?: PendingGameData;
}

/**
 * Complete rating file data structure with checksum
 * Each file now contains only ONE player's data (per-player files)
 */
export interface RatingFileData {
	/** File format version for future compatibility */
	version: number;
	/** Season identifier */
	seasonId: number;
	/** Checksum hash for tamper detection */
	checksum: string;
	/** Single player's rating data */
	player: PlayerRatingData;
}

/**
 * Result of a single game's rating calculation for a player
 */
export interface GameRatingResult {
	/** Player's BattleTag */
	btag: string;
	/** Base points from placement (before multipliers) */
	basePlacementPoints: number;
	/** Performance multiplier based on expected vs actual placement */
	performanceMultiplier: number;
	/** Rating advantage multiplier based on rating difference vs opponents */
	ratingAdvantageMultiplier: number;
	/** Adjusted placement points after multipliers */
	adjustedPlacementPoints: number;
	/** Total rating change (same as adjustedPlacementPoints) */
	totalChange: number;
	/** Rating before this game */
	oldRating: number;
	/** Rating after this game */
	newRating: number;
	/** Expected placement based on ELO probabilities */
	expectedPlacement: number;
	/** Actual placement */
	actualPlacement: number;
}

/**
 * Global ratings database file structure
 * Contains aggregated rating data from all players encountered across games
 */
export interface GlobalRatingFileData {
	/** File format version for future compatibility */
	version: number;
	/** Season identifier */
	seasonId: number;
	/** Checksum hash for tamper detection */
	checksum: string;
	/** Array of all player rating data */
	players: PlayerRatingData[];
	/** Total number of players (for validation) */
	playerCount: number;
}

/**
 * Sync protocol message for P2P transmission of rating data
 */
export interface SyncMessage {
	/** Message type identifier */
	type: 'RATING_DATA' | 'SYNC_COMPLETE';
	/** Sender's player ID (0-23) */
	senderId: number;
	/** Chunk index for multi-part messages (0-based) */
	chunkIndex: number;
	/** Total number of chunks in this transmission */
	totalChunks: number;
	/** Payload data (Base64 encoded rating data) */
	payload: string;
}

/**
 * Temporary buffer for collecting sync data during P2P exchange
 * Used to reassemble multi-chunk messages from multiple players
 */
export interface SyncBuffer {
	/** Map of player ID to their received chunks (chunkIndex -> payload) */
	chunks: Map<number, Map<number, string>>;
	/** Set of player IDs that completed their transmission */
	completedPlayers: Set<number>;
	/** Expected number of human players participating in sync */
	expectedPlayerCount: number;
}
