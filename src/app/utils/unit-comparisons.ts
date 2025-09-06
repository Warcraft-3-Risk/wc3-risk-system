import { ClientManager } from '../game/services/client-manager';
import { Options } from '../player/options';
import { PlayerManager } from '../player/player-manager';

/**
 * Compares two units based on their point value.
 *
 * @param compareUnit The unit to compare.
 * @param initialUnit The unit to compare against.
 * @returns The unit that fits the player's settings. If the units have the same value, it then compares based on their health.
 */
export function CompareUnitByValue(compareUnit: unit, initialUnit: unit): unit {
	if (!initialUnit) return compareUnit;
	if (!compareUnit) return initialUnit;
	if (compareUnit == initialUnit) return initialUnit;

	const initialUnitValue: number = GetUnitPointValue(initialUnit);
	const compareUnitValue: number = GetUnitPointValue(compareUnit);
	const playerSettings: Options = PlayerManager.getInstance().players.get(
		ClientManager.getInstance().getActualClientOwnerOfUnit(compareUnit)
	).options;

	if (!playerSettings.value && compareUnitValue < initialUnitValue) {
		return compareUnit;
	}

	if (playerSettings.value && compareUnitValue > initialUnitValue) {
		return compareUnit;
	}

	if (compareUnitValue == initialUnitValue) {
		return CompareUnitByHealth(compareUnit, initialUnit, playerSettings);
	}

	return initialUnit;
}

/**
 * Compares two units based on their health state.
 *
 * @param compareUnit The unit to compare.
 * @param initialUnit The unit to compare against.
 * @param playerSettings The settings of the player who owns the unit.
 * @returns The unit that fits the player's settings.
 */
export function CompareUnitByHealth(compareUnit: unit, initialUnit: unit, playerSettings: Options): unit {
	if (compareUnit == initialUnit) return initialUnit;

	const initialUnitValue: number = GetUnitState(initialUnit, UNIT_STATE_LIFE);
	const compareUnitValue: number = GetUnitState(compareUnit, UNIT_STATE_LIFE);

	if (!playerSettings.health && compareUnitValue < initialUnitValue) {
		return compareUnit;
	}

	if (playerSettings.health && compareUnitValue > initialUnitValue) {
		return compareUnit;
	}

	return initialUnit;
}
