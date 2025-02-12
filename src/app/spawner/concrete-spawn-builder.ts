import { SpawnTurnLimit } from 'src/configs/country-settings';
import { NEUTRAL_HOSTILE } from '../utils/utils';
import { Spawner } from './spawner';
import { SpawnerBuilder } from './spawner-builder';
import { UNIT_ID } from '../../configs/unit-id';
import { Coordinates } from '../interfaces/coordinates';

export class ConcreteSpawnerBuilder implements SpawnerBuilder {
	private unit: unit;
	private country: string;
	private spawnsPerStep: number;
	private maxSpawnsPerPlayer: number;
	private spawnTypeID: number;
	private spawnMultiplier: number = 1;

	/**
	 * Sets the unit or coordinates for the Spawner.
	 * @param {unit | Coordinates} unitData - The unit data or coordinates.
	 * @returns The instance of SpawnerBuilder.
	 */
	public setUnit(unitData: unit | Coordinates): SpawnerBuilder {
		if (typeof unitData === 'object') {
			const data: Coordinates = unitData as Coordinates;
			this.unit = CreateUnit(NEUTRAL_HOSTILE, UNIT_ID.SPAWNER, data.x, data.y, 270);
		} else {
			this.unit = unitData;
		}

		SetUnitPathing(this.unit, false);

		return this;
	}

	/**
	 * Sets the country name for the Spawner.
	 * @param {string} countryName - The name of the country.
	 * @returns The instance of SpawnerBuilder.
	 */
	public setCountry(countryName: string): SpawnerBuilder {
		this.country = countryName;

		return this;
	}

	/**
	 * Sets the spawns per step for the Spawner.
	 * @param {number} spawnsPerStep - The number of spawns per step.
	 * @returns The instance of SpawnerBuilder.
	 */
	public setSpawnsPerStep(spawnsPerStep: number): SpawnerBuilder {
		this.spawnsPerStep = spawnsPerStep;

		return this;
	}

	/**
	 * Sets the maximum number of spawns per player for the Spawner.
	 * @param {number} spawnsPerPlayer - The maximum number of spawns per player. Optional parameter.
	 * @returns The instance of SpawnerBuilder.
	 */
	public setMaxSpawnPerPlayer(spawnsPerPlayer?: number): SpawnerBuilder {
		if (!spawnsPerPlayer) {
			this.maxSpawnsPerPlayer = this.spawnsPerStep * SpawnTurnLimit;
		} else {
			this.maxSpawnsPerPlayer = spawnsPerPlayer;
		}

		return this;
	}

	/**
	 * Sets the spawn type ID for the Spawner.
	 * @param {number} spawnTypeID - The type ID of the spawn.
	 * @returns The instance of SpawnerBuilder.
	 */
	public setSpawnType(spawnTypeID: number): SpawnerBuilder {
		this.spawnTypeID = spawnTypeID;

		return this;
	}

	/**
	 * Builds the Spawner with the set parameters.
	 * @returns The Spawner instance.
	 * @throws If required components are missing.
	 */
	public build(): Spawner {
		if (!this.unit || !this.country || !this.spawnsPerStep || !this.maxSpawnsPerPlayer || !this.spawnTypeID) {
			print('Spawner builder is missing required components.');
		}

		const spawner = new Spawner(
			this.unit,
			this.country,
			this.spawnsPerStep,
			this.maxSpawnsPerPlayer,
			this.spawnTypeID,
			this.spawnMultiplier
		);

		this.reset();

		return spawner;
	}

	/**
	 * Resets the builder's properties to initial state.
	 */
	public reset(): void {
		this.unit = null;
		this.country = null;
		this.spawnsPerStep = null;
		this.maxSpawnsPerPlayer = null;
		this.spawnMultiplier = 1;
	}
}
