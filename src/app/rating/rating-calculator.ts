/**
 * Pure rating calculation logic for multi-player ELO system
 */

import { RANKED_OVERPERFORMANCE_BONUS, RANKED_UNDERPERFORMANCE_PENALTY, RANKED_PLACEMENT_POINTS } from 'src/configs/game-settings';

/**
 * Get the military rank icon path based on player's rating
 * @param rating Player's current rating
 * @returns Path to the rank icon BLP file
 *
 * Rank Tiers:
 * - General (2500+): Supreme commander
 * - Colonel (2100-2499): Senior officer
 * - Captain (1800-2099): Company commander
 * - Lieutenant (1500-1799): Junior officer
 * - Sergeant (1200-1499): Experienced NCO
 * - Private (< 1200): Basic soldier
 */
export function getRankIcon(rating: number): string {
	if (rating >= 2500) {
		return 'Assets\\Ranks\\general.blp';
	} else if (rating >= 2100) {
		return 'Assets\\Ranks\\colonel.blp';
	} else if (rating >= 1800) {
		return 'Assets\\Ranks\\captain.blp';
	} else if (rating >= 1500) {
		return 'Assets\\Ranks\\lieutenant.blp';
	} else if (rating >= 1200) {
		return 'Assets\\Ranks\\sergeant.blp';
	} else {
		return 'Assets\\Ranks\\private.blp';
	}
}

/**
 * Calculate placement points based on rank position
 * @param placement Final rank (0-based index: 0 = 1st, 1 = 2nd, etc.)
 * @returns Points earned from placement
 */
export function calculatePlacementPoints(placement: number): number {
	// Use lookup table from config
	if (placement >= 0 && placement < RANKED_PLACEMENT_POINTS.length) {
		return RANKED_PLACEMENT_POINTS[placement];
	}

	// For placements beyond the table, award minimum points
	return RANKED_PLACEMENT_POINTS[RANKED_PLACEMENT_POINTS.length - 1];
}

/**
 * Calculate expected placement using ELO win probabilities
 * Uses the ELO formula to calculate the probability of beating each opponent,
 * then sums those probabilities to get expected placement.
 *
 * Example: If you have a 70% chance to beat 10 opponents, you're expected to beat 7 of them,
 * placing you in 4th place (3 opponents expected to beat you).
 *
 * @param playerRating Player's current rating
 * @param opponentRatings Array of all opponent ratings
 * @returns Expected placement (0-based: 0 = expected 1st, 1 = expected 2nd, etc.)
 */
export function calculateExpectedPlacement(playerRating: number, opponentRatings: number[]): number {
	if (opponentRatings.length === 0) {
		return 0;
	}

	// Calculate how many opponents we expect to beat
	let expectedBeats = 0;
	for (let i = 0; i < opponentRatings.length; i++) {
		const opponentRating = opponentRatings[i];
		const ratingDiff = opponentRating - playerRating;

		// ELO win probability formula: 1 / (1 + 10^(ratingDiff / 400))
		const winProbability = 1.0 / (1.0 + Math.pow(10, ratingDiff / 400));
		expectedBeats += winProbability;
	}

	// Expected placement = number of opponents - expected beats
	// If we expect to beat 7 out of 10 opponents, we expect 3 to beat us, so we're 4th (index 3)
	const expectedPlacement = opponentRatings.length - expectedBeats;

	return Math.round(expectedPlacement);
}

/**
 * Calculate performance multiplier based on actual vs expected placement
 * @param actualPlacement Actual placement (0-based: 0 = 1st, 1 = 2nd, etc.)
 * @param expectedPlacement Expected placement based on ratings
 * @returns Multiplier to apply to base points (0.5 to 2.0)
 */
export function calculatePerformanceMultiplier(actualPlacement: number, expectedPlacement: number): number {
	const placementDifference = expectedPlacement - actualPlacement;

	// Overperformed (placed better than expected)
	if (placementDifference > 0) {
		const multiplier = 1.0 + placementDifference * RANKED_OVERPERFORMANCE_BONUS;
		// Cap at 2.0x for extreme overperformance
		return Math.min(multiplier, 2.0);
	}

	// Underperformed (placed worse than expected)
	if (placementDifference < 0) {
		const multiplier = 1.0 + placementDifference * RANKED_UNDERPERFORMANCE_PENALTY;
		// Floor at 0.5x for extreme underperformance
		return Math.max(multiplier, 0.5);
	}

	// Performed as expected
	return 1.0;
}

/**
 * Calculate rating advantage multiplier based on player rating vs average opponent rating
 * Uses ELO-style expected win probability to dampen gains when playing against much weaker opponents
 * and boost gains when playing against much stronger opponents
 * @param playerRating Player's current rating
 * @param opponentRatings Array of all opponent ratings
 * @returns Multiplier to apply based on rating difference (0.05 to 2.0)
 */
export function calculateRatingAdvantageMultiplier(playerRating: number, opponentRatings: number[]): number {
	if (opponentRatings.length === 0) {
		return 1.0;
	}

	// Calculate average opponent rating
	let totalOpponentRating = 0;
	for (let i = 0; i < opponentRatings.length; i++) {
		totalOpponentRating += opponentRatings[i];
	}
	const avgOpponentRating = totalOpponentRating / opponentRatings.length;

	// Calculate rating difference (opponent - player, for ELO formula)
	const ratingDiff = avgOpponentRating - playerRating;

	// Calculate expected win probability using ELO formula
	// expectedWinProb = 1 / (1 + 10^(ratingDiff / 400))
	// If player is much stronger: expectedWinProb ≈ 1.0 (almost certain to win)
	// If evenly matched: expectedWinProb = 0.5
	// If player is much weaker: expectedWinProb ≈ 0.0 (almost certain to lose)
	const expectedWinProb = 1.0 / (1.0 + Math.pow(10, ratingDiff / 400));

	// Convert expected win probability to multiplier
	// expectedWinProb 0.95 (heavily favored) -> multiplier 0.1 (only 10% of points)
	// expectedWinProb 0.50 (evenly matched) -> multiplier 1.0 (100% of points)
	// expectedWinProb 0.05 (heavy underdog) -> multiplier 1.9 (190% of points)
	const multiplier = 2.0 - expectedWinProb * 2.0;

	// Apply floor to ensure some points can still be gained/lost even in extreme cases
	// Minimum 5% of normal points to prevent complete stagnation
	return Math.max(0.05, multiplier);
}

/**
 * Calculate total rating change for a player using multi-player ELO system
 * @param placement Final rank (0-based index: 0 = 1st, 1 = 2nd, etc.)
 * @param playerRating Player's current rating
 * @param opponentRatings Array of all opponent ratings
 * @returns Total rating change to apply
 */
export function calculateRatingChange(placement: number, playerRating: number, opponentRatings: number[]): number {
	const basePlacementPoints = calculatePlacementPoints(placement);

	// Calculate performance multiplier based on expected vs actual placement
	const expectedPlacement = calculateExpectedPlacement(playerRating, opponentRatings);
	const performanceMultiplier = calculatePerformanceMultiplier(placement, expectedPlacement);

	// Calculate rating advantage multiplier to prevent unlimited rating growth
	// A 2500 player vs 1200 opponents will get only ~5% of normal points
	const ratingAdvantageMultiplier = calculateRatingAdvantageMultiplier(playerRating, opponentRatings);

	// Combine both multipliers - this ensures strong players get minimal points vs weak opponents
	const combinedMultiplier = performanceMultiplier * ratingAdvantageMultiplier;

	// Apply combined multiplier to placement points
	const adjustedPlacementPoints = Math.floor(basePlacementPoints * combinedMultiplier);

	return adjustedPlacementPoints;
}
