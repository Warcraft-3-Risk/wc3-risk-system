import { UNIT_ID } from '../../configs/unit-id';
import { Ownable } from '../interfaces/ownable';
import { Resetable } from '../interfaces/resettable';
import { UNIT_TYPE } from '../utils/unit-types';
import { NEUTRAL_HOSTILE } from '../utils/utils';

export const SPANWER_UNITS: Map<unit, Spawner> = new Map<unit, Spawner>();

export class Spawner implements Resetable, Ownable {
	private _unit: unit;
	private country: string;
	private spawnsPerStep: number;
	private maxSpawnsPerPlayer: number;
	private spawnMap: Map<player, unit[]>;
	private spawnType: number;

	public constructor(unit: unit, countryName: string, spawnsPerStep: number, spawnsPerPlayer: number, spawnTypdID: number) {
		this._unit = unit;
		this.country = countryName;
		this.spawnsPerStep = spawnsPerStep;
		this.maxSpawnsPerPlayer = spawnsPerPlayer;
		this.spawnType = spawnTypdID;
		this.spawnMap = new Map<player, unit[]>();
		this.setName();
	}

	public get unit(): unit {
		return this._unit;
	}

	public step() {
		if (this.getOwner() == NEUTRAL_HOSTILE) return;
		if (GetPlayerSlotState(this.getOwner()) != PLAYER_SLOT_STATE_PLAYING) return;

		const spawnCount: number = this.spawnMap.get(this.getOwner()).length;

		if (spawnCount >= this.maxSpawnsPerPlayer) return;

		const amount: number = Math.min(this.spawnsPerStep, this.maxSpawnsPerPlayer - spawnCount);

		for (let i = 0; i < amount; i++) {
			let u: unit = CreateUnit(this.getOwner(), this.spawnType, GetUnitX(this.unit), GetUnitY(this.unit), 270);
			let loc: location = GetUnitRallyPoint(this.unit);

			UnitAddType(u, UNIT_TYPE.SPAWN);
			this.spawnMap.get(this.getOwner()).push(u);
			SPANWER_UNITS.set(u, this);
			IssuePointOrderLoc(u, 'attack', loc);

			RemoveLocation(loc);
			loc = null;
			u = null;
		}

		this.setName();
	}

	public reset() {
		const x: number = GetUnitX(this.unit);
		const y: number = GetUnitY(this.unit);

		this.spawnMap.clear();
		RemoveUnit(this.unit);
		this._unit = null;

		this.rebuild(x, y);
		this.setName();
	}

	public setOwner(player: player): void {
		if (player == null) player = NEUTRAL_HOSTILE;

		SetUnitOwner(this._unit, player, true);

		if (!this.spawnMap.has(this.getOwner())) {
			this.spawnMap.set(this.getOwner(), []);
		}

		this.setName();
		IssuePointOrder(this._unit, 'setrally', GetUnitX(this._unit), GetUnitY(this._unit));
	}

	public getOwner(): player {
		return GetOwningPlayer(this._unit);
	}

	public onDeath(player: player, unit: unit): void {
		const index = this.spawnMap.get(player).indexOf(unit);

		this.spawnMap.get(player).splice(index, 1);

		SPANWER_UNITS.delete(unit);

		this.setName();
	}

	private setName(): void {
		if (GetOwningPlayer(this.unit) == NEUTRAL_HOSTILE) {
			BlzSetUnitName(this.unit, `${this.country} is unowned`);
			SetUnitAnimation(this.unit, 'death');
		} else {
			const spawnCount: number = this.spawnMap.get(this.getOwner()).length;

			BlzSetUnitName(this.unit, `${this.country}  ${spawnCount} / ${this.maxSpawnsPerPlayer}`);
			SetUnitAnimation(this.unit, 'stand');
		}
	}

	private rebuild(x: number, y: number) {
		this._unit = CreateUnit(NEUTRAL_HOSTILE, UNIT_ID.SPAWNER, x, y, 270);
		SetUnitPathing(this.unit, false);
	}
}
