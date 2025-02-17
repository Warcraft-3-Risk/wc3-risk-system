import { CityBuilder } from '../../city/builder/city-builder';
import { City } from '../../city/city';
import { Spawner } from '../../spawner/spawner';
import { ICountryBuilder } from './country-builder.interface';
import { ICountryData } from './country-data.interface';
import { Country } from '../country';
import { StringToCountry, CityToCountry } from '../country-map';
import { SpawnerBuilder } from 'src/app/spawner/builder/spawner-builder';
import { ISpawnerData } from 'src/app/spawner/builder/spawner-data.interface';
import { DefaultSpawnType, SpawnLimitMultiplier } from 'src/configs/country-settings';

export class CountryBuilder implements ICountryBuilder {
	private name: string;
	private cities: City[] = [];
	private spawn: Spawner;

	public setData(data: ICountryData, cityBuilder: CityBuilder, spawnBuilder: SpawnerBuilder) {
		this.name = data.name;

		data.cities.forEach((cityData) => {
			cityBuilder.setData(cityData);

			const city = cityBuilder.build();

			this.cities.push(city);
			cityBuilder.reset();
		});

		const spawnsPerStep = Math.floor((this.cities.length + 1) / 2);
		const spawnerData: ISpawnerData = {
			spawnsPerStep: spawnsPerStep,
			spawnsPerPlayer: spawnsPerStep * SpawnLimitMultiplier,
			x: data.spawnerSettings.x,
			y: data.spawnerSettings.y,
			countryName: this.name,
			spawnTypeID: data.spawnerSettings.spawnTypeID || DefaultSpawnType,
		};

		spawnBuilder.setData(spawnerData);
		this.spawn = spawnBuilder.build();
		spawnBuilder.reset();
	}

	public build(): Country {
		try {
			if (!this.name || this.cities.length === 0 || !this.spawn) {
				throw new Error("Country builder is missing required components.'");
			}

			const country = new Country(this.name, this.cities, this.spawn);

			StringToCountry.set(this.name, country);

			this.cities.forEach((city) => {
				CityToCountry.set(city, country);
			});

			return country;
		} catch (error) {
			print(error);
		}
	}

	public reset(): void {
		this.name = null;
		this.cities = [];
		this.spawn = null;
	}
}
