import { Country } from '../country/country';
import { Region } from './region';
import { RegionBuilder } from './region-builder';
import { CountryToRegion } from './region-map';

export class ConcreteRegionBuilder implements RegionBuilder {
	private countries: Country[] = [];
	private goldBonus: number = 0;

	public addCountry(country: Country): RegionBuilder {
		this.countries.push(country);
		return this;
	}

	public setGoldBonus(goldBonus: number): RegionBuilder {
		this.goldBonus = goldBonus;

		return this;
	}

	public build(): Region {
		if (this.countries.length === 0) {
			throw new Error('Region must have at least one country.');
		}

		const region = new Region(this.countries, this.goldBonus);

		region.getCountries().forEach((country) => {
			CountryToRegion.set(country, region);
		});

		this.reset();

		return region;
	}

	public reset(): void {
		this.countries = [];
		this.goldBonus = 0;
	}
}
