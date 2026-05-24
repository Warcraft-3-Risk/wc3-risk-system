import { City } from '../city/city';
import { SharedSlotManager } from '../game/services/shared-slot-manager';

/**
 * Retrieves units in a specified range based on allegiance.
 *
 * @param g - The group of units to consider.
 * @param city - The city to be used for the check.
 * @param radius - The radius within which units should be considered.
 * @param allegianceCheck - A function that checks a unit's allegiance, accepting the unit and a player.
 * @param unit - Optional: A specific unit from which to measure the radius. If not provided, the city's guard default coordinates will be used.
 */
export function GetUnitsInRangeByAllegiance(
	g: group,
	city: City,
	radius: number,
	allegianceCheck: (filterUnit: unit, player: player) => boolean,
	unit?: unit,
	referenceOwner?: player
) {
	const x: number = !unit ? city.guard.defaultX : GetUnitX(unit);
	const y: number = !unit ? city.guard.defaultY : GetUnitY(unit);
	const owner = referenceOwner || city.getOwner();

	GroupEnumUnitsInRange(
		g,
		x,
		y,
		radius,
		Filter(() => city.isValidGuard(GetFilterUnit()) && allegianceCheck(GetFilterUnit(), owner))
	);
}

export function GetUnitsInRangeOfUnitByAllegiance(
	g: group,
	city: City,
	radius: number,
	allegianceCheck: (filterUnit: unit, player: player) => boolean,
	dyingUnit: unit,
	killingUnit: unit,
	referenceOwner?: player
) {
	const x: number = GetUnitX(dyingUnit);
	const y: number = GetUnitY(dyingUnit);
	const owner = referenceOwner || SharedSlotManager.getInstance().getOwnerOfUnit(killingUnit);

	GroupEnumUnitsInRange(
		g,
		x,
		y,
		radius,
		Filter(() => city.isValidGuard(GetFilterUnit()) && allegianceCheck(GetFilterUnit(), owner))
	);
}
