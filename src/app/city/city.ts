import { UNIT_ID } from 'src/configs/unit-id';
import { UNIT_TYPE } from '../utils/unit-types';
import { NEUTRAL_HOSTILE } from '../utils/utils';
import { ICityBehavior } from './behaviors/city-behavior.interface';
import { Barrack } from './components/barrack';
import { Guard } from './components/guard';
import { GuardFactory } from './builder/guard-factory';
import { Ownable } from '../interfaces/ownable';
import { Resetable } from '../interfaces/resettable';

export class City implements Resetable, Ownable {
	private owner: player;
	private barrack: Barrack;
	private guard: Guard;
	private cop: unit;
	private behavior: ICityBehavior;

	constructor(barrack: Barrack, guardFactory: GuardFactory, cop: unit, behavior: ICityBehavior) {
		this.owner = NEUTRAL_HOSTILE;
		this.barrack = barrack;
		this.guard = guardFactory(this);
		this.cop = cop;
		this.behavior = behavior;
	}

	public isValidGuard(unit: unit): boolean {
		return this.behavior.isValidGuard(this, unit);
	}

	public onUnitTrain(unit: unit): void {
		this.behavior.onUnitTrain(this, unit);
	}

	public onCast(): void {
		this.behavior.onCast(this);
	}

	public reset(): void {
		this.owner = NEUTRAL_HOSTILE;
		this.barrack.reset();
		this.guard.reset();
		SetUnitOwner(this.cop, NEUTRAL_HOSTILE, true);
	}

	public setOwner(player: player): void {
		this.owner = player;
		this.barrack.setOwner(player);
		SetUnitOwner(this.cop, player, true);
	}

	public changeOwner(newOwner: player): void {
		this.setOwner(newOwner);
		IssuePointOrder(this.barrack.getUnit(), 'setrally', this.barrack.getDefaultX() - 70, this.barrack.getDefaultY() - 155);
	}

	public getOwner(): player {
		return this.owner;
	}

	public getBarrack(): Barrack {
		return this.barrack;
	}

	public getGuard(): Guard {
		return this.guard;
	}

	public getCOP(): unit {
		return this.cop;
	}

	public updateGuard(newGuardUnit: unit): void {
		this.guard.replace(newGuardUnit);
	}

	public validGuardHandler(unit: unit): boolean {
		if (!UnitAlive(unit)) return false;
		if (IsUnitLoaded(unit)) return false;
		if (IsUnitType(unit, UNIT_TYPE_STRUCTURE)) return false;
		if (IsUnitType(unit, UNIT_TYPE.TRANSPORT)) return false;
		if (GetUnitTypeId(unit) === UNIT_ID.DUMMY_GUARD) return false;
		if (unit == null || unit === undefined) return false;
		if (IsUnitType(unit, UNIT_TYPE.GUARD) && unit !== this.guard.getUnit()) return false;

		return true;
	}

	public castHandler(): void {
		const targUnit: unit = GetSpellTargetUnit();
		const x: number = GetUnitX(targUnit);
		const y: number = GetUnitY(targUnit);
		const oldGuard: unit = this.guard.getUnit();

		this.updateGuard(targUnit);
		SetUnitPosition(oldGuard, x, y);
		this.guard.reposition();

		const newOwner: player = GetOwningPlayer(this.guard.getUnit());

		if (this.owner !== newOwner) {
			this.setOwner(newOwner);
		}
	}
}
