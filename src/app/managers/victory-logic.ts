/**
 * Pure victory condition logic — no WC3 API dependencies.
 * These functions can be unit tested without the game engine.
 */

export type VictoryProgressState = 'UNDECIDED' | 'TIE' | 'DECIDED';

/**
 * Calculate the city count required for victory.
 * @param totalCities Total number of cities on the map
 * @param winRatio Fraction of cities needed to win (e.g. 0.6)
 * @param overtimeEnabled Whether overtime rules are active
 * @param overtimeModifier Cities subtracted per turn of overtime
 * @param turnsInOvertime Number of turns elapsed since overtime started
 * @returns The city count threshold for victory (minimum 1)
 */
export function calculateCityCountWin(
	totalCities: number,
	winRatio: number,
	overtimeEnabled: boolean,
	overtimeModifier: number,
	turnsInOvertime: number,
): number {
	const baseCities = Math.ceil(totalCities * winRatio);

	if (overtimeEnabled && turnsInOvertime > 0) {
		return Math.max(1, baseCities - overtimeModifier * turnsInOvertime);
	}

	return baseCities;
}

/**
 * Determine the victory state from a list of candidates that meet the win threshold.
 * @param candidateCount Number of non-eliminated participants that meet the city threshold
 * @returns The victory progress state
 */
export function determineVictoryState(candidateCount: number): VictoryProgressState {
	if (candidateCount === 0) {
		return 'UNDECIDED';
	} else if (candidateCount === 1) {
		return 'DECIDED';
	} else {
		return 'TIE';
	}
}

/**
 * Filter and sort participants by city count in descending order.
 * @param participants Array of { id, cityCount, isEliminated } objects
 * @param threshold Minimum city count to include
 * @returns Sorted array of participants meeting the threshold (descending by cityCount)
 */
export function getOwnershipByThresholdDescending<T extends { cityCount: number }>(
	participants: T[],
	threshold: number,
): T[] {
	return participants
		.filter((p) => p.cityCount >= threshold)
		.sort((a, b) => b.cityCount - a.cityCount);
}

/**
 * Determine the victors from a list of participants.
 * @param participants Array of { cityCount, isEliminated } objects
 * @param cityCountWin The city threshold for victory
 * @returns Array of participants who are victors (non-eliminated with max cities above threshold)
 */
export function findVictors<T extends { cityCount: number; isEliminated: boolean }>(
	participants: T[],
	cityCountWin: number,
): T[] {
	const aboveThreshold = getOwnershipByThresholdDescending(participants, cityCountWin).filter((p) => !p.isEliminated);

	if (aboveThreshold.length === 0) {
		return [];
	}

	const maxCities = aboveThreshold[0].cityCount;
	return aboveThreshold.filter((p) => p.cityCount === maxCities);
}
