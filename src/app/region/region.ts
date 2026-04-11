import { Country } from '../country/country';
import { Resetable } from '../interfaces/resetable';
import { NEUTRAL_HOSTILE } from '../utils/utils';

export class Region implements Resetable {
	private _countries: Country[];
	private _goldBonus: number;
	private _owner: player;

	constructor(countryData: Country[], goldBonus: number) {
		this._countries = [];

		countryData.forEach((country) => {
			this.countries.push(country);
		});

		this._goldBonus = goldBonus;
		this._owner = NEUTRAL_HOSTILE;
	}

	public reset(): void {
		this._owner = NEUTRAL_HOSTILE;
	}

	public setOwner(owner: player) {
		this._owner = owner;
	}

	public isOwnedByPlayer(player: player) {
		for (const country of this._countries) {
			if (country.getOwner() !== player) return false;
		}

		return true;
	}

	public get countries(): Country[] {
		return this._countries;
	}

	public get goldBonus(): number {
		return this._goldBonus;
	}

	public get owner(): player {
		return this._owner;
	}
}
