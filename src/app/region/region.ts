import { Country } from '../country/country';
import { Ownable } from '../interfaces/ownable';
import { Resetable } from '../interfaces/resettable';
import { NEUTRAL_HOSTILE } from '../utils/utils';

export class Region implements Resetable, Ownable {
	private countries: Country[];
	private goldBonus: number;
	private owner: player;

	constructor(countryData: Country[], goldBonus: number) {
		this.countries = [];

		countryData.forEach((country) => {
			this.countries.push(country);
		});

		this.goldBonus = goldBonus;
		this.owner = NEUTRAL_HOSTILE;
	}

	public reset(): void {
		this.owner = NEUTRAL_HOSTILE;
	}

	public setOwner(owner: player) {
		this.owner = owner;
	}

	public getOwner(): player {
		return this.owner;
	}

	public isOwnedByPlayer(player: player) {
		for (const country of this.countries) {
			if (country.getOwner() != player) return false;
		}

		return true;
	}

	public getCountries(): Country[] {
		return this.countries;
	}

	public getGoldBonus(): number {
		return this.goldBonus;
	}
}
