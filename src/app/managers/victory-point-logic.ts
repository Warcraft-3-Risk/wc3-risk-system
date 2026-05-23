/**
 * Pure victory point logic — no WC3 API dependencies.
 */

export function shouldAwardVictoryPoint(cityCount: number, threshold: number): boolean {
	return cityCount >= threshold;
}

export function calculateEffectiveCityCount(cityCount: number, victoryPoints: number): number {
	return cityCount + victoryPoints;
}

