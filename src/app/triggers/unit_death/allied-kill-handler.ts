import { GetUnitsInRangeByAllegiance, GetUnitsInRangeOfUnitByAllegiance } from 'src/app/utils/guard-filters';
import { SmallSearchRadius } from './search-radii';
import { City } from 'src/app/city/city';
import { ReplaceGuard } from './replace-guard';
import { ClientManager } from 'src/app/game/services/client-manager';

export function AlliedKillHandler(city: City, dyingUnit: unit, killingUnit: unit): boolean {
	if (!IsUnitAlly(killingUnit, city.getOwner())) return null;

	const searchGroup: group = CreateGroup();

	//Search for allied units of dying unit in small radius
	GetUnitsInRangeOfUnitByAllegiance(searchGroup, city, SmallSearchRadius, IsUnitAlly, dyingUnit, killingUnit);

	//Could not find valid units within large radius of guard, so we search in small radius by killer
	if (BlzGroupGetSize(searchGroup) <= 0) {
		GetUnitsInRangeByAllegiance(searchGroup, city, SmallSearchRadius, IsUnitAlly, killingUnit);
	}

	//Found valid guard units, set unit as guard
	if (BlzGroupGetSize(searchGroup) >= 1) {
		ReplaceGuard(city, searchGroup);
		city.setOwner(ClientManager.getInstance().getActualClientOwnerOfUnit(killingUnit));
		DestroyGroup(searchGroup);
		return true;
	}

	//Could not find valid allied of guard, clean up and return false.
	DestroyGroup(searchGroup);
	return false;
}
