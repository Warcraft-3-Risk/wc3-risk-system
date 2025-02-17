import { UNIT_TYPE } from 'src/app/utils/unit-types';
import { IsUnitMelee } from 'src/app/utils/utils';
import { DefaultGuardType } from 'src/configs/country-settings';
import { City } from '../city';
import { ICityBehavior } from './city-behavior.interface';

export class LandCityBehavior implements ICityBehavior {
	public isValidGuard(city: City, unit: unit): boolean {
		if (IsUnitType(unit, UNIT_TYPE.SHIP)) return false;

		return city.validGuardHandler(unit);
	}

	public onUnitTrain(city: City, unit: unit): void {
		if (IsUnitMelee(city.getGuard().getUnit()) && GetUnitTypeId(unit) === DefaultGuardType) {
			SetUnitPosition(unit, city.getGuard().getDefaultX(), city.getGuard().getDefaultY());
			city.updateGuard(unit);
		}
	}

	public onCast(city: City): void {
		if (IsUnitType(GetSpellTargetUnit(), UNIT_TYPE.SHIP)) return;
		if (IsUnitType(GetSpellTargetUnit(), UNIT_TYPE.GUARD)) return;

		city.castHandler();
	}

	public isPort(): boolean {
		return false;
	}
}
