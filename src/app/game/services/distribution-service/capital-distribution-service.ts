import { City } from 'src/app/city/city';
import { StandardDistributionService } from './standard-distribution-service';

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
		const assignedCapitalCities = new Set(this.selectedPlayerCapitalCities.values());
		this.setCities(this.getCities().filter((city) => !assignedCapitalCities.has(city)));
		super.distribute();
	}
}
