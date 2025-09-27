import { GetUnitsInRangeByAllegiance, GetUnitsInRangeOfUnitByAllegiance } from 'src/app/utils/guard-filters';
import { LargeSearchRadius, SmallSearchRadius } from './search-radii';
import { City } from 'src/app/city/city';
import { ReplaceGuard } from './replace-guard';
import { UnitLagManager } from 'src/app/game/services/unit-lag-manager';
//This is where it falls for the bug. city = Owned city. killingUnit = killingCity. dyingUnit = dyingGuard
export function EnemyKillHandler(city: City, dyingUnit: unit, killingUnit: unit): boolean {
	if (!UnitLagManager.IsUnitEnemy(killingUnit, city.getOwner())) return null;
	if (IsUnitType(killingUnit, UNIT_TYPE_STRUCTURE) && IsUnitType(dyingUnit, UNIT_TYPE_SAPPER)) return null;

	const searchGroup: group = CreateGroup();

	//Search for city owned units within CoP of city
	GetUnitsInRangeByAllegiance(searchGroup, city, SmallSearchRadius, (unit, player) => UnitLagManager.IsUnitAlly(unit, player));

	//Found city owned units within CoP
	if (BlzGroupGetSize(searchGroup) >= 1) {
		ReplaceGuard(city, searchGroup);
		DestroyGroup(searchGroup);
		return true;
	}

	//No city owned units found, Search for allied units of killer in large radius of dying guard
	GetUnitsInRangeOfUnitByAllegiance(
		searchGroup,
		city,
		LargeSearchRadius,
		(unit, player) => UnitLagManager.IsUnitAlly(unit, player),
		dyingUnit,
		killingUnit
	);

	//Could not find valid units within large radius of guard, so we search in small radius by killer
	if (BlzGroupGetSize(searchGroup) <= 0) {
		GetUnitsInRangeOfUnitByAllegiance(
			searchGroup,
			city,
			SmallSearchRadius,
			(unit, player) => UnitLagManager.IsUnitAlly(unit, player),
			killingUnit,
			killingUnit
		);
	}

	//Found valid guard units, set unit as guard
	if (BlzGroupGetSize(searchGroup) >= 1) {
		ReplaceGuard(city, searchGroup);
		DestroyGroup(searchGroup);
		return true;
	}

	//Could not find valid allied of guard, clean up and return false.
	DestroyGroup(searchGroup);
	return false;
}
