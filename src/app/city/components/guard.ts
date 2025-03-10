import { UNIT_TYPE } from 'src/app/utils/unit-types';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { City } from '../city';
import { HandleToCity } from '../handle-to-city';
import { Resetable } from 'src/app/interfaces/resettable';
import { UNIT_ID } from 'src/app/configs/unit-id';

export class Guard implements Resetable {
	private unit: unit;
	private readonly unitType: number;
	private readonly defaultX: number;
	private readonly defaultY: number;
	private readonly city: City;

	constructor(unitType: number, x: number, y: number, city: City) {
		this.unitType = unitType;
		this.defaultX = x;
		this.defaultY = y;
		this.city = city;
		this.build();
	}

	public reset(): void {
		this.remove();
		this.build();
	}

	public getUnit(): unit {
		return this.unit;
	}

	public getDefaultX(): number {
		return this.defaultX;
	}

	public getDefaultY(): number {
		return this.defaultY;
	}

	public set(guard: unit): void {
		if (GetUnitTypeId(this.unit) == UNIT_ID.DUMMY_GUARD) {
			this.remove();
		}

		if (this.unit && HandleToCity.has(this.unit)) {
			HandleToCity.delete(this.unit);
		}

		this.unit = guard;
		HandleToCity.set(this.unit, this.city);
		UnitAddType(this.unit, UNIT_TYPE.GUARD);
	}

	public release(): void {
		if (this.unit == null) return;

		UnitRemoveType(this.unit, UNIT_TYPE.GUARD);
		HandleToCity.delete(this.unit);
		this.unit = null;
	}

	public remove(): void {
		RemoveUnit(this.unit);
		HandleToCity.delete(this.unit);
		this.unit = null;
	}

	public reposition(): void {
		SetUnitPosition(this.unit, this.defaultX, this.defaultY);
	}

	public replace(guard: unit): void {
		if (GetUnitTypeId(this.unit) == UNIT_ID.DUMMY_GUARD) {
			this.remove();
		} else {
			this.release();
		}

		this.set(guard);
		this.reposition();
	}

	private build(): void {
		this.set(CreateUnit(NEUTRAL_HOSTILE, this.unitType, this.defaultX, this.defaultY, 270));
		SetUnitInvulnerable(this.unit, true);
	}
}
