/**
 * A list of player colors. Some colors have been rearranged from their default Wc3 positions.
 * This is done to prevent using similar colors in small games.
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
	PLAYER_COLOR_TURQUOISE,
	PLAYER_COLOR_EMERALD,
	PLAYER_COLOR_NAVY,
	PLAYER_COLOR_MINT,
	PLAYER_COLOR_COAL,
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
	[PLAYER_COLOR_TURQUOISE, 'Turquoise'],
	[PLAYER_COLOR_EMERALD, 'Emerald'],
	[PLAYER_COLOR_NAVY, 'Navy'],
	[PLAYER_COLOR_MINT, 'Mint'],
	[PLAYER_COLOR_COAL, 'Coal'],
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
	[PLAYER_COLOR_TURQUOISE, '|cff00ebff'],
	[PLAYER_COLOR_EMERALD, '|cff00781e'],
	[PLAYER_COLOR_NAVY, '|cff0000c3'],
	[PLAYER_COLOR_MINT, '|cffccff99'],
	[PLAYER_COLOR_COAL, '|cff4f5055'],
	[PLAYER_COLOR_SNOW, '|cffecf0ff'],
]);
