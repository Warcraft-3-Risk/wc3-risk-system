import { City } from '../city/city';

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
	unit?: unit
) {
	const x: number = !unit ? city.getGuard().getDefaultX() : GetUnitX(unit);
	const y: number = !unit ? city.getGuard().getDefaultY() : GetUnitY(unit);

	GroupEnumUnitsInRange(
		g,
		x,
		y,
		radius,
		Filter(() => city.isValidGuard(GetFilterUnit()) && allegianceCheck(GetFilterUnit(), city.getOwner()))
	);
}

export function GetUnitsInRangeOfUnitByAllegiance(
	g: group,
	city: City,
	radius: number,
	allegianceCheck: (filterUnit: unit, player: player) => boolean,
	dyingUnit: unit,
	killingUnit: unit
) {
	const x: number = GetUnitX(dyingUnit);
	const y: number = GetUnitY(dyingUnit);

	GroupEnumUnitsInRange(
		g,
		x,
		y,
		radius,
		Filter(() => city.isValidGuard(GetFilterUnit()) && allegianceCheck(GetFilterUnit(), GetOwningPlayer(killingUnit)))
	);
}
