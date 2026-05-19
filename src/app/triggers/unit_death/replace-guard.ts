import { City } from 'src/app/city/city';
import { UnitToCity } from 'src/app/city/city-map';
import { resolveUnitOwner } from 'src/app/game/services/shared-slot-owner-resolution';
import { CompareUnitByValue } from 'src/app/utils/unit-comparisons';

export function ReplaceGuard(city: City, searchGroup: group) {
	let guardChoice = GroupPickRandomUnit(searchGroup);

	//Make sure to grab best choice guard according to player options
	ForGroup(searchGroup, () => {
		guardChoice = CompareUnitByValue(GetEnumUnit(), guardChoice);
	});

	const guardOwner = resolveUnitOwner(guardChoice);
	if (guardOwner.isTrackedMatchPlayer && IsPlayerEnemy(guardOwner.effectiveOwner, city.getOwner())) {
		city.changeOwner(guardOwner.effectiveOwner);
	}

	UnitToCity.delete(city.guard.unit);
	city.guard.replace(guardChoice);
	UnitToCity.set(guardChoice, city);
}
