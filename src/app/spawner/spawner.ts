import { UNIT_ID } from '../../configs/unit-id';
import { ClientManager } from '../game/services/client-manager';
import { UnitLagManager } from '../game/services/unit-lag-manager';
import { GlobalGameData } from '../game/state/global-game-state';
import { Ownable } from '../interfaces/ownable';
import { Resetable } from '../interfaces/resetable';
import { debugPrint } from '../utils/debug-print';
import { UNIT_TYPE } from '../utils/unit-types';
import { NEUTRAL_HOSTILE } from '../utils/utils';
import { MinimapIconManager } from '../managers/minimap-icon-manager';

export const SPAWNER_UNITS: Map<unit, Spawner> = new Map<unit, Spawner>();

export class Spawner implements Resetable, Ownable {
	private _unit: unit;
	private country: string;
	private spawnsPerStep: number;
	private spawnMap: Map<player, unit[]>;
	private spawnType: number;
	private multiplier: number;
	private spawnsPerPlayer: number;

	/**
	 * Spawner constructor.
	 * @param {unit} unit - The unit associated with the spawner.
	 * @param {string} countryName - The name of the country where the spawner is located.
	 * @param {number} spawnsPerStep - The number of units spawned per step.
	 * @param {number} spawnsPerPlayer - The number of units spawned per player.
	 * @param {number} spawnTypdID - The type ID of the spawn.
	 */
	public constructor(
		unit: unit,
		countryName: string,
		spawnsPerStep: number,
		spawnsPerPlayer: number,
		spawnTypdID: number,
		multiplier: number
	) {
		this._unit = unit;
		this.country = countryName;
		this.spawnsPerStep = spawnsPerStep;
		this.spawnsPerPlayer = spawnsPerPlayer;
		this.spawnType = spawnTypdID;
		this.spawnMap = new Map<player, unit[]>();
		this.multiplier = multiplier;
		this.setName();
	}

	private get maxSpawnsPerPlayerWithMultiplier(): number {
		return this.spawnsPerPlayer * this.multiplier;
	}

	private get spawnsPerStepWithMultiplier(): number {
		return this.spawnsPerStep * this.multiplier;
	}

	/** @returns The unit associated with the spawner. */
	public get unit(): unit {
		return this._unit;
	}

	/**
	 * Executes a step for the spawner, creating new units if conditions are met.
	 */
	public step() {
		if (this.getOwner() == NEUTRAL_HOSTILE) return;
		if (GetPlayerSlotState(this.getOwner()) != PLAYER_SLOT_STATE_PLAYING) return;
		if (GlobalGameData.matchState != 'inProgress') return;

		const spawnCount: number = this.spawnMap.get(this.getOwner()).length;

		if (spawnCount >= this.maxSpawnsPerPlayerWithMultiplier) return;

		const amount: number = Math.min(this.spawnsPerStepWithMultiplier, this.maxSpawnsPerPlayerWithMultiplier - spawnCount);

		for (let i = 0; i < amount; i++) {
			let u: unit = CreateUnit(
				ClientManager.getInstance().getClientOrPlayer(this.getOwner()),
				this.spawnType,
				GetUnitX(this.unit),
				GetUnitY(this.unit),
				270
			);
			UnitLagManager.getInstance().trackUnit(u);
			let loc: location = GetUnitRallyPoint(this.unit);

			if (!IsUnitType(u, UNIT_TYPE.TRANSPORT)) {
				GlobalGameData.matchPlayers.find((x) => x.getPlayer() == this.getOwner()).trackedData.units.add(u);
			}

			UnitAddType(u, UNIT_TYPE.SPAWN);
			// Register for minimap tracking if valid (must be done after adding SPAWN type)
			MinimapIconManager.getInstance().registerIfValid(u);

			if (GetLocalPlayer() == this.getOwner()) {
				SetUnitVertexColor(u, 200, 200, 200, 150);
			}
			BlzSetUnitName(u, `${GetUnitName(u)} (${this.country})`);
			this.spawnMap.get(this.getOwner()).push(u);
			SPAWNER_UNITS.set(u, this);

			if (loc != null) {
				IssuePointOrderLoc(u, 'attack', loc);
				RemoveLocation(loc);
			}

			loc = null;
			u = null;
		}

		this.setName();
	}

	/**
	 * Resets the spawner to its initial state.
	 */
	public reset() {
		const x: number = GetUnitX(this.unit);
		const y: number = GetUnitY(this.unit);

		this.spawnMap.clear();
		RemoveUnit(this.unit);
		this._unit = null;

		this.rebuild(x, y);
		this.setName();
	}

	/**
	 * Sets the owner of the spawner.
	 * @param {player} player - The player to set as owner.
	 */
	public setOwner(player: player): void {
		if (player == null) player = NEUTRAL_HOSTILE;

		SetUnitOwner(this._unit, ClientManager.getInstance().getOwner(player), true);

		if (!this.spawnMap.has(this.getOwner())) {
			this.spawnMap.set(this.getOwner(), []);
		}

		this.setName();
		IssuePointOrder(this._unit, 'setrally', GetUnitX(this._unit), GetUnitY(this._unit));
	}

	/** @returns The player that owns the spawner. */
	public getOwner(): player {
		return ClientManager.getInstance().getOwnerOfUnit(this._unit);
	}

	/**
	 * Handles the death of a unit associated with the spawner.
	 * @param {player} player - The player owning the deceased unit.
	 * @param {unit} unit - The deceased unit.
	 */
	public onDeath(player: player, unit: unit): void {
		const index = this.spawnMap.get(ClientManager.getInstance().getOwner(player)).indexOf(unit);

		this.spawnMap.get(ClientManager.getInstance().getOwner(player)).splice(index, 1);

		SPAWNER_UNITS.delete(unit);

		this.setName();
	}

	/**
	 * Sets the name of the spawner based on its current state.
	 */
	private setName(): void {
		if (GetOwningPlayer(this.unit) == NEUTRAL_HOSTILE) {
			BlzSetUnitName(this.unit, `${this.country} is unowned`);
			SetUnitAnimation(this.unit, 'death');
		} else {
			const spawnCount: number = this.spawnMap.get(this.getOwner()).length;

			BlzSetUnitName(this.unit, `${this.country}  ${spawnCount} / ${this.maxSpawnsPerPlayerWithMultiplier}`);
			SetUnitAnimation(this.unit, 'stand');
		}
	}

	/**
	 * Sets the multiplier for the spawner.
	 * @param {number} multiplier - The new multiplier
	 */
	public setMultiplier(multiplier: number): void {
		this.multiplier = multiplier;
	}

	/**
	 * Rebuilds the spawner at a given location.
	 * @param {number} x - The x coordinate for the spawner.
	 * @param {number} y - The y coordinate for the spawner.
	 */
	private rebuild(x: number, y: number) {
		this._unit = CreateUnit(NEUTRAL_HOSTILE, UNIT_ID.SPAWNER, x, y, 270);
		SetUnitPathing(this.unit, false);
	}
}
