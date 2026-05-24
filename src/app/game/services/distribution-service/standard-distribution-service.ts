import { City } from 'src/app/city/city';
import { Country } from 'src/app/country/country';
import { CityToCountry } from 'src/app/country/country-map';
import { PlayerManager } from 'src/app/player/player-manager';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { GetRandomElementFromArray } from 'src/app/utils/utils';
import { DoublyLinkedList } from 'src/app/utils/doubly-linked-list';
import { CITIES_PER_PLAYER_UPPER_BOUND } from 'src/configs/game-settings';
import { SharedSlotManager } from '../shared-slot-manager';
import { debugPrint } from 'src/app/utils/debug-print';
import { DC, DEBUG_PRINTS } from 'src/configs/game-settings';
import { Wait } from 'src/app/utils/wait';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { RegionToCity } from 'src/app/city/city-map';

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

		for (const [_, player] of PlayerManager.getInstance().players) {
			this.players.addFirst(player);
		}

		this.maxCitiesPerPlayer = Math.min(Math.floor(this.cities.length / this.players.length()), this.citiesPerPlayerUpperBound);
	}

	/**
	 * Executes the distribution algorithm.
	 * @param callback - Function to call after distribution is complete.
	 */
	public runDistro(callback: () => void): void {
		this.distribute().then(() => {
			callback();
		});
	}

	/**
	 * Implements the distribution algorithm. You may extend this class and override this method for custom behavior for your own game mode.
	 */
	protected async distribute() {
		try {
			const neutralCities: City[] = [];
			const numOfCities: number = this.cities.length;
			const allocatedCites = new Map<ActivePlayer, City[]>();

			const playersCount = this.players.length();
			for (let i = 0; i < playersCount; i++) {
				const player = this.players.get(i);
				allocatedCites.set(player, []);
			}

			// Pre-calculate what cities are allocated to each player.
			// In standard distribution, we temporarily fake trackedData changes until the assignment block.
			for (let i = 0; i < numOfCities; i++) {
				const city: City = GetRandomElementFromArray(this.cities);

				const player: ActivePlayer = this.getValidPlayerForCity(city);

				if (player) {
					// Add city to player's allocation
					allocatedCites.get(player).push(city);

					// FAKE TrackedData updates so subsequent cities find valid counts during pre-calculation
					const country = CityToCountry.get(city);
					if (!player.trackedData.countries.has(country)) {
						player.trackedData.countries.set(country, 0);
					}
					player.trackedData.countries.set(country, player.trackedData.countries.get(country) + 1);
					player.trackedData.cities.cities.push(city);

					if (!this.isPlayerFull(player)) {
						this.players.addLast(player);
					}
				} else {
					neutralCities.push(city);
				}

				if (this.players.length() === 0) break;
			}

			// Cleanup the fake tracked data before actual assignment
			for (const [player, _cities] of allocatedCites) {
				player.trackedData.cities.cities.length = 0;
				player.trackedData.countries.clear();
			}

			// Now distribute them sequentially
			print('Distributing cities...');
			const tempPlayerList: ActivePlayer[] = [];
			for (const [player, _cities] of allocatedCites) {
				tempPlayerList.push(player);
			}
			// Shuffle players
			for (let i = tempPlayerList.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[tempPlayerList[i], tempPlayerList[j]] = [tempPlayerList[j], tempPlayerList[i]];
			}

			// Build interleaved queue
			const assignmentQueue: { player: ActivePlayer; city: City }[] = [];
			let hasMoreToQueue = true;
			while (hasMoreToQueue) {
				hasMoreToQueue = false;
				for (const player of tempPlayerList) {
					const cityToAssign = allocatedCites.get(player).pop();
					if (cityToAssign) {
						assignmentQueue.push({ player, city: cityToAssign });
						hasMoreToQueue = true;
					}
				}
			}

			// Assign 3 cities every 0.2 seconds
			let currentBatchCount = 0;
			for (let i = 0; i < assignmentQueue.length; i++) {
				const assignment = assignmentQueue[i];
				this.changeCityOwner(assignment.city, assignment.player);

				currentBatchCount++;
				if (currentBatchCount >= 3) {
					currentBatchCount = 0;
					await Wait.forSeconds(0.2);
				}
			}

			// Process any remaining neutral cities that were not distributed to players
			// Batching this operation over multiple ticks to prevent lag spikes from SetUnitPosition and layout updates
			let neutralProcessed = 0;
			for (const [_, city] of RegionToCity) {
				if (SharedSlotManager.getInstance().getOwnerOfUnit(city.guard.unit) === NEUTRAL_HOSTILE) {
					city.guard.reposition();
					IssueImmediateOrder(city.guard.unit, 'stop');
					SetUnitInvulnerable(city.guard.unit, false);

					neutralProcessed++;
					if (neutralProcessed % 10 === 0) {
						await Wait.forSeconds(0.1);
					}
				}
			}
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

		for (const [city, country] of CityToCountry) {
			if (country.getCities().length > 1) {
				result.push(city);
			}
		}

		return result;
	}

	/**
	 * Finds a valid player for a given city.
	 * @param city - The city for which a player is needed.
	 * @returns An ActivePlayer object if found, otherwise undefined.
	 */
	private getValidPlayerForCity(city: City): ActivePlayer | undefined {
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

		return undefined;
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
	 * @param city - The city for which the ownersh	ip is to be changed.
	 * @param player - The new owner of the city.
	 */
	protected changeCityOwner(city: City, player: ActivePlayer) {
		city.setOwner(player.getPlayer());

		city.guard.reposition();
		IssueImmediateOrder(city.guard.unit, 'stop');

		SetUnitOwner(city.guard.unit, player.getPlayer(), true);

		player.trackedData.units.add(city.guard.unit);

		SetUnitInvulnerable(city.guard.unit, false);
		city.refreshColorFilter();

		if (DEBUG_PRINTS.master)
			debugPrint(`[SharedSlots] Guard distributed to player ${GetPlayerId(player.getPlayer())}, incrementing count`, DC.sharedSlots);
		SharedSlotManager.getInstance().incrementUnitCount(player.getPlayer());
	}

	protected setCities = (cities: City[]): void => {
		this.cities = cities;
	};

	protected getCities = (): City[] => {
		return this.cities;
	};
}
