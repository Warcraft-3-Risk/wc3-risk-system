import { City } from 'src/app/city/city';
import { Country } from 'src/app/country/country';
import { CityToCountry } from 'src/app/country/country-map';
import { ShuffleArray } from 'src/app/utils/utils';
import { LocalMessage } from 'src/app/utils/messages';
import { StandardDistributionService } from './standard-distribution-service';
import { GlobalGameData } from '../../state/global-game-state';

/**
 * Handles the distribution of cities among active players.
 */
export class CapitalDistributionService extends StandardDistributionService {
	public selectedPlayerCapitalCities: Map<player, City>;

	/**
	 * Initializes city pool and player list.
	 */
	constructor(playerCapitalCities: Map<player, City>) {
		super();
		this.selectedPlayerCapitalCities = playerCapitalCities;
	}

	/**
	 * Implements the distribution algorithm.
	 */
	protected distribute() {
		let playerCapitalCountries = new Map<player, Country>();

		const countries = Array.from(CityToCountry.values());

		const playerCountries = new Set(playerCapitalCountries.values());
		let filteredCountries = Array.from(countries).filter((country) => !playerCountries.has(country));

		ShuffleArray(filteredCountries);

		GlobalGameData.matchPlayers.forEach((activePlayer) => {
			const selectedCapital = this.selectedPlayerCapitalCities.get(activePlayer.getPlayer());
			const player = activePlayer.getPlayer();

			// checks if a player has selected a starting capital
			if (selectedCapital) {
				LocalMessage(player, `Your chosen capital is in ${CityToCountry.get(selectedCapital).getName()}.`, '', 5);
				this.changeCityOwner(selectedCapital, activePlayer);
				this.isCityValidForPlayer(activePlayer, CityToCountry.get(selectedCapital));
			} else {
				// if a player has not selected a starting capital
				while (true) {
					// get the first country that has not been picked yet - ensure this country has more than 1 city
					// shuffle the cities and pick the first one
					const country = filteredCountries.pop();
					let cities = country.getCities();
					if (cities.length <= 1) {
						continue;
					}

					cities = cities.filter((city) => !city.isPort());

					// pop the first element from the remaining country list
					// assign the first city to the player
					ShuffleArray(cities);

					const capital = cities[0];

					this.changeCityOwner(capital, activePlayer);
					this.selectedPlayerCapitalCities.set(player, capital);
					this.isCityValidForPlayer(activePlayer, country);

					// terminate the loop, a country has been found that can be assigned to the player
					LocalMessage(player, `You have been randomly assigned a capital in ${country.getName()}.`, '', 5);
					PanCameraToTimedLocForPlayer(player, capital.barrack.location, 1);

					break;
				}
			}
		});

		const assignedCapitalCities = new Set(this.selectedPlayerCapitalCities.values());
		this.setCities(this.getCities().filter((city) => !assignedCapitalCities.has(city)));
		super.distribute();
	}
}
