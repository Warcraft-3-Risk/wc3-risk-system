import { CityGuardXOffSet, CityGuardYOffSet, CityRegionSize, DefaultCityType } from 'src/configs/city-settings';
import { DefaultBarrackType, DefaultGuardType } from 'src/configs/country-settings';
import { UNIT_ID } from 'src/configs/unit-id';
import { NEUTRAL_HOSTILE } from '../utils/utils';
import { City } from './city';
import { CityBuilder } from './city-builder';
import { RegionToCity, UnitToCity } from './city-map';
import { CityType, CityTypes } from './city-type';
import { Barracks } from './components/barracks';
import { Guard } from './components/guard';
import { UnitData } from '../interfaces/unit-data';
import { EnterRegionTrigger } from '../triggers/enter-region-event';
import { LeaveRegionTrigger } from '../triggers/leave-region-event';
import { UnitTrainedTrigger } from '../triggers/unit-trained-event';
import { Resetable } from '../interfaces/resetable';

// Calculate the X offset for a barrack unit
const GetRaxXOffSet = (rax: unit) => GetUnitX(rax) - CityGuardXOffSet;

// Calculate the Y offset for a barrack unit
const GetRaxYOffSet = (rax: unit) => GetUnitY(rax) - CityGuardYOffSet;

/**
 * Class implementing the CityBuilder interface, providing methods to build a City.
 */
export class ConcreteCityBuilder implements CityBuilder, Resetable {
	private _barracks: Barracks;
	private _guard: Guard;
	private _cop: unit;
	private _cityType: CityType;

	/**
	 * @param building Unit or unit data to set as barracks
	 * @returns The instance of ConcreteCityBuilder for method chaining
	 */
	public setBarracks(building: unit | UnitData): CityBuilder {
		if (typeof building === 'object') {
			const rax: UnitData = building as UnitData;

			if (!rax.typeId) {
				rax.typeId = DefaultBarrackType;
			}

			building = CreateUnit(NEUTRAL_HOSTILE, rax.typeId, rax.x, rax.y, 270);
		}

		BlzSetUnitBooleanFieldBJ(building, UNIT_BF_HIDE_MINIMAP_DISPLAY, true);
		this._barracks = new Barracks(building);

		return this;
	}

	/**
	 * @param name Optional name to set for the city's barracks
	 * @returns The instance of ConcreteCityBuilder for method chaining
	 */
	public setName(name?: string): CityBuilder {
		if (name) {
			BlzSetUnitName(this._barracks.unit, name);
		}

		return this;
	}

	/**
	 * @param guard Guard number to set for the city
	 * @returns The instance of ConcreteCityBuilder for method chaining
	 */
	public setGuard(guard: number): CityBuilder {
		const x: number = GetRaxXOffSet(this._barracks.unit);
		const y: number = GetRaxYOffSet(this._barracks.unit);

		if (!guard) {
			guard = DefaultGuardType;
		}

		this._guard = new Guard(guard, x, y);

		return this;
	}

	/**
	 * @param cop Optional unit to set as the city's Circle of Power
	 * @returns The instance of ConcreteCityBuilder for method chaining
	 */
	public setCOP(cop?: unit): CityBuilder {
		if (cop) {
			this._cop = cop;
		} else {
			const x: number = GetRaxXOffSet(this._barracks.unit);
			const y: number = GetRaxYOffSet(this._barracks.unit);

			this._cop = CreateUnit(NEUTRAL_HOSTILE, UNIT_ID.CONTROL_POINT, x, y, 270);
			BlzSetUnitBooleanFieldBJ(this._cop, UNIT_BF_HIDE_MINIMAP_DISPLAY, true);
		}

		return this;
	}

	/**
	 * @param cityType Optional type to set for the city
	 * @returns The instance of ConcreteCityBuilder for method chaining
	 */
	public setCityType(cityType?: CityType): CityBuilder {
		if (cityType) {
			this._cityType = cityType;
		} else {
			this._cityType = DefaultCityType;
		}

		return this;
	}

	/**
	 * Builds the city object using the set properties.
	 * If required properties are missing, appropriate errors will be logged.
	 * @returns The created City
	 */
	public build(): City {
		if (!this._barracks || !this._guard || !this._cop || !this._cityType) {
			print('City builder is missing required components.');
		}

		const CityConstructor = CityTypes[this._cityType];

		if (!CityConstructor) {
			print(`No city terrain type of "${this._cityType}" found`);
		}

		const city = new CityConstructor(this._barracks, this._guard, this._cop);

		this.setRegion(city);
		TriggerRegisterUnitEvent(UnitTrainedTrigger, city.barrack.unit, EVENT_UNIT_TRAIN_FINISH);
		UnitToCity.set(this._barracks.unit, city);
		UnitToCity.set(this._guard.unit, city);
		city.setOwner(NEUTRAL_HOSTILE);

		this.reset();

		return city;
	}

	/**
	 * Resets the builder, clearing all set properties.
	 */
	public reset(): void {
		this._barracks = null;
		this._guard = null;
		this._cop = null;
		this._cityType = null;
	}

	/**
	 * @param city The city to set the region for
	 */
	private setRegion(city: City): void {
		const rect = Rect(
			city.guard.defaultX - CityRegionSize / 2,
			city.guard.defaultY - CityRegionSize / 2,
			city.guard.defaultX + CityRegionSize / 2,
			city.guard.defaultY + CityRegionSize / 2
		);

		const region = CreateRegion();
		RegionAddRect(region, rect);
		RemoveRect(rect);
		TriggerRegisterEnterRegion(EnterRegionTrigger, region, null);
		TriggerRegisterLeaveRegion(LeaveRegionTrigger, region, null);
		RegionToCity.set(region, city);
	}
}
