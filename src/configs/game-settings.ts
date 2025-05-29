//Used to control how many of total cities you need.
//This is a percentage of the total cities .6 = 60%
export const CITIES_TO_WIN_RATIO: number = 0.6;

//This is the starting gold for each player. 4 gold by default.
export const STARTING_INCOME: number = 4;

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

//This represents the number of cities to conquer to win. Default is 22.
export const CITIES_PER_PLAYER_UPPER_BOUND: number = 22;

//This represents the duration a player can be muted for in seconds. Default is 300 seconds.
export const STFU_DURATION: number = 300;

//This represents whether debug messages should be printed. Default is false.
export const SHOW_DEBUG_PRINTS = false;

//This represents whether player names should be exported
export const ENABLE_EXPORT_SHUFFLED_PLAYER_LIST: boolean = false;

//This represents whether game settings should be exported
export const ENABLE_EXPORT_GAME_SETTINGS: boolean = false;

//This represents whether end game score should be exported
export const ENABLE_EXPORT_END_GAME_SCORE: boolean = true;

//This represents how long the capitals selection phase should last in seconds. Default is 30 seconds.
export const CAPITALS_SELECTION_PHASE: number = 30;

export const W3C_TERMINATE_IF_ALONE_HUMAN_PLAYER: boolean = false;
