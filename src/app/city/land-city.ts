import { UNIT_TYPE } from '../utils/unit-types';
import { City } from './city';
import { UnitToCity } from './city-map';
import { Barracks } from './components/barracks';
import { Guard } from './components/guard';
import { IsUnitMelee } from '../utils/utils';
import { DefaultGuardType } from 'src/configs/country-settings';

/**
 * LandCity is a variant of City for land based terrain.
 */
export class LandCity extends City {
	private capital: boolean;

	/**
	 * LandCity constructor.
	 * @param rax - The city's Barracks.
	 * @param guard - The city's Guard.
	 * @param cop - The city's Circle of Power.
	 */
	public constructor(rax: Barracks, guard: Guard, cop: unit) {
		super(rax, guard, cop);
	}

	/**
	 * Determines if a given unit is a valid guard for this city.
	 * The unit must not be a ship and must pass the `validGuardHandler` check.
	 * @param unit - The unit to check.
	 * @returns `true` if the unit is valid, `false` otherwise.
	 */
	public isValidGuard(unit: unit): boolean {
		if (IsUnitType(unit, UNIT_TYPE.SHIP)) return false;
		if (!this.validGuardHandler(unit)) return false;

		return true;
	}

	/**
	 * Handles the unit training event.
	 * If the city's guard is melee and the trained unit is a rifleman,
	 * the guard is replaced by the trained unit.
	 * @param unit - The trained unit.
	 */
	public onUnitTrain(unit: unit): void {
		//TODO remove the defaultguardtype dependancy here.
		//Maybe just run player options instead
		if (IsUnitMelee(this.guard.unit) && GetUnitTypeId(unit) == DefaultGuardType) {
			SetUnitPosition(unit, this.guard.defaultX, this.guard.defaultY);
			UnitToCity.delete(this.guard.unit);
			this.guard.replace(unit);
			UnitToCity.set(this.guard.unit, this);
			this.guard.reposition();
		}
	}

	/**
	 * Handles the casting event.
	 * If the targeted unit is not a ship or a guard, performs the casting actions.
	 */
	public onCast(): void {
		if (IsUnitType(GetSpellTargetUnit(), UNIT_TYPE.SHIP)) return;
		if (IsUnitType(GetSpellTargetUnit(), UNIT_TYPE.GUARD)) return;

		this.castHandler();
	}

	/**
	 * Checks if this city type is a port
	 */
	public isPort(): boolean {
		return false;
	}

	/**
	 * Checks if this city type is a capital
	 */
	public isCapital(): boolean {
		return false;
	}

	/**
	 * Sets the city as a capital
	 */
	public setCapital(): void {
		this.capital = true;
	}

	public reset(): void {
		this.capital = false;
		super.reset();
	}
}
