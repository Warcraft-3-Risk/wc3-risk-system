import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { UNIT_ID } from 'src/configs/unit-id';
import { Spawner } from '../spawner';
import { ISpawnerBuilder } from './spawner-builder.interface';
import { ISpawnerData } from './spawner-data.interface';

export class SpawnerBuilder implements ISpawnerBuilder {
	private x: number;
	private y: number;
	private countryName: string;
	private spawnsPerStep: number;
	private maxSpawnsPerPlayer: number;
	private spawnTypeID: number;

	public setData(spawnerData: ISpawnerData) {
		this.x = spawnerData.x;
		this.y = spawnerData.y;
		this.countryName = spawnerData.countryName;
		this.spawnsPerStep = spawnerData.spawnsPerStep;
		this.maxSpawnsPerPlayer = spawnerData.spawnsPerPlayer;
		this.spawnTypeID = spawnerData.spawnTypeID;
	}

	public build(): Spawner {
		const unit = CreateUnit(NEUTRAL_HOSTILE, UNIT_ID.SPAWNER, this.x, this.y, 270);
		SetUnitPathing(unit, false);

		const spawner = new Spawner(unit, this.countryName, this.spawnsPerStep, this.maxSpawnsPerPlayer, this.spawnTypeID);
		this.reset();

		return spawner;
	}

	public reset(): void {
		this.x = null;
		this.y = null;
		this.spawnsPerStep = null;
		this.maxSpawnsPerPlayer = null;
		this.spawnTypeID = null;
	}
}
