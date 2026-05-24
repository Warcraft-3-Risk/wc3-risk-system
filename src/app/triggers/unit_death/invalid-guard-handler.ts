import { UnitToCity } from 'src/app/city/city-map';
import { LandCity } from 'src/app/city/land-city';
import { PortCity } from 'src/app/city/port-city';
import { SharedSlotManager } from 'src/app/game/services/shared-slot-manager';
import { resolveUnitOwner } from 'src/app/game/services/shared-slot-owner-resolution';
import { UnitLagManager } from 'src/app/game/services/unit-lag-manager';
import { UNIT_TYPE } from 'src/app/utils/unit-types';
import { UNIT_ID } from 'src/configs/unit-id';
import { UnitDeathContext } from './unit-death-context';

export function InvalidGuardHandler(city: LandCity | PortCity, deathContext: UnitDeathContext) {
	let newGuard: unit;
	const killingUnit = deathContext.killingUnit;

	if ((IsUnitType(killingUnit, UNIT_TYPE.SHIP) && !city.isPort()) || IsUnitType(killingUnit, UNIT_TYPE_STRUCTURE)) {
		newGuard = CreateUnit(
			SharedSlotManager.getInstance().getOwner(city.getOwner()),
			UNIT_ID.DUMMY_GUARD,
			city.guard.defaultX,
			city.guard.defaultY,
			270
		);
	} else {
		const safeOwner = deathContext.killingOwner?.isTrackedMatchPlayer ? deathContext.killingOwner.effectiveOwner : city.getOwner();
		newGuard = CreateUnit(safeOwner, UNIT_ID.DUMMY_GUARD, city.guard.defaultX, city.guard.defaultY, 270);
	}

	if (UnitLagManager.IsUnitEnemy(newGuard, city.getOwner())) {
		city.changeOwner(resolveUnitOwner(newGuard).effectiveOwner);
	}

	UnitToCity.delete(city.guard.unit);
	city.guard.replace(newGuard);
	UnitToCity.set(newGuard, city);
	city.refreshColorFilter();
}
