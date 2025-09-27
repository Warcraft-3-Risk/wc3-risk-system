import { GetUnitsInRangeByAllegiance, GetUnitsInRangeOfUnitByAllegiance } from 'src/app/utils/guard-filters';
import { SmallSearchRadius } from './search-radii';
import { City } from 'src/app/city/city';
import { ReplaceGuard } from './replace-guard';
import { ClientManager } from 'src/app/game/services/client-manager';
import { UnitLagManager } from 'src/app/game/services/unit-lag-manager';

export function AlliedKillHandler(city: City, dyingUnit: unit, killingUnit: unit): boolean {
	if (!UnitLagManager.IsUnitAlly(killingUnit, city.getOwner())) return null;

	const searchGroup: group = CreateGroup();

	//Search for allied units of dying unit in small radius
	GetUnitsInRangeOfUnitByAllegiance(
		searchGroup,
		city,
		SmallSearchRadius,
		(unit, player) => UnitLagManager.IsUnitAlly(unit, player),
		dyingUnit,
		killingUnit
	);

	//Could not find valid units within large radius of guard, so we search in small radius by killer
	if (BlzGroupGetSize(searchGroup) <= 0) {
		GetUnitsInRangeByAllegiance(
			searchGroup,
			city,
			SmallSearchRadius,
			(unit, player) => UnitLagManager.IsUnitAlly(unit, player),
			killingUnit
		);
	}

	//Found valid guard units, set unit as guard
	if (BlzGroupGetSize(searchGroup) >= 1) {
		ReplaceGuard(city, searchGroup);
		city.setOwner(ClientManager.getInstance().getOwnerOfUnit(killingUnit));
		DestroyGroup(searchGroup);
		return true;
	}

	//Could not find valid allied of guard, clean up and return false.
	DestroyGroup(searchGroup);
	return false;
}
