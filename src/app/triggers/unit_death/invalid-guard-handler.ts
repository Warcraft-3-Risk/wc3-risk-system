import { UnitToCity } from 'src/app/city/city-map';
import { LandCity } from 'src/app/city/land-city';
import { PortCity } from 'src/app/city/port-city';
import { SharedSlotManager } from 'src/app/game/services/shared-slot-manager';
import { PlayerManager } from 'src/app/player/player-manager';
import { UnitLagManager } from 'src/app/game/services/unit-lag-manager';
import { UNIT_TYPE } from 'src/app/utils/unit-types';
import { UNIT_ID } from 'src/configs/unit-id';

export function InvalidGuardHandler(city: LandCity | PortCity, killingUnit: unit) {
	let newGuard: unit;

	if ((IsUnitType(killingUnit, UNIT_TYPE.SHIP) && !city.isPort()) || IsUnitType(killingUnit, UNIT_TYPE_STRUCTURE)) {
		newGuard = CreateUnit(
			SharedSlotManager.getInstance().getOwner(city.getOwner()),
			UNIT_ID.DUMMY_GUARD,
			city.guard.defaultX,
			city.guard.defaultY,
			270
		);
	} else {
		const killingOwner = SharedSlotManager.getInstance().getOwnerOfUnit(killingUnit);
		// If the killing unit's resolved owner is a freed shared slot (zombie slot — no longer
		// tracked as a match player), fall back to the current city owner. This can happen when
		// a shared-slot unit is the last unit on its slot and dies in the same game tick as the
		// guard: the slot's unit-death event fires first, freeing the slot via
		// evaluateAndRedistribute(), so by the time the guard's death event runs the owner is
		// already gone from slotToPlayer and has no alliances. Using a zombie slot as owner
		// would leave the city owned by an uncontrollable player slot.
		const safeOwner = PlayerManager.getInstance().players.has(killingOwner) ? killingOwner : city.getOwner();
		newGuard = CreateUnit(safeOwner, UNIT_ID.DUMMY_GUARD, city.guard.defaultX, city.guard.defaultY, 270);
	}

	if (UnitLagManager.IsUnitEnemy(newGuard, city.getOwner())) {
		city.changeOwner(SharedSlotManager.getInstance().getOwnerOfUnit(newGuard));
	}

	UnitToCity.delete(city.guard.unit);
	city.guard.replace(newGuard);
	UnitToCity.set(newGuard, city);
}
