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

//This represents the ratio of total cities to conquer to win. Default is 0.7
export const CITIES_TO_WIN_WARNING_RATIO: number = 0.7;

//This represents the upper bound of cities a player starts with. Default is 22.
export const CITIES_PER_PLAYER_UPPER_BOUND: number = 22;

//This represents the duration a player can be muted for in seconds. Default is 300 seconds.
export const STFU_DURATION: number = 300;

//This represents whether debug messages should be printed. Default is false.
export const SHOW_DEBUG_PRINTS = false;

// This represents whether debug logs should be saved to a file. Default is false.
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

// This represents the duration of the W3C draw vote in seconds. Default is 120 seconds.
export const W3C_DRAW_DURATION: number = 120;

// Enable/disable emitting player statistics to W3MMD (MMD) during the match and on game end.
export const MMD_ENABLED: boolean = true;

// Master toggle for the observer/ally camera position overlay (where other players are looking).
export const SHOW_PLAYER_CAMERA_POSITIONS: boolean = true;

// This represents whether the ban list is active. Is set to true by default.
export const BAN_LIST_ACTIVE: boolean = true;

// Minimum number of human players before the game consumes each player's built-in WC3 pause quota.
// Below this threshold players keep the default (F10 -> Pause) ability; at or above it, pausing is
// disabled to keep large lobbies running continuously.
export const MIN_PLAYERS_FOR_PAUSE_CONSUMPTION: number = 14;

// Rating system settings
// Master toggle for the entire rating system. When disabled:
//   - No rating stats button (F6) is shown
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

// Reserves game type: units are deployed by clicking one of the player's cities - a click counts if it is within this range of the city's barracks. Default is 200.
export const RESERVE_DEPLOY_RADIUS: number = 200;

// Reserves game type: the maximum number of units deployed from the reserves per click. Default is 10.
export const RESERVE_DEPLOY_MAX_UNITS: number = 10;

// Reserves game type: the maximum number of heavy units (General, Artillery, Tank, Warship B, Battleship SS) deployed per click. Default is 1.
export const RESERVE_DEPLOY_MAX_HEAVY_UNITS: number = 1;

// Reserves game type: the deploy budget stops growing at this value. Deploying a unit uses up its gold cost. Default is 500.
export const RESERVE_BUDGET_MAX: number = 500;

// Reserves game type: minutes of match time it takes the deploy budget to grow from 0 to RESERVE_BUDGET_MAX if nothing is spent. Default is 60.
export const RESERVE_BUDGET_MINUTES_TO_MAX: number = 60;

// Reserves game type: budget gained per second - derived from the two settings above, do not set directly.
export const RESERVE_BUDGET_PER_SECOND: number = RESERVE_BUDGET_MAX / (RESERVE_BUDGET_MINUTES_TO_MAX * 60);

// Arena game type: seconds of countdown before each round starts. Default is 3.
export const ARENA_COUNTDOWN: number = 3;

// Arena game type: length of a round in seconds, shown on the timer in the top right. When it runs out every unit
// is paused and the player with the higher kill value (gold cost of the enemy units killed) wins. Default is 90.
export const ARENA_ROUND_DURATION: number = 90;

// Arena game type: seconds between the end of a round and the next round being prepared. Default is 4.
export const ARENA_ROUND_END_DELAY: number = 4;

// Arena game type: length of a session in minutes, counted from the first round. A running round is always played out;
// at the first round end after this, the player with the most wins wins the game. Players tied for the most wins
// play deciding rounds among themselves until one is ahead. Default is 15.
export const ARENA_SESSION_MINUTES: number = 15;

// Arena game type: armies spawn this far from their city, towards the opponent's city. Default is 350.
export const ARENA_SPAWN_OFFSET: number = 350;

// Arena game type: the arena is the area painted with the arena country's own terrain, searched up to this
// distance from the country's cities. It keeps the search from leaking into a far-away country that happens
// to use the same terrain. Default is 5000.
export const ARENA_MAX_RADIUS: number = 5000;

// Arena game type: seconds between checks that pull units back that have stepped outside the arena. Default is 0.1.
export const ARENA_BOUNDARY_CHECK_INTERVAL: number = 0.1;
