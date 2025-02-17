import { Resetable } from 'src/app/interfaces/resettable';
import { Country } from '../country';
import { ICountryData } from './country-data.interface';
import { CityBuilder } from 'src/app/city/builder/city-builder';
import { SpawnerBuilder } from 'src/app/spawner/builder/spawner-builder';

export interface ICountryBuilder extends Resetable {
	setData(data: ICountryData, cityBuilder: CityBuilder, spawnBuilder: SpawnerBuilder): void;
	build(): Country;
}
