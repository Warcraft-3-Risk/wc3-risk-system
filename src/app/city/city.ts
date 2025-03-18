import { Ownable } from '../interfaces/ownable';
import { Resetable } from '../interfaces/resetable';
import { NEUTRAL_HOSTILE } from '../utils/utils';
import { Barracks } from './components/barracks';
import { Guard } from './components/guard';
import { UnitToCity } from './city-map';
import { UNIT_TYPE } from '../utils/unit-types';
import { UNIT_ID } from 'src/configs/unit-id';
import { ABILITY_ID } from 'src/configs/ability-id';

/**
 * Abstract class for a City.
 * A City can be reset and owned, and has methods for dealing with units.
 */
export abstract class City implements Resetable, Ownable {
	private owner: player;
	private _barrack: Barracks;
	private _guard: Guard;
	private _cop: unit;

	/**
	 * @param rax The barracks for the city
	 * @param guard The guard for the city
	 * @param cop The Circle of Power for the city
	 */
	constructor(rax: Barracks, guard: Guard, cop: unit) {
		this.owner = NEUTRAL_HOSTILE;
		this._barrack = rax;
		this._guard = guard;
		this._cop = cop;
	}

	public abstract isValidGuard(unit: unit): boolean;
	public abstract onUnitTrain(unit: unit): void;
	public abstract onCast(targetingUnit: unit): void;
	public abstract isPort(): boolean;
	public abstract isCapital(): boolean;

	/** Resets the city, returning it to its default state */
	public reset(): void {
		UnitToCity.delete(this.guard.unit);
		SetUnitOwner(this._cop, NEUTRAL_HOSTILE, true);
		this.owner = NEUTRAL_HOSTILE;
		this._barrack.reset();
		this._guard.reset();
		UnitToCity.set(this.guard.unit, this);
	}

	/**
	 * @param player The player to set as the city's owner
	 */
	public setOwner(player: player): void {
		this.owner = player;
		this._barrack.setOwner(player);
		SetUnitOwner(this._cop, player, true);
	}

	/**
	 * @param newOwner The new owner of the city
	 */
	public changeOwner(newOwner: player): void {
		this.setOwner(newOwner);
		IssuePointOrder(this._barrack.unit, 'setrally', this._barrack.defaultX - 70, this._barrack.defaultY - 155);
	}

	/** @returns The current owner of the city */
	public getOwner(): player {
		return this.owner;
	}

	/** @returns The Barracks object of the city */
	public get barrack(): Barracks {
		return this._barrack;
	}

	/** @returns The Circle of Power of the city */
	public get cop(): unit {
		return this._cop;
	}

	/** @returns The Guard object of the city */
	public get guard(): Guard {
		return this._guard;
	}

	/**
	 * @param value The new guard for the city
	 */
	public set guard(value: Guard) {
		this._guard = value;
	}

	/**
	 * A helper method to determine if a given unit is a valid guard.
	 * The guard must be alive, not loaded, not a structure or transport,
	 * and should not be the same unit as the city's current guard.
	 * @param unit - The unit to check.
	 * @returns `true` if the unit is valid, `false` otherwise.
	 */
	protected validGuardHandler(unit: unit): boolean {
		if (!UnitAlive(unit)) return false;
		if (IsUnitLoaded(unit)) return false;
		if (IsUnitType(unit, UNIT_TYPE_STRUCTURE)) return false;
		if (IsUnitType(unit, UNIT_TYPE.TRANSPORT)) return false;
		if (GetUnitTypeId(unit) == UNIT_ID.DUMMY_GUARD) return false;
		if (unit == null || unit == undefined) return false;
		if (IsUnitType(unit, UNIT_TYPE.GUARD) && unit != this.guard.unit) return false;

		return true;
	}

	/**
	 * A handler method for the casting event.
	 * It changes the city's guard to the unit targeted by the spell,
	 * and repositions the old guard to the location of the targeted unit.
	 */
	protected castHandler(targetingUnit: unit): void {
		const targUnit: unit = GetSpellTargetUnit();
		const x: number = GetUnitX(targUnit);
		const y: number = GetUnitY(targUnit);
		const oldGuard: unit = this.guard.unit;

		UnitToCity.delete(this.guard.unit);
		this.guard.replace(targUnit);
		UnitToCity.set(this.guard.unit, this);

		//IsTerrainPathable Returns negated results for some reason. Gj Blizzard
		if (!IsUnitType(oldGuard, UNIT_TYPE_GIANT) && IsTerrainPathable(x, y, PATHING_TYPE_WALKABILITY)) {
			SetUnitPosition(oldGuard, this._barrack.defaultX, this._barrack.defaultY);
		} else {
			SetUnitPosition(oldGuard, x, y);
		}

		this.guard.reposition();

		const newOwner: player = GetOwningPlayer(this.guard.unit);

		if (this.owner != newOwner) {
			const currOwner = this.owner;

			this.setOwner(newOwner);

			if (IsPlayerAlly(currOwner, this.owner)) {
				BlzStartUnitAbilityCooldown(this._barrack.unit, ABILITY_ID.SWAP, BlzGetAbilityCooldown(ABILITY_ID.SWAP, 0));
			}
		}
	}
}
