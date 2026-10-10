import { UnitToCity } from 'src/app/city/city-map';
import { LandCity } from 'src/app/city/land-city';
import { PortCity } from 'src/app/city/port-city';
import { UNIT_TYPE } from 'src/app/utils/unit-types';
import { UNIT_ID } from 'src/configs/unit-id';

export function InvalidGuardHandler(city: LandCity | PortCity, killingUnit: unit) {
	let newGuard: unit;

	if ((IsUnitType(killingUnit, UNIT_TYPE.SHIP) && !city.isPort()) || IsUnitType(killingUnit, UNIT_TYPE_STRUCTURE)) {
		newGuard = CreateUnit(
			city.getOwner(),
			UNIT_ID.DUMMY_GUARD,
			city.guard.defaultX,
			city.guard.defaultY,
			270
		);
	} else {
		newGuard = CreateUnit(
			GetOwningPlayer(killingUnit),
			UNIT_ID.DUMMY_GUARD,
			city.guard.defaultX,
			city.guard.defaultY,
			270
		);
	}

	if (IsUnitEnemy(newGuard, city.getOwner())) {
		city.changeOwner(GetOwningPlayer(newGuard));
	}

	UnitToCity.delete(city.guard.unit);
	city.guard.replace(newGuard);
	UnitToCity.set(newGuard, city);
}
