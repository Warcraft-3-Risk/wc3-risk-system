/** The player object for neutral hostile units. */
export const NEUTRAL_HOSTILE: player = Player(PLAYER_NEUTRAL_AGGRESSIVE);


export const CUSTOM_MAP_DATA_MINE_TYPE_TXT: string = 'txt';

/** The root risk folder inside CustomMapData directory */
export const CUSTOM_MAP_DATA_RISK_DIRECTORY: string = 'risk';

/** The unique match name inside CustomMapData/risk directory */
export const CUSTOM_MAP_DATA_MATCH_DIRECTORY: string = `${CUSTOM_MAP_DATA_RISK_DIRECTORY}/${os.date('%Y-%m-%d-%H-%M-%S', os.time())}`;

/**
 * Play a local sound for a specific player.
 * @param soundPath - The path of the sound file to play.
 * @param player - The player for whom the sound should be played.
 */
export function PlayLocalSound(soundPath: string, player: player) {
	let sound = CreateSound(soundPath, false, false, true, 10, 10, '');

	if (GetLocalPlayer() != player) SetSoundVolume(sound, 0);

	StartSound(sound);
	KillSoundWhenDone(sound);
	sound = null;
}

/**
 * Play a global sound for all players.
 * @param soundPath - The path of the sound file to play.
 */
export function PlayGlobalSound(soundPath: string) {
	let sound = CreateSound(soundPath, false, false, true, 10, 10, '');

	StartSound(sound);
	KillSoundWhenDone(sound);
	sound = null;
}

/**
 * Shuffles the array in-place.
 * @param arr - The array to shuffle.
 */
export function ShuffleArray(arr: any[]): void {
	for (let i: number = arr.length - 1; i > 0; i--) {
		const j: number = Math.floor(Math.random() * (i + 1));

		const temp: any = arr[i];
		arr[i] = arr[j];
		arr[j] = temp;
	}
}

/**
 * Selects a specified number of random elements from an array.
 * @param arr - The array to select from.
 * @param numElements - The number of elements to select.
 * @returns An array containing the selected elements.
 */
export function GetRandomElements(arr: any[], numElements: number): any[] {
	const shuffledArray = arr.sort(() => Math.random() - 0.5);
	const selectedElements = shuffledArray.splice(0, numElements);

	return selectedElements;
}

/**
 * Checks if a string is a non-empty substring of another string. Both strings are
 * transformed to lower case and trimmed before comparison.
 * @param substring - The string to search for.
 * @param string - The string to search in.
 * @returns True if the substring is non-empty and found within the string.
 */
export function isNonEmptySubstring(substring: string, string: string): boolean {
	substring = substring.toLowerCase().trim();
	string = string.toLowerCase().trim();

	return substring !== '' && string.includes(substring);
}

/**
 * Computes the distance between two sets of coordinates.
 * @param x1 - The x-coordinate of the first location.
 * @param y1 - The y-coordinate of the first location.
 * @param x2 - The x-coordinate of the second location.
 * @param y2 - The y-coordinate of the second location.
 * @returns The distance between the two locations.
 */
export function DistanceBetweenCoords(x1: number, y1: number, x2: number, y2: number) {
	return SquareRoot(Pow(x2 - x1, 2) + Pow(y2 - y1, 2));
}

/**
 * Determines if a unit is melee.
 * @param unit - The unit to test.
 * @returns True if the unit is melee, otherwise false
 */
export function IsUnitMelee(unit: unit): boolean {
	return IsUnitType(unit, UNIT_TYPE_MELEE_ATTACKER);
}

/**
 * Retrieves a random element from an array, removes it from the array, and then returns it.
 * If the array is empty, it returns null.
 * This will mutate the original array.
 * @param items The array of items from which a random element should be retrieved.
 * @return The randomly selected element or null if the array is empty.
 */
export function GetRandomElementFromArray<T>(items: T[]): T | null {
	if (items.length < 1) return null;

	const randomIndex = Math.floor(Math.random() * items.length);
	const lastIndex = items.length - 1;

	[items[randomIndex], items[lastIndex]] = [items[lastIndex], items[randomIndex]];

	const item = items.pop();

	return item;
}

/**
 * Adds a leading zero to numbers less than 10 and returns the result as a string.
 * @param num The number to which a leading zero might be added.
 * @return The number as a string with a leading zero if it's less than 10.
 */
export function AddLeadingZero(num: number): string {
	return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Computes the ratio of the dividend to the divisor and returns the result as a string with two decimal places.
 * If both the dividend and divisor are zero, returns '0.00'.
 * If only the divisor is zero, returns the dividend as a string with two decimal places.
 * If only the dividend is zero, returns the negative divisor as a string with two decimal places.
 * @param dividend The number to be divided.
 * @param divisor The number by which the dividend is divided.
 * @return The result of the division as a string with two decimal places.
 */
export function ComputeRatio(dividend: number, divisor: number): string {
	if (dividend === 0 && divisor === 0) return '0.00';
	if (divisor === 0) return dividend.toFixed(2);
	if (dividend === 0) return (-divisor).toFixed(2);

	return (dividend / divisor).toFixed(2);
}

/**
 * Gives a number range from start to stop with a given step.
 * @param start The starting number of the range.
 * @param stop The ending number of the range.
 * @param step The step between each number in the range.
 * @return An array of numbers from start to stop with the given step.
 */
export function arrayRange(start: number, stop: number, step: number) {
	return Array.from({ length: (stop - start) / step + 1 }, (value, index) => start + index * step);
}

/**
 * Safely truncates a string to a maximum VISIBLE length, properly handling WC3 color codes.
 * Color codes (|cXXXXXXXX) and resets (|r) are not counted toward the visible length.
 * Ensures we don't cut in the middle of a color code.
 * @param str The string to truncate.
 * @param maxVisibleLength The maximum number of visible characters (excluding color codes).
 * @return The truncated string with color codes preserved.
 */
export function truncateWithColorCode(str: string, maxVisibleLength: number): string {
	if (!str) {
		return str;
	}

	let visibleCount = 0;
	let i = 0;
	let hasOpenColorCode = false;

	while (i < str.length && visibleCount < maxVisibleLength) {
		// Check for color code start: |c followed by 8 hex characters
		if (str.charAt(i) === '|' && i + 1 < str.length) {
			const nextChar = str.charAt(i + 1);

			if (nextChar === 'c' && i + 9 < str.length) {
				// Skip the full color code: |c + 8 hex chars = 10 characters total
				i += 10;
				hasOpenColorCode = true;
				continue;
			} else if (nextChar === 'r') {
				// Skip the reset code: |r = 2 characters
				i += 2;
				hasOpenColorCode = false;
				continue;
			}
		}

		// Regular visible character
		visibleCount++;
		i++;
	}

	// Get the truncated string up to position i
	let truncated = str.slice(0, i);

	// If we have an open color code and the string was truncated, close it
	if (hasOpenColorCode && i < str.length) {
		truncated += '|r';
	}

	return truncated;
}
