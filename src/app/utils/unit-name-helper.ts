import { debugPrint } from './debug-print';

/**
 * Updates a unit's name to include its kill value as a suffix.
 * Format: "Rifleman (Korea) (40)" or "Rifleman (40)"
 * Only shows kill value if > 0.
 *
 * @param unit - The unit to update
 * @param killValue - The total point value of units killed by this unit
 */
/**
 * Removes kill value suffix from a unit name if it exists.
 * Looks for pattern " (digits)" at the end of the string.
 * @param name - The unit name to process
 * @returns The name without kill value suffix
 */
function removeKillValueSuffix(name: string): string {
	// Check if name ends with ")"
	if (!name.endsWith(')')) {
		return name;
	}

	// Find the last " (" in the string by searching backwards
	let lastOpenParen = -1;
	for (let i = name.length - 2; i >= 0; i--) {
		if (name.charAt(i) === ' ' && i + 1 < name.length && name.charAt(i + 1) === '(') {
			lastOpenParen = i;
			break;
		}
	}

	if (lastOpenParen === -1) {
		return name;
	}

	// Extract the content between the last " (" and ")"
	const potentialKillValue = name.substring(lastOpenParen + 2, name.length - 1);

	// Check if it's all digits
	let isAllDigits = true;
	if (potentialKillValue.length === 0) {
		isAllDigits = false;
	} else {
		for (let i = 0; i < potentialKillValue.length; i++) {
			const char = potentialKillValue.charAt(i);
			if (char < '0' || char > '9') {
				isAllDigits = false;
				break;
			}
		}
	}

	// If it's all digits, remove the suffix
	if (isAllDigits) {
		return name.substring(0, lastOpenParen);
	}

	return name;
}

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
