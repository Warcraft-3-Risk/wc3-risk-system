import { ISpawnerSettings } from './spawner-settings.interface';

export interface ISpawnerData extends ISpawnerSettings {
	countryName: string;
	spawnsPerStep: number;
	spawnsPerPlayer: number;
}
