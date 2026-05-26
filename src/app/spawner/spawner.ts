import { UNIT_ID } from '../../configs/unit-id';
import { computeSpawnAmount } from './spawner-logic';
import { SharedSlotManager } from '../game/services/shared-slot-manager';
import { UnitLagManager } from '../game/services/unit-lag-manager';
import { GlobalGameData } from '../game/state/global-game-state';
import { Ownable } from '../interfaces/ownable';
import { Resetable } from '../interfaces/resetable';
import { PlayerManager } from '../player/player-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { debugPrint } from '../utils/debug-print';
import { DC, DEBUG_PRINTS } from 'src/configs/game-settings';
import { UNIT_TYPE } from '../utils/unit-types';
import { NEUTRAL_HOSTILE } from '../utils/utils';
import { MinimapIconManager } from '../managers/minimap-icon-manager';
import { AllyColorFilterManager } from '../managers/ally-color-filter-manager';
export const SPAWNER_UNITS: Map<unit, Spawner> = new Map<unit, Spawner>();

export class Spawner implements Resetable, Ownable {
	private _unit: unit;
	private country: string;
	private spawnsPerStep: number;
	private spawnMap: Map<player, Set<unit>>;
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
		this.spawnMap = new Map<player, Set<unit>>();
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
		const owner = this.getOwner();

		if (owner === NEUTRAL_HOSTILE) return;
		if (GetPlayerSlotState(owner) !== PLAYER_SLOT_STATE_PLAYING) return;
		if (GlobalGameData.matchState !== 'inProgress') return;

		// Eliminated players (e.g. forfeited via -ff) still have PLAYER_SLOT_STATE_PLAYING,
		// so we must explicitly check their status to prevent spawning in FFA.
		// In team games, eliminated players keep spawning so teammates can use those units.
		const matchPlayer = PlayerManager.getInstance().players.get(owner);
		if (SettingsContext.getInstance().isFFA() && matchPlayer && matchPlayer.status.isEliminated()) return;

		const spawnCount: number = this.spawnMap.get(owner).size;

		if (spawnCount >= this.maxSpawnsPerPlayerWithMultiplier) return;

		const amount: number = computeSpawnAmount(spawnCount, this.maxSpawnsPerPlayerWithMultiplier, this.spawnsPerStepWithMultiplier);

		const ownerMatchPlayer = GlobalGameData.matchPlayers.find((x) => x.getPlayer() === owner);
		const rallyLoc: location = GetUnitRallyPoint(this.unit);

		for (let i = 0; i < amount; i++) {
			const owningSlot = SharedSlotManager.getInstance().getSlotWithLowestUnitCount(owner);
			let u: unit = CreateUnit(owningSlot, this.spawnType, GetUnitX(this.unit), GetUnitY(this.unit), 270);
			if (DEBUG_PRINTS.master)
				debugPrint(`[SharedSlots] Spawned unit for player ${GetPlayerId(owner)} on slot ${GetPlayerId(owningSlot)}`, DC.sharedSlots);
			SharedSlotManager.getInstance().incrementUnitCount(owningSlot);
			UnitLagManager.getInstance().trackUnit(u);

			if (!IsUnitType(u, UNIT_TYPE.TRANSPORT)) {
				ownerMatchPlayer?.trackedData.units.add(u);
			}

			UnitAddType(u, UNIT_TYPE.SPAWN);
			// Register for minimap tracking if valid (must be done after adding SPAWN type)
			MinimapIconManager.getInstance().registerIfValid(u);

			AllyColorFilterManager.getInstance().applyColorFilter(u);
			BlzSetUnitName(u, `${GetUnitName(u)} (${this.country})`);
			this.spawnMap.get(owner).add(u);
			SPAWNER_UNITS.set(u, this);

			if (rallyLoc !== undefined) {
				IssuePointOrderLoc(u, 'attack', rallyLoc);
			}

			u = undefined;
		}

		if (rallyLoc !== undefined) RemoveLocation(rallyLoc);

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
		this._unit = undefined;

		this.rebuild(x, y);
		this.setName();
	}

	/**
	 * Sets the owner of the spawner.
	 * @param {player} player - The player to set as owner.
	 */
	public setOwner(player: player): void {
		if (player === undefined) player = NEUTRAL_HOSTILE;

		this.refreshMinimapCamouflage();
		SetUnitOwner(this._unit, SharedSlotManager.getInstance().getOwner(player), true);
		this.refreshMinimapCamouflage();

		if (!this.spawnMap.has(this.getOwner())) {
			this.spawnMap.set(this.getOwner(), new Set());
		}

		this.setName();
		IssuePointOrder(this._unit, 'setrally', GetUnitX(this._unit), GetUnitY(this._unit));
	}

	/** @returns The player that owns the spawner. */
	public getOwner(): player {
		return SharedSlotManager.getInstance().getOwnerOfUnit(this._unit);
	}

	/**
	 * Primes the campfire like city buildings so a fogged ownership change does
	 * not leave a visible native minimap ghost.
	 */
	public HideMinimap(): void {
		BlzSetUnitBooleanField(this._unit, UNIT_BF_HIDE_MINIMAP_DISPLAY, true);
		BlzSetUnitBooleanField(this._unit, UNIT_BF_USE_EXTENDED_LINE_OF_SIGHT, false);
		SetUnitOwner(this._unit, NEUTRAL_HOSTILE, true);
		SetUnitVertexColor(this._unit, 0, 0, 0, 255);
		BlzSetUnitBooleanField(this._unit, UNIT_BF_USE_EXTENDED_LINE_OF_SIGHT, true);
	}

	public refreshMinimapCamouflage(): void {
		BlzSetUnitBooleanField(this._unit, UNIT_BF_HIDE_MINIMAP_DISPLAY, true);

		if (IsUnitVisible(this._unit, GetLocalPlayer())) {
			SetUnitVertexColor(this._unit, 255, 255, 255, 255);
			return;
		}

		SetUnitVertexColor(this._unit, 0, 0, 0, 255);
	}

	/**
	 * Handles the death of a unit associated with the spawner.
	 * @param {player} player - The player owning the deceased unit.
	 * @param {unit} unit - The deceased unit.
	 */
	public onDeath(player: player, unit: unit): void {
		this.spawnMap.get(SharedSlotManager.getInstance().getOwner(player))?.delete(unit);

		SPAWNER_UNITS.delete(unit);

		this.setName();
	}

	/**
	 * Sets the name of the spawner based on its current state.
	 */
	private setName(): void {
		if (GetOwningPlayer(this.unit) === NEUTRAL_HOSTILE) {
			BlzSetUnitName(this.unit, `${this.country} is unowned`);
			SetUnitAnimation(this.unit, 'death');
		} else {
			const spawnCount: number = this.spawnMap.get(this.getOwner()).size;

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
		this.HideMinimap();
	}
}
