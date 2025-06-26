import { City } from '../city/city';
import { HandleToCity } from '../city/handle-to-city';
import { UNIT_TYPE } from '../utils/unit-types';
import { GetUnitsInRangeByAllegiance } from '../utils/guard-filters';
import { CompareUnitByValue } from '../utils/unit-comparisons';
import { CityRegionSize } from '../configs/city-settings';
import { UNIT_ID } from '../configs/unit-id';

export const EnterRegionTrigger: trigger = CreateTrigger();
export function EnterRegionEvent() {
	TriggerAddCondition(
		EnterRegionTrigger,
		Condition(() => {
			if (IsUnitType(GetTriggerUnit(), UNIT_TYPE.TRANSPORT)) return false;

			const city: City = HandleToCity.get(GetTriggeringRegion());

			//Validate current guard
			if (IsUnitInRegion(GetTriggeringRegion(), city.getGuard().getUnit()) && city.isValidGuard(city.getGuard().getUnit())) {
				return true;
			}

			let g: group = CreateGroup();

			//Filter for owned guards.
			GetUnitsInRangeByAllegiance(g, city, CityRegionSize, IsUnitOwnedByPlayer);

			//No valid owned guards found, check for allies.
			if (BlzGroupGetSize(g) == 0) GetUnitsInRangeByAllegiance(g, city, CityRegionSize, IsUnitAlly);

			//No valid allies, check for enemies.
			if (BlzGroupGetSize(g) == 0) GetUnitsInRangeByAllegiance(g, city, CityRegionSize, IsUnitEnemy);

			const trigUnit: unit = GetTriggerUnit();
			//Set guardChoice, Transports will be null
			let guardChoice: unit = IsUnitType(trigUnit, UNIT_TYPE.TRANSPORT) ? null : getGuardChoice(g, trigUnit, city);

			if (!guardChoice) {
				guardChoice = CreateUnit(
					GetOwningPlayer(trigUnit),
					UNIT_ID.DUMMY_GUARD,
					city.getGuard().getDefaultX(),
					city.getGuard().getDefaultY(),
					270
				);
			}

			//Change owner if guardChoice is an enemy of the city.
			if (IsUnitEnemy(guardChoice, city.getOwner())) {
				city.setOwner(GetOwningPlayer(guardChoice));
			}

			HandleToCity.delete(city.getGuard().getUnit());
			city.getGuard().replace(guardChoice);
			HandleToCity.set(guardChoice, city);
			DestroyGroup(g);
			g = null;
			guardChoice = null;

			return true;
		})
	);
}

function getGuardChoice(g: group, guardChoice: unit, city: City) {
	ForGroup(g, () => {
		const enumUnit: unit = GetEnumUnit();

		if (city.isValidGuard(enumUnit)) return false;

		guardChoice = CompareUnitByValue(enumUnit, guardChoice);
	});

	return guardChoice;
}
