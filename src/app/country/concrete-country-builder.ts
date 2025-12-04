import { DefaultSpawnType } from 'src/configs/country-settings';
import { City } from '../city/city';
import { CityBuilder } from '../city/city-builder';
import { CityData } from '../city/city-data';
import { Country } from './country';
import { CountryBuilder } from './country-builder';
import { CityToCountry, StringToCountry } from './country-map';
import { Spawner } from '../spawner/spawner';
import { SpawnerBuilder } from '../spawner/spawner-builder';
import { SpawnerData } from '../spawner/spawner-data';
import { PlayerManager } from '../player/player-manager';
import { File } from 'w3ts';
import { HexColors } from '../utils/hex-colors';

/**
 * ConcreteCountryBuilder is an implementation of the CountryBuilder interface.
 * It allows for the construction of Country objects.
 */
export class ConcreteCountryBuilder implements CountryBuilder {
	private name: string;
	private cities: City[] = [];
	private spawn: Spawner;

	/**
	 * Sets the name for the country being built.
	 * @param name - The name of the country.
	 * @returns The current builder instance.
	 */
	public setName(name: string): CountryBuilder {
		this.name = name;

		return this;
	}

	/**
	 * Adds a city to the country being built.
	 * @param city - The data for constructing the city.
	 * @param builder - The builder for the city.
	 * @param guardData - The data for constructing the guard unit.
	 * @returns The current builder instance.
	 */
	public addCity(city: CityData, builder: CityBuilder, guardData: number): CountryBuilder {
		builder.setBarracks(city.barrack);
		builder.setCOP(city.cop);

		if (city.name) builder.setName(city.name);
		if (!city.guard) city.guard = guardData;

		builder.setGuard(city.guard);
		builder.setCityType(city.cityType);

		const result: City = builder.build();
		this.cities.push(result);

		return this;
	}

	/**
	 * Sets the spawn conditions for the country.
	 * @param spawn - The data for the spawner.
	 * @param builder - The builder for the spawner.
	 * @returns The current builder instance.
	 */
	public setSpawn(spawn: SpawnerData, builder: SpawnerBuilder): CountryBuilder {
		builder.setUnit(spawn.unitData);
		builder.setCountry(this.name);

		if (!spawn.spawnTypeID) {
			builder.setSpawnType(DefaultSpawnType);
		} else {
			builder.setSpawnType(spawn.spawnTypeID);
		}

		if (!spawn.spawnsPerStep) {
			builder.setSpawnsPerStep(Math.floor((this.cities.length + 1) / 2));
		} else {
			builder.setSpawnsPerStep(spawn.spawnsPerStep);
		}

		builder.setMaxSpawnPerPlayer(spawn.spawnsPerPlayer);

		this.spawn = builder.build();

		return this;
	}

	/**
	 * Constructs a new Country object.
	 * @returns The built Country object.
	 * @throws An error if any of the required components are missing.
	 */
	public build(): Country {
		if (!this.name || this.cities.length === 0 || !this.spawn) {
			print('Country builder is missing required components.');
		}

		const country = new Country(this.name, this.cities, this.spawn);

		StringToCountry.set(this.name, country);

		this.cities.forEach((city) => {
			CityToCountry.set(city, country);
		});

		this.reset();
		return country;
	}

	public async createTexts(): Promise<void> {
		// Create text tags for each player
		const countrySet: Set<Country> = new Set(CityToCountry.values());
		PlayerManager.getInstance().playersAndObservers.forEach((player) => {
			if (GetLocalPlayer() == player.getPlayer()) {
				// Create all country labels
				countrySet.forEach((country) => country.createText());

				// Load saved labels preference and apply it
				const labelsPreference = File.read('risk/labels.pld');
				if (labelsPreference === 'false') {
					player.options.labels = false;
					countrySet.forEach((country) => country.setLabelVisibility(false));

					// Update button texture and tooltip to match the hidden state
					const labelButtonBackdrop = BlzGetFrameByName('GuardButtonBackdrop', GetPlayerId(player.getPlayer()) + 200);
					if (labelButtonBackdrop) {
						BlzFrameSetTexture(labelButtonBackdrop, 'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNRecipe.blp', 0, false);
					}

					const labelButtonTooltip = BlzGetFrameByName('GuardButtonToolTip', GetPlayerId(player.getPlayer()) + 200);
					if (labelButtonTooltip) {
						BlzFrameSetText(
							labelButtonTooltip,
							`Country Labels ${HexColors.TANGERINE}(F8)|r\nToggles the visibility of country name labels on the map.\nCurrent preference: ${HexColors.RED}Hidden`
						);
					}
				}
			}
		});
	}

	/**
	 * Resets the builder state to its default values.
	 */
	public reset(): void {
		this.name = null;
		this.cities = [];
		this.spawn = null;
	}
}
