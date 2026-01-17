/**
 * Simplified rating calculation logic for multi-player ELO system
 *
 * Formula: ratingChange = basePlacementPoints × lobbySizeMultiplier × opponentStrengthModifier
 *
 * 1. Base Placement Points: Lookup table based on final rank (1st gets most, last loses most)
 * 2. Lobby Size Multiplier: More players = harder to win = more points (normalized to 18 players)
 * 3. Opponent Strength Modifier: Adjusts based on your rating vs average opponent rating
 *    - Beat weaker players = gain less points
 *    - Beat stronger players = gain more points
 *    - Lose to weaker players = lose more points
 *    - Lose to stronger players = lose less points
 */

import {
	RANKED_PLACEMENT_POINTS,
	RANKED_LOBBY_SIZE_BASELINE,
	RANKED_OPPONENT_STRENGTH_FACTOR,
} from 'src/configs/game-settings';

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
	if (placement >= 0 && placement < RANKED_PLACEMENT_POINTS.length) {
		return RANKED_PLACEMENT_POINTS[placement];
	}

	// For placements beyond the table, award minimum points
	return RANKED_PLACEMENT_POINTS[RANKED_PLACEMENT_POINTS.length - 1];
}

/**
 * Calculate lobby size multiplier based on number of players
 * Larger lobbies are harder to win, so they give more points
 * Normalized around RANKED_LOBBY_SIZE_BASELINE (default 18 players)
 *
 * @param playerCount Number of players in the game
 * @returns Multiplier to apply (e.g., 22/18 = 1.22x for 22 players)
 */
export function calculateLobbySizeMultiplier(playerCount: number): number {
	if (playerCount <= 0) {
		return 1.0;
	}

	return playerCount / RANKED_LOBBY_SIZE_BASELINE;
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
 * @returns Multiplier to apply (range: 0.75x to 1.25x with default factor of 0.25)
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
 * Calculate total rating change for a player using simplified multi-player system
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
	const basePlacementPoints = calculatePlacementPoints(placement);

	// Calculate lobby size multiplier
	const lobbySizeMultiplier = calculateLobbySizeMultiplier(playerCount);

	// Determine if this is a gain or loss based on base points
	const isGain = basePlacementPoints >= 0;

	// Calculate opponent strength modifier
	const opponentStrengthModifier = calculateOpponentStrengthModifier(playerRating, opponentRatings, isGain);

	// Apply all multipliers
	const totalChange = Math.floor(basePlacementPoints * lobbySizeMultiplier * opponentStrengthModifier);

	return totalChange;
}
