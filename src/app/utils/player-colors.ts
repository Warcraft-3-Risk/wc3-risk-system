/**
 * A list of player colors. Some colors have been rearranged from their default Wc3 positions.
 * This is done to prevent using similar colors in small games.
 * The following colors have been swapped: Snow 22, Turquoise 15, Mint 19, Navy 14, Emerald 23, Coal 20
 */
export const PLAYER_COLORS = [
	PLAYER_COLOR_RED,
	PLAYER_COLOR_BLUE,
	PLAYER_COLOR_CYAN,
	PLAYER_COLOR_PURPLE,
	PLAYER_COLOR_YELLOW,
	PLAYER_COLOR_ORANGE,
	PLAYER_COLOR_GREEN,
	PLAYER_COLOR_PINK,
	PLAYER_COLOR_LIGHT_GRAY,
	PLAYER_COLOR_LIGHT_BLUE,
	PLAYER_COLOR_AQUA,
	PLAYER_COLOR_BROWN,
	PLAYER_COLOR_MAROON,
	PLAYER_COLOR_VIOLET,
	PLAYER_COLOR_WHEAT,
	PLAYER_COLOR_PEACH,
	PLAYER_COLOR_LAVENDER,
	PLAYER_COLOR_PEANUT,
	//Swapped Colors
	PLAYER_COLOR_COAL,
	PLAYER_COLOR_EMERALD,
	PLAYER_COLOR_NAVY,
	PLAYER_COLOR_MINT,
	PLAYER_COLOR_TURQUOISE,
	PLAYER_COLOR_SNOW,
];

/**
 * A mapping from player color enumeration to their name strings.
 * Useful for displaying color names in user interfaces.
 */
export const PLAYER_COLOR_MAP: Map<playercolor, string> = new Map<playercolor, string>([
	[PLAYER_COLOR_RED, 'Red'],
	[PLAYER_COLOR_BLUE, 'Blue'],
	[PLAYER_COLOR_CYAN, 'Teal'],
	[PLAYER_COLOR_PURPLE, 'Purple'],
	[PLAYER_COLOR_YELLOW, 'Yellow'],
	[PLAYER_COLOR_ORANGE, 'Orange'],
	[PLAYER_COLOR_GREEN, 'Green'],
	[PLAYER_COLOR_PINK, 'Pink'],
	[PLAYER_COLOR_LIGHT_GRAY, 'Gray'],
	[PLAYER_COLOR_LIGHT_BLUE, 'Light Blue'],
	[PLAYER_COLOR_AQUA, 'Dark Green'],
	[PLAYER_COLOR_BROWN, 'Brown'],
	[PLAYER_COLOR_MAROON, 'Maroon'],
	[PLAYER_COLOR_VIOLET, 'Violet'],
	[PLAYER_COLOR_WHEAT, 'Wheat'],
	[PLAYER_COLOR_PEACH, 'Peach'],
	[PLAYER_COLOR_LAVENDER, 'Lavender'],
	[PLAYER_COLOR_PEANUT, 'Peanut'],
	[PLAYER_COLOR_COAL, 'Coal'],
	[PLAYER_COLOR_EMERALD, 'Emerald'],
	[PLAYER_COLOR_NAVY, 'Navy'],
	[PLAYER_COLOR_MINT, 'Mint'],
	[PLAYER_COLOR_TURQUOISE, 'Turquoise'],
	[PLAYER_COLOR_SNOW, 'Snow'],
]);

/**
 * A mapping from player color enumeration to their corresponding hex color code strings.
 * Useful for applying color themes to user interfaces.
 */
export const PLAYER_COLOR_CODES_MAP: Map<playercolor, string> = new Map<playercolor, string>([
	[PLAYER_COLOR_RED, '|cffff0303'],
	[PLAYER_COLOR_BLUE, '|cff0042ff'],
	[PLAYER_COLOR_CYAN, '|cff1be7ba'],
	[PLAYER_COLOR_PURPLE, '|cff550081'],
	[PLAYER_COLOR_YELLOW, '|cfffefc00'],
	[PLAYER_COLOR_ORANGE, '|cfffe890d'],
	[PLAYER_COLOR_GREEN, '|cff21bf00'],
	[PLAYER_COLOR_PINK, '|cffe45caf'],
	[PLAYER_COLOR_LIGHT_GRAY, '|cff939596'],
	[PLAYER_COLOR_LIGHT_BLUE, '|cff77bbff'],
	[PLAYER_COLOR_AQUA, '|cff106247'],
	[PLAYER_COLOR_BROWN, '|cff4f2b05'],
	[PLAYER_COLOR_MAROON, '|cff9c0000'],
	[PLAYER_COLOR_VIOLET, '|cffbd00ff'],
	[PLAYER_COLOR_WHEAT, '|cffecce87'],
	[PLAYER_COLOR_PEACH, '|cfff7a58b'],
	[PLAYER_COLOR_LAVENDER, '|cffdbb8eb'],
	[PLAYER_COLOR_PEANUT, '|cffa56f34'],
	[PLAYER_COLOR_COAL, '|cff4f5055'],
	[PLAYER_COLOR_EMERALD, '|cff00781e'],
	[PLAYER_COLOR_NAVY, '|cff0000c3'],
	[PLAYER_COLOR_MINT, '|cffccff99'],
	[PLAYER_COLOR_TURQUOISE, '|cff00ebff'],
	[PLAYER_COLOR_SNOW, '|cffecf0ff'],
]);

export const PLAYER_COLOR_CODES_RGB_MAP: Map<playercolor, [number, number, number]> = new Map<
	playercolor,
	[number, number, number]
>([
	[PLAYER_COLOR_RED, [255, 3, 3]],
	[PLAYER_COLOR_BLUE, [0, 66, 255]],
	[PLAYER_COLOR_CYAN, [27, 231, 186]],
	[PLAYER_COLOR_PURPLE, [85, 0, 129]],
	[PLAYER_COLOR_YELLOW, [254, 252, 0]],
	[PLAYER_COLOR_ORANGE, [254, 137, 13]],
	[PLAYER_COLOR_GREEN, [33, 191, 0]],
	[PLAYER_COLOR_PINK, [228, 92, 175]],
	[PLAYER_COLOR_LIGHT_GRAY, [147, 149, 150]],
	[PLAYER_COLOR_LIGHT_BLUE, [119, 187, 255]],
	[PLAYER_COLOR_AQUA, [16, 98, 71]],
	[PLAYER_COLOR_BROWN, [79, 43, 5]],
	[PLAYER_COLOR_MAROON, [156, 0, 0]],
	[PLAYER_COLOR_VIOLET, [189, 0, 255]],
	[PLAYER_COLOR_WHEAT, [236, 206, 135]],
	[PLAYER_COLOR_PEACH, [247, 165, 139]],
	[PLAYER_COLOR_LAVENDER, [219, 184, 235]],
	[PLAYER_COLOR_PEANUT, [165, 111, 52]],
	[PLAYER_COLOR_COAL, [79, 80, 85]],
	[PLAYER_COLOR_EMERALD, [0, 120, 30]],
	[PLAYER_COLOR_NAVY, [0, 0, 195]],
	[PLAYER_COLOR_MINT, [204, 255, 153]],
	[PLAYER_COLOR_TURQUOISE, [0, 235, 255]],
	[PLAYER_COLOR_SNOW, [236, 240, 255]],
]);


/**
 * Percentage value representing the red component in the ping color for each player.
 * The percentage is used to blend the color component of the ping signal.
 */
export const pingRedPercent = [
	100.0, 0.0, 10.98, 32.94, 100.0, 99.61, 12.55, 89.8, 58.43, 49.41, 6.27, 29.02, 60.78, 0.0, 0.0, 74.51, 92.16, 97.25, 74.9, 86.27, 15.69,
	92.16, 0.0, 64.31,
];

/**
 * Percentage value representing the green component in the ping color for each player.
 * The percentage is used to blend the color component of the ping signal.
 */
export const pingGreenPercent = [
	1.18, 25.88, 90.2, 0.0, 98.82, 54.12, 75.29, 35.69, 58.82, 74.9, 38.43, 16.47, 0.0, 0.0, 91.76, 0.0, 80.39, 64.31, 100.0, 72.55, 15.69,
	94.12, 47.06, 43.53,
];

/**
 * Percentage value representing the blue component in the ping color for each player.
 * The percentage is used to blend the color component of the ping signal.
 */
export const pingBluePercent = [
	1.18, 100.0, 72.55, 50.59, 0.0, 5.49, 0.0, 69.02, 59.22, 94.51, 27.45, 1.57, 0.0, 76.47, 100.0, 99.61, 52.94, 54.51, 50.2, 92.16, 15.69,
	100.0, 11.76, 20.0,
];
