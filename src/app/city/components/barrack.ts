import { Ownable } from 'src/app/interfaces/ownable';
import { Resetable } from 'src/app/interfaces/resettable';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';

export class Barrack implements Ownable, Resetable {
	private readonly unit: unit;
	private readonly defaultX: number;
	private readonly defaultY: number;

	constructor(unit: unit) {
		this.unit = unit;
		this.defaultX = GetUnitX(unit);
		this.defaultY = GetUnitY(unit);
	}

	public setOwner(player: player): void {
		SetUnitOwner(this.unit, player, true);
	}

	public getOwner(): player {
		return GetOwningPlayer(this.unit);
	}

	public reset(): void {
		SetUnitOwner(this.unit, NEUTRAL_HOSTILE, true);
		SetUnitRallyUnit(this.unit, this.unit);
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
}
