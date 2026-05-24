import { GetUnitsInRangeByAllegiance, GetUnitsInRangeOfUnitByAllegiance } from 'src/app/utils/guard-filters';
import { SmallSearchRadius } from './search-radii';
import { City } from 'src/app/city/city';
import { ReplaceGuard } from './replace-guard';
import { UnitLagManager } from 'src/app/game/services/unit-lag-manager';
import { UnitDeathContext } from './unit-death-context';

export function AlliedKillHandler(city: City, deathContext: UnitDeathContext): boolean {
	const dyingUnit = deathContext.dyingUnit;
	const killingUnit = deathContext.killingUnit;
	const killingOwner = deathContext.killingOwner?.effectiveOwner;

	if (!killingOwner) return undefined;
	if (killingOwner !== city.getOwner() && !IsPlayerAlly(killingOwner, city.getOwner())) return undefined;

	const searchGroup: group = CreateGroup();

	//Search for allied units of dying unit in small radius
	GetUnitsInRangeOfUnitByAllegiance(
		searchGroup,
		city,
		SmallSearchRadius,
		(unit, player) => UnitLagManager.IsUnitAlly(unit, player),
		dyingUnit,
		killingUnit,
		killingOwner
	);

	//Could not find valid units within large radius of guard, so we search in small radius by killer
	if (BlzGroupGetSize(searchGroup) <= 0) {
		GetUnitsInRangeByAllegiance(
			searchGroup,
			city,
			SmallSearchRadius,
			(unit, player) => UnitLagManager.IsUnitAlly(unit, player),
			killingUnit,
			killingOwner
		);
	}

	//Found valid guard units, set unit as guard
	if (BlzGroupGetSize(searchGroup) >= 1) {
		ReplaceGuard(city, searchGroup);
		city.setOwner(killingOwner);
		DestroyGroup(searchGroup);
		return true;
	}

	//Could not find valid allied of guard, clean up and return false.
	DestroyGroup(searchGroup);
	return false;
}
