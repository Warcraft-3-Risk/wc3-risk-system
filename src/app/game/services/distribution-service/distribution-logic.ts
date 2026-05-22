/**
 * Pure distribution logic — no WC3 API dependencies.
 * These functions can be unit tested without the game engine.
 */

/**
 * Calculate the maximum number of cities each player should receive.
 * @param totalCities Total number of cities available for distribution
 * @param numPlayers Number of players participating
 * @param upperBound Maximum cities per player cap
 * @returns The max cities per player (at least 0)
 */
export function calculateMaxCitiesPerPlayer(totalCities: number, numPlayers: number, upperBound: number): number {
	if (numPlayers <= 0) return 0;
	return Math.min(Math.floor(totalCities / numPlayers), upperBound);
}

/**
 * Check if assigning a city in a given country to a player is valid.
 * A player can own at most floor(countryCityCount / 2) - 1 cities in a country
 * (i.e., less than 50% of the country's cities).
 * @param playerCountryCount Number of cities the player already owns in this country
 * @param countryCityCount Total number of cities in the country
 * @returns Whether the assignment is valid
 */
export function isCityValidForPlayer(playerCountryCount: number, countryCityCount: number): boolean {
	return playerCountryCount < Math.floor(countryCityCount / 2);
}

/**
 * Filter a list of cities to only include those in countries with more than 1 city.
 * Cities in single-city countries are excluded from distribution.
 * @param citiesWithCountrySize Array of { cityId, countryCityCount } objects
 * @returns Filtered array containing only cities from multi-city countries
 */
export function filterEligibleCities<T extends { countryCityCount: number }>(cities: T[]): T[] {
	return cities.filter((c) => c.countryCityCount > 1);
}

export type QualityTier = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export const QUALITY_TIERS: readonly QualityTier[] = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];
export const TOP_QUALITY_TIERS: readonly QualityTier[] = ['S', 'A', 'B', 'C'];

/**
 * Normalize arbitrary map quality text into a supported quality tier.
 * Unknown values return undefined.
 */
export function normalizeQualityTier(quality?: string): QualityTier | undefined {
	if (!quality) return undefined;
	const normalized = quality.trim().toUpperCase() as QualityTier;
	return QUALITY_TIERS.includes(normalized) ? normalized : undefined;
}

/**
 * Scale a per-tier cap when actual max cities/player is below the baseline.
 * Uses floor for deterministic conservative ceilings.
 */
export function scaleTopTierCap(baseCap: number, maxCitiesPerPlayer: number, baselineCitiesPerPlayer: number): number {
	if (baseCap <= 0 || maxCitiesPerPlayer <= 0 || baselineCitiesPerPlayer <= 0) return 0;
	return Math.min(baseCap, Math.floor((baseCap * maxCitiesPerPlayer) / baselineCitiesPerPlayer));
}

/**
 * Evenly distributes a quantity across buckets with per-bucket caps.
 * The output sum is <= total and each bucket <= cap.
 */
export function distributeEvenlyWithCaps(total: number, caps: number[]): number[] {
	const allocations = caps.map(() => 0);
	let remaining = Math.max(0, total);

	while (remaining > 0) {
		const eligible = allocations
			.map((value, index) => ({ index, value, cap: caps[index] }))
			.filter((x) => x.value < x.cap);
		if (eligible.length === 0) break;

		const minValue = Math.min(...eligible.map((x) => x.value));
		const candidates = eligible.filter((x) => x.value === minValue).sort((a, b) => a.index - b.index);

		for (const candidate of candidates) {
			if (remaining <= 0) break;
			allocations[candidate.index]++;
			remaining--;
		}
	}

	return allocations;
}
