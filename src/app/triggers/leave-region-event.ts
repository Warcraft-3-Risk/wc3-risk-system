import { City } from '../city/city';
import { RegionToCity, UnitToCity } from '../city/city-map';
import { UNIT_ID } from '../../configs/unit-id';
import { UNIT_TYPE } from '../utils/unit-types';
import { CityRegionSize } from 'src/configs/city-settings';
import { CompareUnitByValue } from '../utils/unit-comparisons';
import { GetUnitsInRangeByAllegiance } from '../utils/guard-filters';
import { UnitLagManager } from '../game/services/unit-lag-manager';

export const LeaveRegionTrigger: trigger = CreateTrigger();

export function LeaveRegionEvent() {
	TriggerAddCondition(
		LeaveRegionTrigger,
		Condition(() => {
			if (!IsUnitType(GetTriggerUnit(), UNIT_TYPE.GUARD)) return false;

			const city: City = RegionToCity.get(GetTriggeringRegion());
			let g: group = CreateGroup();
			let guardChoice: unit = city.guard.unit;

			//Filter for owned guards
			GetUnitsInRangeByAllegiance(g, city, CityRegionSize, IsUnitOwnedByPlayer);

			//No valid owned guards found, check for allies (not applicable for capitals)
			if (BlzGroupGetSize(g) == 0 && (!city.isCapital() || city.isCapturedCapital)) {
				GetUnitsInRangeByAllegiance(g, city, CityRegionSize, (unit, player) => UnitLagManager.IsUnitAlly(unit, player));
			}

			//No valid owned or allied guards found, create a dummy for city owner.
			if (BlzGroupGetSize(g) == 0 && !city.isValidGuard(guardChoice)) {
				guardChoice = CreateUnit(city.getOwner(), UNIT_ID.DUMMY_GUARD, city.guard.defaultX, city.guard.defaultY, 270);
			} else {
				ForGroup(g, () => {
					guardChoice = CompareUnitByValue(GetEnumUnit(), guardChoice);
				});
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
