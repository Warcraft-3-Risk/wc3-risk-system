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
	/** Preliminary total kill value */
	totalKillValue: number;
	/** Preliminary total death value */
	totalDeathValue: number;
	/** Preliminary total placement sum */
	totalPlacement: number;
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
	/** Total kill value across all games */
	totalKillValue?: number;
	/** Total death value across all games */
	totalDeathValue?: number;
	/** Total placement sum across all games (for calculating average rank) */
	totalPlacement?: number;
	/** Pending game data for crash recovery (optional) */
	pendingGame?: PendingGameData;
	/** Player preference: show rating in stats and messages (default: true) */
	showRating?: boolean;
	/** Internal flag: true if loaded from sync/file, false if default-initialized (not serialized to file) */
	_isSynced?: boolean;
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
 * Others ratings database file structure
 * Contains aggregated rating data from all OTHER players encountered across games
 * (Your own stats are stored separately in your personal rating file)
 */
export interface OthersRatingFileData {
	/** File format version for future compatibility */
	version: number;
	/** Season identifier */
	seasonId: number;
	/** Checksum hash for tamper detection */
	checksum: string;
	/** Array of all OTHER players' rating data */
	players: PlayerRatingData[];
	/** Total number of players (for validation) */
	playerCount: number;
}
