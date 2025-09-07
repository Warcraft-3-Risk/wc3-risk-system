import { City } from 'src/app/city/city';
import { Country } from 'src/app/country/country';
import { CityToCountry } from 'src/app/country/country-map';
import { PlayerManager } from 'src/app/player/player-manager';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { GetRandomElementFromArray } from 'src/app/utils/utils';
import { DoublyLinkedList } from 'src/app/utils/doubly-linked-list';
import { CITIES_PER_PLAYER_UPPER_BOUND } from 'src/configs/game-settings';
import { PLAYER_COLOR_CODES_MAP, PLAYER_COLOR_CODES_RGB_MAP } from '../../../utils/player-colors';
import { debugPrint } from '../../../utils/debug-print';

/**
 * Handles the distribution of cities among active players.
 */
export class StandardDistributionService {
	private citiesPerPlayerUpperBound: number = CITIES_PER_PLAYER_UPPER_BOUND;
	private maxCitiesPerPlayer: number;
	private cities: City[];
	private players: DoublyLinkedList<ActivePlayer>;

	/**
	 * Initializes city pool and player list.
	 */
	constructor() {
		this.cities = this.buildCityPool();
		this.players = new DoublyLinkedList<ActivePlayer>();

		PlayerManager.getInstance().players.forEach((player) => {
			this.players.addFirst(player);
		});

		this.maxCitiesPerPlayer = Math.min(Math.floor(this.cities.length / this.players.length()), this.citiesPerPlayerUpperBound);
	}

	/**
	 * Executes the distribution algorithm.
	 * @param callback - Function to call after distribution is complete.
	 */
	public runDistro(callback: () => void): void {
		this.distribute();
		callback();
	}

	/**
	 * Implements the distribution algorithm. You may extend this class and override this method for custom behavior for your own game mode.
	 */
	protected distribute() {
		try {
			const neutralCities: City[] = [];
			const numOfCities: number = this.cities.length;

			debugPrint("distribute");
			for (let i = 0; i < numOfCities; i++) {
				const city: City = GetRandomElementFromArray(this.cities);
				const player: ActivePlayer = this.getValidPlayerForCity(city);

				if (player) {
					this.changeCityOwner(city, player);

					if (!this.isPlayerFull(player)) {
						this.players.addLast(player);
					}
				} else {
					neutralCities.push(city);
				}

				if (this.players.length() == 0) break;
			}

			//TODO
			//Here I will check if each player has this.maxCitiesPerPlayer
			//It is safe to assume no player has more at this point
			//I can check the neutral cities to see if a players who need one
			//can take one, and do it if so. repeat the process until they are all full
			//There is some RARE edge cases where the player cannot get any of the neutral cities.
			//I should handle that as well
		} catch (error) {
			print('Error in StandardDistro' + error);
		}
	}

	/**
	 * Builds a pool of cities that are eligible for distribution.
	 * @returns An array of eligible cities.
	 */
	private buildCityPool(): City[] {
		const result: City[] = [];

		CityToCountry.forEach((country, city) => {
			if (country.getCities().length > 1) {
				result.push(city);
			}
		});

		return result;
	}

	/**
	 * Finds a valid player for a given city.
	 * @param city - The city for which a player is needed.
	 * @returns An ActivePlayer object if found, otherwise null.
	 */
	private getValidPlayerForCity(city: City): ActivePlayer | null {
		const maxIterations: number = this.players.length();
		const country: Country = CityToCountry.get(city);

		for (let i = 0; i < maxIterations; i++) {
			const player: ActivePlayer = this.players.removeFirst();

			if (this.isCityValidForPlayer(player, country)) {
				return player;
			} else {
				this.players.addLast(player);
			}
		}

		return null;
	}

	/**
	 * Checks if a city can be validly owned by a player.
	 * @param player - The player in question.
	 * @param country - The country where the city is located.
	 * @returns A boolean indicating if the city is valid for the player.
	 */
	protected isCityValidForPlayer(player: ActivePlayer, country: Country): boolean {
		if (!player.trackedData.countries.has(country)) {
			player.trackedData.countries.set(country, 0);
		}

		return player.trackedData.countries.get(country) < Math.floor(country.getCities().length / 2);
	}

	/**
	 * Checks if a player has reached the maximum number of cities.
	 * @param player - The player in question.
	 * @returns A boolean indicating if the player is full.
	 */
	private isPlayerFull(player: ActivePlayer): boolean {
		return player.trackedData.cities.cities.length >= this.maxCitiesPerPlayer;
	}

	/**
	 * Changes the ownership of a city to a specific player.
	 * @param city - The city for which the ownership is to be changed.
	 * @param player - The new owner of the city.
	 */
	protected changeCityOwner(city: City, player: ActivePlayer) {
		city.setOwner(player.getPlayer());
		SetUnitOwner(city.guard.unit, player.getPlayer(), true);
	}

	protected setCities = (cities: City[]): void => {
		this.cities = cities;
	};

	protected getCities = (): City[] => {
		return this.cities;
	};
}
