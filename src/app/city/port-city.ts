import { UNIT_ID } from 'src/configs/unit-id';
import { TransportManager } from '../managers/transport-manager';
import { UNIT_TYPE } from '../utils/unit-types';
import { City } from './city';
import { UnitToCity } from './city-map';
import { Barracks } from './components/barracks';
import { Guard } from './components/guard';
import { IsUnitMelee } from '../utils/utils';

/**
 * PortCity is a variant of City for port terrain.
 */
export class PortCity extends City {
	/**
	 * SeaCity constructor.
	 * @param rax - The city's Barracks.
	 * @param guard - The city's Guard.
	 * @param cop - The city's Circle of Power.
	 */
	public constructor(rax: Barracks, guard: Guard, cop: unit) {
		super(rax, guard, cop);
	}

	/**
	 * Determines if a given unit is a valid guard for this city.
	 * The unit must pass the `validGuardHandler` check.
	 * @param unit - The unit to check.
	 * @returns `true` if the unit is valid, `false` otherwise.
	 */
	public isValidGuard(unit: unit): boolean {
		if (!this.validGuardHandler(unit)) return false;

		return true;
	}

	/**
	 * Handles the unit training event.
	 * If the trained unit is a transport, it is added to the TransportManager.
	 * If the city's guard is a ship and the trained unit is not, or if the guard is melee and the trained unit is a marine,
	 * the guard is replaced by the trained unit.
	 * @param unit - The trained unit.
	 */
	public onUnitTrain(unit: unit): void {
		if (IsUnitType(unit, UNIT_TYPE.TRANSPORT)) {
			TransportManager.getInstance().add(unit);
		}

		if (
			(IsUnitType(this.guard.unit, UNIT_TYPE.SHIP) && !IsUnitType(unit, UNIT_TYPE.SHIP)) ||
			(IsUnitMelee(this.guard.unit) && GetUnitTypeId(unit) == UNIT_ID.MARINE)
		) {
			SetUnitPosition(unit, this.guard.defaultX, this.guard.defaultY);
			UnitToCity.delete(this.guard.unit);
			this.guard.replace(unit);
			UnitToCity.set(this.guard.unit, this);
			this.guard.reposition();
		}
	}

	/**
	 * Handles the casting event.
	 * If the targeted unit is not a guard or a transport, performs the casting actions.
	 */
	public onCast(targetedUnit: unit, triggerPlayer: player): void {
		if (IsUnitType(targetedUnit, UNIT_TYPE.GUARD)) return;
		if (IsUnitType(targetedUnit, UNIT_TYPE.TRANSPORT)) return;

		this.castHandler(targetedUnit);
	}

	/**
	 * Checks if this city type is a port
	 */
	public isPort(): boolean {
		return true;
	}

	/**
	 * Checks if this city type is a capital
	 */
	public override isCapital(): boolean {
		return false;
	}
}
