import { CityRegionSize } from 'src/configs/city-settings';
import { City } from '../city/city';
import { RegionToCity, UnitToCity } from '../city/city-map';
import { UNIT_TYPE } from '../utils/unit-types';
import { GetUnitsInRangeByAllegiance } from '../utils/guard-filters';
import { CompareUnitByValue } from '../utils/unit-comparisons';
import { UNIT_ID } from 'src/configs/unit-id';
import { ClientManager } from '../game/services/client-manager';
import { UnitLagManager } from '../game/services/unit-lag-manager';

export const EnterRegionTrigger: trigger = CreateTrigger();

export function EnterRegionEvent() {
	TriggerAddCondition(
		EnterRegionTrigger,
		Condition(() => {
			if (IsUnitType(GetTriggerUnit(), UNIT_TYPE.TRANSPORT)) return false;

			const city: City = RegionToCity.get(GetTriggeringRegion());

			//Validate current guard
			if (IsUnitInRegion(GetTriggeringRegion(), city.guard.unit) && city.isValidGuard(city.guard.unit)) {
				return true;
			}

			let g: group = CreateGroup();

			//Filter for owned guards.
			GetUnitsInRangeByAllegiance(g, city, CityRegionSize, IsUnitOwnedByPlayer);

			//No valid owned guards found, check for allies.
			if (BlzGroupGetSize(g) == 0)
				GetUnitsInRangeByAllegiance(g, city, CityRegionSize, (unit, player) => UnitLagManager.IsUnitAlly(unit, player));

			//No valid allies, check for enemies.
			if (BlzGroupGetSize(g) == 0)
				GetUnitsInRangeByAllegiance(g, city, CityRegionSize, (unit, player) => UnitLagManager.IsUnitEnemy(unit, player));

			const trigUnit: unit = GetTriggerUnit();
			//Set guardChoice, Transports will be null
			let guardChoice: unit = IsUnitType(trigUnit, UNIT_TYPE.TRANSPORT) ? null : getGuardChoice(g, trigUnit, city);

			if (!guardChoice) {
				guardChoice = CreateUnit(
					ClientManager.getInstance().getOwnerOfUnit(trigUnit),
					UNIT_ID.DUMMY_GUARD,
					city.guard.defaultX,
					city.guard.defaultY,
					270
				);
			}

			//Change owner if guardChoice is an enemy of the city.
			if (UnitLagManager.IsUnitEnemy(guardChoice, city.getOwner())) {
				city.setOwner(ClientManager.getInstance().getOwnerOfUnit(guardChoice));
			}

			UnitToCity.delete(city.guard.unit);
			city.guard.replace(guardChoice);
			UnitToCity.set(guardChoice, city);
			DestroyGroup(g);
			g = null;
			guardChoice = null;

			return false;
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
