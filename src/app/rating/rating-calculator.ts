/**
 * Zero-sum rating calculation logic for multi-player ELO system
 *
 * Formula: ratingChange = basePlacementPoints × opponentStrengthModifier
 *
 * 1. Base Placement Points: Dynamically calculated based on percentile position
 *    - Zero-sum system: total gains = total losses (before floor adjustment)
 *    - Top 50% gain points, bottom 50% lose points
 *    - Symmetric curves for gains and losses
 * 2. Opponent Strength Modifier: Adjusts based on your rating vs average opponent rating
 *    - Beat weaker players = gain less points
 *    - Beat stronger players = gain more points
 *    - Lose to weaker players = lose more points
 *    - Lose to stronger players = lose less points
 * 3. Floor Protection: Players cannot drop below RANKED_STARTING_RATING (1000)
 *    - This creates small inflation only when floor-protected players would lose points
 */

import { RANKED_OPPONENT_STRENGTH_FACTOR } from 'src/configs/game-settings';

// Target net points per game: 0 = zero-sum (total gains = total losses)
// Small inflation only occurs when floor-protected players (at 1000) would lose points
const TARGET_INFLATION_PER_GAME = 0;

// Maximum points for 1st place and last place (before normalization)
// Symmetric values ensure fair zero-sum distribution
const MAX_WIN_POINTS = 40;
const MAX_LOSS_POINTS = 40;

// Breakeven percentile: top 50% gain, bottom 50% lose
// Standard zero-sum split for competitive fairness
const BREAKEVEN_PERCENTILE = 0.50;

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
 * Calculate raw placement points (before zero-sum normalization)
 * Uses a curved distribution based on percentile position
 */
function calculateRawPoints(placement: number, playerCount: number): number {
	if (playerCount <= 1) {
		return 0;
	}

	// Calculate percentile position (0 = 1st place, 1 = last place)
	const percentile = placement / (playerCount - 1);

	// Calculate breakeven position
	const breakevenPos = Math.floor(playerCount * BREAKEVEN_PERCENTILE);

	if (placement < breakevenPos) {
		// Gaining zone: curved distribution from MAX_WIN_POINTS to ~0
		const posRatio = placement / breakevenPos;
		// Use power curve for more reward at top positions
		return MAX_WIN_POINTS * (1 - posRatio * posRatio);
	} else if (placement === breakevenPos) {
		// Breakeven position
		return 0;
	} else {
		// Losing zone: curved distribution from ~0 to -MAX_LOSS_POINTS
		const lossZoneSize = playerCount - breakevenPos - 1;
		if (lossZoneSize <= 0) {
			return -MAX_LOSS_POINTS;
		}
		const posInLossZone = placement - breakevenPos - 1;
		const posRatio = (posInLossZone + 1) / lossZoneSize;
		// Use power curve for more penalty at bottom positions
		return -MAX_LOSS_POINTS * posRatio * posRatio;
	}
}

/**
 * Calculate the sum of raw points for all positions in a game
 * Used to determine the zero-sum normalization adjustment
 */
function calculateRawPointsSum(playerCount: number): number {
	let sum = 0;
	for (let i = 0; i < playerCount; i++) {
		sum += calculateRawPoints(i, playerCount);
	}
	return sum;
}

/**
 * Calculate placement points based on rank position and player count
 * Normalized to ensure zero-sum across all lobby sizes (16-23 players)
 * Total gains = total losses (before floor protection is applied)
 *
 * @param placement Final rank (0-based index: 0 = 1st, 1 = 2nd, etc.)
 * @param playerCount Total number of players in the game
 * @returns Points earned from placement (positive for top 50%, negative for bottom 50%)
 */
export function calculatePlacementPoints(placement: number, playerCount: number): number {
	if (playerCount <= 1) {
		return 0;
	}

	// Get raw points based on curve
	const rawPoints = calculateRawPoints(placement, playerCount);

	// Calculate current raw sum
	const rawSum = calculateRawPointsSum(playerCount);

	// Calculate adjustment needed to achieve zero-sum (TARGET = 0)
	const adjustment = (TARGET_INFLATION_PER_GAME - rawSum) / playerCount;

	// Return adjusted points (floored)
	return Math.floor(rawPoints + adjustment);
}

/**
 * Calculate opponent strength modifier based on player rating vs average opponent rating
 * This implements traditional ELO logic:
 * - Beat stronger players = gain more points
 * - Beat weaker players = gain less points
 * - Lose to stronger players = lose less points
 * - Lose to weaker players = lose more points
 *
 * @param playerRating Player's current rating
 * @param opponentRatings Array of all opponent ratings
 * @param isGain True if calculating for a positive outcome (gain), false for loss
 * @returns Multiplier to apply (range: 0.68x to 1.32x with factor of 0.32)
 */
export function calculateOpponentStrengthModifier(
	playerRating: number,
	opponentRatings: number[],
	isGain: boolean
): number {
	if (opponentRatings.length === 0) {
		return 1.0;
	}

	// Calculate average opponent rating
	let totalOpponentRating = 0;
	for (let i = 0; i < opponentRatings.length; i++) {
		totalOpponentRating += opponentRatings[i];
	}
	const avgOpponentRating = totalOpponentRating / opponentRatings.length;

	// Calculate rating difference (positive if player is higher rated)
	const ratingDiff = playerRating - avgOpponentRating;

	// Scale the difference: 400 points = full effect
	// Clamp to [-1, +1] range before applying factor
	const scaledDiff = Math.max(-1, Math.min(1, ratingDiff / 400)) * RANKED_OPPONENT_STRENGTH_FACTOR;

	// Apply modifier based on whether this is a gain or loss
	// For gains: higher rated = less gain (1.0 - scaledDiff)
	// For losses: higher rated = more loss (1.0 + scaledDiff)
	if (isGain) {
		return 1.0 - scaledDiff;
	} else {
		return 1.0 + scaledDiff;
	}
}

/**
 * Calculate total rating change for a player
 *
 * Formula: ratingChange = basePlacementPoints × opponentStrengthModifier
 *
 * @param placement Final rank (0-based index: 0 = 1st, 1 = 2nd, etc.)
 * @param playerRating Player's current rating
 * @param opponentRatings Array of all opponent ratings
 * @param playerCount Total number of players in the game
 * @returns Total rating change to apply
 */
export function calculateRatingChange(
	placement: number,
	playerRating: number,
	opponentRatings: number[],
	playerCount: number
): number {
	const basePlacementPoints = calculatePlacementPoints(placement, playerCount);

	// Determine if this is a gain or loss based on base points
	const isGain = basePlacementPoints >= 0;

	// Calculate opponent strength modifier
	const opponentStrengthModifier = calculateOpponentStrengthModifier(playerRating, opponentRatings, isGain);

	// Apply multiplier (no lobby size multiplier - handled by dynamic placement points)
	const totalChange = Math.floor(basePlacementPoints * opponentStrengthModifier);

	return totalChange;
}
