import { GetUnitsInRangeByAllegiance } from 'src/app/utils/guard-filters';
import { LargeSearchRadius, SmallSearchRadius } from './search-radii';
import { City } from 'src/app/city/city';
import { ReplaceGuard } from './replace-guard';
import { SettingsContext } from 'src/app/settings/settings-context';
import { AlliedKillHandler } from './allied-kill-handler';
import { ClientManager } from 'src/app/game/services/client-manager';

export function SelfKillHandler(city: City, dyingUnit: unit, killingUnit: unit): boolean {
	if (city.getOwner() != ClientManager.getInstance().getOwnerOfUnit(killingUnit)) return null;

	const searchGroup: group = CreateGroup();

	//Search for owned units in large radius of dying guard
	GetUnitsInRangeByAllegiance(searchGroup, city, LargeSearchRadius, IsUnitOwnedByPlayer, dyingUnit);

	//Could not find valid units within large radius of guard, so we search in small radius by killer
	if (BlzGroupGetSize(searchGroup) <= 0) {
		GetUnitsInRangeByAllegiance(searchGroup, city, SmallSearchRadius, IsUnitOwnedByPlayer, killingUnit);
	}

	//Found valid guard units, set unit as guard
	if (BlzGroupGetSize(searchGroup) >= 1) {
		ReplaceGuard(city, searchGroup);
		DestroyGroup(searchGroup);
		return true;
	}

	DestroyGroup(searchGroup);
	//Could not find valid owned guard, check for valid allied guard if its not an FFA game
	if (!SettingsContext.getInstance().isFFA()) {
		return AlliedKillHandler(city, dyingUnit, killingUnit);
	}

	//No valid owned or allied unit found, return false
	return false;
}
