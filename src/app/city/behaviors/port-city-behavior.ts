import { UNIT_TYPE } from 'src/app/utils/unit-types';
import { IsUnitMelee } from 'src/app/utils/utils';
import { City } from '../city';
import { ICityBehavior } from './city-behavior.interface';
import { UNIT_ID } from 'src/app/configs/unit-id';

export class PortCityBehavior implements ICityBehavior {
	public isValidGuard(city: City, unit: unit): boolean {
		return city.validGuardHandler(unit);
	}

	public onUnitTrain(city: City, unit: unit): void {
		if (
			(IsUnitType(city.getGuard().getUnit(), UNIT_TYPE.SHIP) && !IsUnitType(unit, UNIT_TYPE.SHIP)) ||
			(IsUnitMelee(city.getGuard().getUnit()) && GetUnitTypeId(unit) === UNIT_ID.MARINE)
		) {
			SetUnitPosition(unit, city.getGuard().getDefaultX(), city.getGuard().getDefaultY());
			city.updateGuard(unit);
		}
	}

	public onCast(city: City): void {
		if (IsUnitType(GetSpellTargetUnit(), UNIT_TYPE.GUARD)) return;
		if (IsUnitType(GetSpellTargetUnit(), UNIT_TYPE.TRANSPORT)) return;

		city.castHandler();
	}

	public isPort(): boolean {
		return true;
	}
}
