import { City } from '../city/city';

/**
 * Context for the shared allegiance filter below.
 *
 * These functions run on every unit death near a city and on every city region enter/leave,
 * so the boolexpr is created once at init and reused. Building a `Filter()` per call leaked a
 * handle every time, which degraded performance over the course of a match.
 *
 * Note: this makes the filter non-reentrant. A filter callback must never trigger another
 * group enumeration, or it would overwrite the context mid-enumeration.
 */
let filterCity: City;
let filterAllegianceCheck: (filterUnit: unit, player: player) => boolean;
let filterPlayer: player;

const allegianceFilter: boolexpr = Filter(
	() => filterCity.isValidGuard(GetFilterUnit()) && filterAllegianceCheck(GetFilterUnit(), filterPlayer)
);

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
	const x: number = !unit ? city.guard.defaultX : GetUnitX(unit);
	const y: number = !unit ? city.guard.defaultY : GetUnitY(unit);

	filterCity = city;
	filterAllegianceCheck = allegianceCheck;
	filterPlayer = city.getOwner();

	GroupEnumUnitsInRange(g, x, y, radius, allegianceFilter);
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

	filterCity = city;
	filterAllegianceCheck = allegianceCheck;
	filterPlayer = GetOwningPlayer(killingUnit);

	GroupEnumUnitsInRange(g, x, y, radius, allegianceFilter);
}
