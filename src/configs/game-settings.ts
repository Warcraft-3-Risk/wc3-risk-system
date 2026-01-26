// This file contains various game settings and configurations for the game.
// Add new constants to src\app\utils\debug-print.ts:DebugLogger.addHeader method if you want them to be logged in the debug log header.

//Used to control how many of total cities you need.
//This is a percentage of the total cities .6 = 60%
export const CITIES_TO_WIN_RATIO: number = 0.6;

//This is the starting gold for each player. 4 gold by default.
export const STARTING_INCOME: number = 4;

//This is the starting countdown for the game. 10 by default
export const STARTING_COUNTDOWN: number = 10;

//This is the duration of a turn in seconds. 60 seconds by default.
export const TURN_DURATION_IN_SECONDS: number = 60;

//This is the duration of a tick in seconds. 1 second by default.
export const TICK_DURATION_IN_SECONDS: number = 1;

//This is the nomad duration in seconds. 60 seconds by default.
export const NOMAD_DURATION: number = 60;

//This represents the drop in required cities to win each turn. Default is 1.
export const OVERTIME_MODIFIER: number = 1;

//This represents the ratio of total cities to conquer to win.
export const CITIES_TO_WIN_WARNING_RATIO: number = 0.7;

//This represents the upper bound of cities a player starts with. Default is 22.
export const CITIES_PER_PLAYER_UPPER_BOUND: number = 22;

//This represents the duration a player can be muted for in seconds. Default is 300 seconds.
export const STFU_DURATION: number = 300;

//This represents whether debug messages should be printed. Default is false.
export const SHOW_DEBUG_PRINTS = false;

// This represents whether debug logs should be saved to a file. Default is true.
export const SAVE_DEBUG_LOGS_TO_FILE = false;

//This represents whether player names should be exported
export const ENABLE_EXPORT_SHUFFLED_PLAYER_LIST: boolean = false;

//This represents whether game settings should be exported
export const ENABLE_EXPORT_GAME_SETTINGS: boolean = false;

//This represents whether end game score should be exported
export const ENABLE_EXPORT_END_GAME_SCORE: boolean = false;

//This represents how long the capitals selection phase should last in seconds. Default is 30 seconds.
export const CAPITALS_SELECTION_PHASE: number = 30;

// This represents whether the game should terminate if there is only one human player left
export const W3C_TERMINATE_IF_ALONE_HUMAN_PLAYER: boolean = true;

// This represents the duration of the W3C draw vote in seconds. Default is 30 seconds.
export const W3C_DRAW_DURATION: number = 120;

// Enable/disable emitting player statistics to W3MMD (MMD) during the match and on game end.
export const MMD_ENABLED: boolean = true;

// Enable/disable player client allocation. Default is false.
export const CLIENT_ALLOCATION_ENABLED = false;

// This represents whether the ban list is active. Is set to true by default.
export const BAN_LIST_ACTIVE: boolean = true;

// Rating system settings
// Master toggle for the entire rating system. When disabled:
//   - No rating stats button (F4) is shown
//   - No "ranked/unranked game" messages are displayed
//   - No rating data is stored or loaded
//   - Statistics always uses the unranked leaderboard (without rating column)
//   - Rating sync is skipped entirely
export const RATING_SYSTEM_ENABLED: boolean = true;

// This represents the current ranked season ID. Change this to start a new season.
export const RANKED_SEASON_ID: number = 1;

// Season reset key - change this to reset all rating data WITHOUT changing the season ID.
// This allows you to "soft reset" the season by using new file paths.
// Use 1-4 lowercase letters (e.g., "a", "ab", "abc", "abcd").
// Leave empty string "" to disable (files will be named without a reset key).
export const RANKED_SEASON_RESET_KEY: string = 'live';

// This represents the minimum number of human players required for a ranked game.
export const RANKED_MIN_PLAYERS: number = 16;

// This represents the starting rating for new players.
export const RANKED_STARTING_RATING: number = 1000;

// Opponent strength modifier scale factor (0.32 gives range 0.68x to 1.32x)
// Higher values make rating differences matter more, creating stronger ceiling effects
// Formula: modifier ranges from (1 - factor) to (1 + factor) based on rating difference
// For gains: higher rated vs lower opponents = less gain (0.68x at +400 diff)
// For losses: higher rated vs lower opponents = more loss (1.32x at +400 diff)
// This helps prevent runaway ratings at the top while protecting lower-rated players
export const RANKED_OPPONENT_STRENGTH_FACTOR: number = 0.32;

// Enable/disable editor developer mode. Default is false.
// When enabled: Enables country creator commands for map editing (singleplayer only)
// When disabled: Country creator commands are disabled
export const EDITOR_DEVELOPER_MODE: boolean = false;

// Enable/disable rating file encryption. Default is true.
// When enabled: Rating files are encrypted with XOR+Base64 (production use)
// When disabled: Rating files are stored as plain text (useful for debugging)
export const RATING_FILE_ENCRYPTION_ENABLED: boolean = true;

// ============================================
// P2P Rating Sync Settings
// ============================================

// Timeout for P2P rating sync in seconds. After this time, sync completes with whatever data was received.
// 10 seconds allows sufficient time for staggered SyncRequest creation (~2s) plus P2P transmission
export const RATING_SYNC_TIMEOUT: number = 10.0;

// Maximum number of top players to sync from "others" database.
// This limits sync payload size and leaderboard storage.
// All current game players are always synced regardless of this limit.
// Note: Lower values reduce lag during sync (100 = ~10KB per player vs 250 = ~25KB)
export const RATING_SYNC_TOP_PLAYERS: number = 100;