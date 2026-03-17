import { AdjacencyGraph } from './adjacency-graph';
import { City } from '../city/city';
import { CityToCountry } from '../country/country-map';
import { debugPrint } from '../utils/debug-print';
import { DC } from 'src/configs/game-settings';

export class BotTerritoryTracker {
	private mainland: Set<string> = new Set();
	private landmasses: Set<string>[] = [];
	private borderCountries: Set<string> = new Set();
	private interiorCountries: Set<string> = new Set();
	private ownedCountryNames: Set<string> = new Set();

	/**
	 * Recompute territory info from the bot's current owned cities.
	 * Call at the start of each think cycle.
	 */
	public update(ownedCities: City[], adjacencyGraph: AdjacencyGraph, slotId: number): void {
		// Map owned cities to unique country names
		this.ownedCountryNames = new Set<string>();
		for (const city of ownedCities) {
			const country = CityToCountry.get(city);
			if (country) {
				this.ownedCountryNames.add(country.getName());
			}
		}

		this.computeLandmasses(adjacencyGraph);
		this.computeBorderAndInterior(adjacencyGraph);

		debugPrint(`[Territory] Slot ${slotId}: ${this.landmasses.length} landmasses, mainland=${this.mainland.size} countries`, DC.bot);
		debugPrint(`[Territory] Slot ${slotId}: borders=${this.borderCountries.size}, interior=${this.interiorCountries.size}`, DC.bot);
	}

	private computeLandmasses(adjacencyGraph: AdjacencyGraph): void {
		this.landmasses = [];
		this.mainland = new Set();

		if (!adjacencyGraph.hasData()) {
			// Graceful degradation: treat all owned countries as one single landmass
			this.landmasses = [new Set(this.ownedCountryNames)];
			this.mainland = new Set(this.ownedCountryNames);
			return;
		}

		// BFS to find connected components through owned territory
		const visited = new Set<string>();

		for (const countryName of this.ownedCountryNames) {
			if (visited.has(countryName)) continue;

			const component = new Set<string>();
			const queue: string[] = [countryName];
			visited.add(countryName);

			while (queue.length > 0) {
				const current = queue.shift()!;
				component.add(current);

				for (const neighbor of adjacencyGraph.getNeighbors(current)) {
					if (this.ownedCountryNames.has(neighbor) && !visited.has(neighbor)) {
						visited.add(neighbor);
						queue.push(neighbor);
					}
				}
			}

			this.landmasses.push(component);
		}

		// Mainland = largest connected group
		for (const lm of this.landmasses) {
			if (lm.size > this.mainland.size) {
				this.mainland = lm;
			}
		}
	}

	private computeBorderAndInterior(adjacencyGraph: AdjacencyGraph): void {
		this.borderCountries = new Set();
		this.interiorCountries = new Set();

		for (const countryName of this.ownedCountryNames) {
			const neighbors = adjacencyGraph.getNeighbors(countryName);

			if (!adjacencyGraph.hasData() || neighbors.length === 0) {
				// No adjacency data or isolated (island) country → treat as border
				this.borderCountries.add(countryName);
			} else {
				const isBorder = neighbors.some((n) => !this.ownedCountryNames.has(n));
				if (isBorder) {
					this.borderCountries.add(countryName);
				} else {
					this.interiorCountries.add(countryName);
				}
			}
		}
	}

	public getMainland(): Set<string> {
		return this.mainland;
	}

	public getLandmasses(): Set<string>[] {
		return this.landmasses;
	}

	public isLandReachable(from: string, to: string): boolean {
		for (const lm of this.landmasses) {
			if (lm.has(from) && lm.has(to)) return true;
		}
		return false;
	}

	public getBorderCountries(): Set<string> {
		return this.borderCountries;
	}

	public getInteriorCountries(): Set<string> {
		return this.interiorCountries;
	}

	public getOwnedCountryNames(): Set<string> {
		return this.ownedCountryNames;
	}
}
