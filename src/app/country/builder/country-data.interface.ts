import { ICityData } from 'src/app/city/builder/city-data.interface';
import { ISpawnerSettings } from 'src/app/spawner/builder/spawner-settings.interface';

export interface ICountryData {
	name: string;
	spawnerSettings: ISpawnerSettings;
	cities: ICityData[];
	guardType?: number;
}
