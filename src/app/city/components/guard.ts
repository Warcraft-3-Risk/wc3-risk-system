import { UNIT_ID } from 'src/configs/unit-id';
import { UNIT_TYPE } from 'src/app/utils/unit-types';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { Resetable } from 'src/app/interfaces/resetable';
import { ClientManager } from 'src/app/game/services/client-manager';
import { UnitLagManager } from 'src/app/game/services/unit-lag-manager';
import { debugPrint } from 'src/app/utils/debug-print';
import { ABILITY_ID } from 'src/configs/ability-id';

/**
 * Represents a Guard entity in the game, implementing the `Resetable` interface.
 */
export class Guard implements Resetable {
	private _unit: unit;
	private readonly unitType: number;
	private readonly _defaultX: number;
	private readonly _defaultY: number;

	/**
	 * Constructs a new Guard object.
	 * @param guardData - The data for the type of guard.
	 * @param x - The default X coordinate for the guard on the map.
	 * @param y - The default Y coordinate for the guard on the map.
	 */
	constructor(guardData: number, x: number, y: number) {
		this._defaultX = x;
		this._defaultY = y;
		this.unitType = guardData;
		this.build();
	}

	/** @returns The unit object that represents the guard. */
	public get unit(): unit {
		return this._unit;
	}

	/** @returns The default X coordinate of the guard on the map. */
	public get defaultX(): number {
		return this._defaultX;
	}

	/** @returns The default Y coordinate of the guard on the map. */
	public get defaultY(): number {
		return this._defaultY;
	}

	/**
	 * Sets the guard unit and adds the guard type to it.
	 * @param guard - The unit object that will become the new guard.
	 */
	public set(guard: unit): void {
		if (GetUnitTypeId(this._unit) == UNIT_ID.DUMMY_GUARD) {
			this.remove();
		}

		this._unit = guard;
		UnitAddAbility(guard, ABILITY_ID.GUARD_INDICATOR);
		UnitAddType(this._unit, UNIT_TYPE.GUARD);

		// Untrack from MinimapIconManager FIRST (this re-enables native minimap display internally),
		// then hide the native minimap icon. Order matters — reversing these causes the native dot to leak through.
		UnitLagManager.getInstance().untrackUnit(guard);
		BlzSetUnitBooleanFieldBJ(guard, UNIT_BF_HIDE_MINIMAP_DISPLAY, true);
	}

	/**
	 * Releases the guard, removing the guard type and setting the unit to null.
	 */
	public release(): void {
		if (this._unit == null) return;

		UnitRemoveType(this._unit, UNIT_TYPE.GUARD);
		UnitRemoveAbility(this._unit, ABILITY_ID.GUARD_INDICATOR);

		// Show the unit's minimap icon again
		BlzSetUnitBooleanFieldBJ(this._unit, UNIT_BF_HIDE_MINIMAP_DISPLAY, false);
		UnitLagManager.getInstance().trackUnit(this._unit);

		this._unit = null;
	}

	/**
	 * Removes the guard unit from the game entirely.
	 */
	public remove(): void {
		if (this._unit) {
			const owner = GetOwningPlayer(this._unit);
			debugPrint(`[SlotCount] Unit removed on slot ${GetPlayerId(owner)}`);
			ClientManager.getInstance().decrementUnitCount(owner);
		}
		RemoveUnit(this._unit);
		this._unit = null;
	}

	/**
	 * Resets the guard unit by removing it and then rebuilding it.
	 */
	public reset(): void {
		this.remove();
		this.build();
	}

	/**
	 * Repositions the guard to its default coordinates.
	 */
	public reposition(): void {
		SetUnitPosition(this._unit, this._defaultX, this._defaultY);
	}

	/**
	 * Replaces the current guard with a new one, and repositions it as necessary.
	 * @param guard - The new guard unit.
	 */
	public replace(guard: unit): void {
		// If the same unit is being re-assigned as guard, just reposition — no need to
		// release/set which causes unnecessary untrack→track→untrack minimap churn.
		if (guard === this._unit) {
			this.reposition();
			return;
		}

		if (GetUnitTypeId(this._unit) == UNIT_ID.DUMMY_GUARD) {
			this.remove();
		} else {
			this.release();
		}

		this.set(guard);
		this.reposition();
	}

	/**
	 * Builds the guard unit by creating it with the specified type and default coordinates.
	 */
	private build(): void {
		const unit = CreateUnit(NEUTRAL_HOSTILE, this.unitType, this._defaultX, this._defaultY, 270);
		this.set(unit);
		SetUnitInvulnerable(unit, true);
	}
}
