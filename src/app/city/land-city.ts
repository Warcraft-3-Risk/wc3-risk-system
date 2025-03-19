import { UNIT_TYPE } from '../utils/unit-types';
import { City } from './city';
import { UnitToCity } from './city-map';
import { Barracks } from './components/barracks';
import { Guard } from './components/guard';
import { IsUnitMelee } from '../utils/utils';
import { DefaultGuardType } from 'src/configs/country-settings';
import { UNIT_ID } from 'src/configs/unit-id';
import { CityToCountry } from '../country/country-map';
import { PlayerManager } from '../player/player-manager';
import { TeamManager } from '../teams/team-manager';
import { debugPrint } from '../utils/debug-print';
import { LocalMessage } from '../utils/messages';

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
	public onCast(targetedUnit: unit, triggerPlayer: player): void {
		if (IsUnitType(targetedUnit, UNIT_TYPE.SHIP)) return;
		if (IsUnitType(targetedUnit, UNIT_TYPE.GUARD)) return;

		// city.onCast(targetedUnit, triggerPlayer);
		// Not a capital then swap
		if (!this.isCapital()) {
			debugPrint('Not a capital then swap');
			this.castHandler(targetedUnit);
			return;
		}

		// If owner then swap
		if (GetOwningPlayer(targetedUnit) === this.getOwner()) {
			debugPrint('If same owner then swap');
			this.castHandler(targetedUnit);
			return;
		}

		// If enemy team then don't swap
		const shareTeam = TeamManager.getInstance().getTeamFromPlayer(GetOwningPlayer(targetedUnit)).playerIsInTeam(this.getOwner());
		if (!shareTeam) {
			debugPrint("If enemy team then don't swap");
			LocalMessage(triggerPlayer, `You can only switch guards with an ally unit!`, 'Sound\\Interface\\Error.flac');
			return;
		}

		// If captured capital then swap
		const unitTypeId = GetUnitTypeId(this.barrack.unit);
		if (unitTypeId == UNIT_ID.CONQUERED_CAPITAL) {
			this.castHandler(targetedUnit);
			return;
		}

		// Owner of capital is alive
		if (unitTypeId == UNIT_ID.CAPITAL) {
			debugPrint('You can not swap the guard of an allied capital!');
			LocalMessage(triggerPlayer, `You can not swap the guard of an allied capital!`, 'Sound\\Interface\\Error.flac');
			return;
		}

		throw new Error('LandCity.onCast: Not supported scenario');
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
		return this.capital;
	}

	/**
	 * Sets the city as a capital
	 */
	public setCapital(): void {
		this.capital = true;
		CityToCountry.get(this).getSpawn().setMultiplier(2);
		IssueImmediateOrderById(this.barrack.unit, UNIT_ID.CAPITAL);
	}

	/**
	 * Resets city to default state
	 */
	public override reset(): void {
		this.capital = false;
		CityToCountry.get(this).getSpawn().setMultiplier(1);
		IssueImmediateOrderById(this.barrack.unit, UNIT_ID.CITY);
		super.reset();
	}
}
