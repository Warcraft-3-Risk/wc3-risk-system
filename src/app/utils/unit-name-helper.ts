import { debugPrint } from './debug-print';

/**
 * Removes kill value suffix from a unit name if it exists.
 * Looks for pattern " (digits)" at the end of the string.
 * @param name - The unit name to process
 * @returns The name without kill value suffix
 */
function removeKillValueSuffix(name: string): string {
	// Single native Lua pattern match instead of a per-character scan - this runs on every kill.
	// The greedy (.*) makes it strip only the last " (digits)" group, e.g. "Rifleman (Korea) (40)" -> "Rifleman (Korea)".
	const [base] = string.match(name, '^(.*) %(%d+%)$');

	return base !== undefined ? base : name;
}

/**
 * Updates a unit's name to include its kill value as a suffix.
 * Format: "Rifleman (Korea) (40)" or "Rifleman (40)"
 * Only shows kill value if > 0.
 *
 * @param unit - The unit to update
 * @param killValue - The total point value of units killed by this unit
 */
export function updateUnitNameWithKillValue(unit: unit, killValue: number): void {
	if (!unit) {
		debugPrint(`[NAME HELPER] Unit is null, returning`);
		return;
	}

	const currentName = GetUnitName(unit);

	// Remove existing kill value suffix
	const nameWithoutKillValue = removeKillValueSuffix(currentName);

	// Add new kill value suffix if > 0
	if (killValue > 0) {
		const newName = `${nameWithoutKillValue} (${killValue})`;
		BlzSetUnitName(unit, newName);
	} else {
		BlzSetUnitName(unit, nameWithoutKillValue);
	}
}
