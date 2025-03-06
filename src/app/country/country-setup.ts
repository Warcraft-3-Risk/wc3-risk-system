import { SetCountries } from 'src/configs/city-country-setup';
import { CityBehaviorRegistry } from '../city/behaviors/city.behavior-registry';
import { LandCityBehavior } from '../city/behaviors/land-city-behavior';
import { PortCityBehavior } from '../city/behaviors/port-city-behavior';
import { CityBuilder } from '../city/builder/city-builder';
import { CityType } from '../city/city-type';
import { SpawnerBuilder } from '../spawner/builder/spawner-builder';
import { CountryBuilder } from './builder/country-builder';
import { ICountryData } from './builder/country-data.interface';

export function CountrySetup() {
	CityBehaviorRegistry.registerBehavior(CityType.Land, new LandCityBehavior());
	CityBehaviorRegistry.registerBehavior(CityType.Port, new PortCityBehavior());

	const countryData: ICountryData[] = SetCountries();
	const contryBuilder = new CountryBuilder();
	const cityBuilder = new CityBuilder();
	const spawnBuilder = new SpawnerBuilder();

	for (const country of countryData) {
		contryBuilder.setData(country, cityBuilder, spawnBuilder);
		contryBuilder.build();
		contryBuilder.reset();
	}
}
