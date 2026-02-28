/**
 * Two-Pool Zero-Sum Rating System for multi-player ELO
 *
 * Formula: ratingChange = placementPoints + killPoints
 *
 * PROGRESSION TARGET: ~100 games to reach General (2500) for consistent top 5 player
 *
 * TWO INDEPENDENT ZERO-SUM POOLS:
 *
 * 1. Placement Pool (~70% of total points)
 *    - Zero-sum distribution based on final rank position
 *    - Top 50% gain points, bottom 50% lose points
 *    - Winner bonus: 1st place gets extra points to reward winning
 *    - Opponent strength modifier adjusts based on rating vs opponents
 *    - Expected: +20 for 1st, +10 for 5th, -18 for last (18-player game)
 *
 * 2. Kill Pool (~30% of total points)
 *    - Zero-sum distribution based on kill share (playerKills / totalKills)
 *    - NO CAPS - proportional rewards based on actual contribution
 *    - Players with more kills take points FROM players with fewer kills
 *    - Formula: (killShare - averageShare) × KILL_POOL_MULTIPLIER
 *    - Expected: +8 to +10 for top killer, -3 for 0 kills (18-player game)
 *
 * Why Two Pools?
 * - Both placement and kills matter meaningfully
 * - Someone with 2x the kills actually gets ~2x the kill bonus
 * - Each pool is independently zero-sum, so total is zero-sum
 * - No arbitrary caps that cause different kill counts to get same bonus
 *
 * Floor Protection: Players cannot drop below RANKED_STARTING_RATING (1000)
 * - This creates small inflation only when floor-protected players would lose points
 */

// ============================================
// Placement Pool Constants
// ============================================

// Target net points per game: 0 = zero-sum (total gains = total losses)
const TARGET_INFLATION_PER_GAME = 0;

// Maximum points for 1st place and last place (before normalization)
// Tuned for ~100 games to reach General (2500) for consistent top 5 player
const MAX_WIN_POINTS = 15;
const MAX_LOSS_POINTS = 15;

// Bonus points for 1st place only (rewards winning over just placing high)
const WINNER_BONUS = 8;

// Breakeven percentile: top 50% gain, bottom 50% lose
const BREAKEVEN_PERCENTILE = 0.50;

// Opponent strength modifier scale factor (0.32 gives range 0.68x to 1.32x)
const OPPONENT_STRENGTH_FACTOR = 0.32;

// ============================================
// Kill Pool Constants
// ============================================

// Kill pool multiplier: scales the kill share deviation to points
// Higher values = kills matter more relative to placement
// With multiplier of 55: ~8-10 points for top killer, ~-3 points for 0 kills
const KILL_POOL_MULTIPLIER = 55;

/**
 * Get the rank icon path based on player's rating
 * @param rating Player's current rating
 * @returns Path to the rank icon BLP file
 *
 * Rank Tiers (15 total):
 * - Bronze (1000-1499): 100 points each - Starting tiers
 * - Silver (1500-1999): 100 points each - Intermediate tiers
 * - Gold (2000-2500+): 125 points each - Elite tiers
 *
 * Thresholds:
 * - Gold 5: 2500+
 * - Gold 4: 2375-2499
 * - Gold 3: 2250-2374
 * - Gold 2: 2125-2249
 * - Gold 1: 2000-2124
 * - Silver 5: 1900-1999
 * - Silver 4: 1800-1899
 * - Silver 3: 1700-1799
 * - Silver 2: 1600-1699
 * - Silver 1: 1500-1599
 * - Bronze 5: 1400-1499
 * - Bronze 4: 1300-1399
 * - Bronze 3: 1200-1299
 * - Bronze 2: 1100-1199
 * - Bronze 1: <1100 (starting tier)
 */
export function getRankIcon(rating: number): string {
	// Gold tier (2000+) - 125 points per rank
	if (rating >= 2500) {
		return 'Assets\\Ranks\\gold_5.blp';
	} else if (rating >= 2375) {
		return 'Assets\\Ranks\\gold_4.blp';
	} else if (rating >= 2250) {
		return 'Assets\\Ranks\\gold_3.blp';
	} else if (rating >= 2125) {
		return 'Assets\\Ranks\\gold_2.blp';
	} else if (rating >= 2000) {
		return 'Assets\\Ranks\\gold_1.blp';
	}
	// Silver tier (1500-1999) - 100 points per rank
	else if (rating >= 1900) {
		return 'Assets\\Ranks\\silver_5.blp';
	} else if (rating >= 1800) {
		return 'Assets\\Ranks\\silver_4.blp';
	} else if (rating >= 1700) {
		return 'Assets\\Ranks\\silver_3.blp';
	} else if (rating >= 1600) {
		return 'Assets\\Ranks\\silver_2.blp';
	} else if (rating >= 1500) {
		return 'Assets\\Ranks\\silver_1.blp';
	}
	// Bronze tier (<1500) - 100 points per rank
	else if (rating >= 1400) {
		return 'Assets\\Ranks\\bronze_5.blp';
	} else if (rating >= 1300) {
		return 'Assets\\Ranks\\bronze_4.blp';
	} else if (rating >= 1200) {
		return 'Assets\\Ranks\\bronze_3.blp';
	} else if (rating >= 1100) {
		return 'Assets\\Ranks\\bronze_2.blp';
	} else {
		return 'Assets\\Ranks\\bronze_1.blp';
	}
}

// ============================================
// Placement Pool Calculations
// ============================================

/**
 * Calculate raw placement points (before zero-sum normalization)
 * Uses a curved distribution based on percentile position
 */
function calculateRawPlacementPoints(placement: number, playerCount: number): number {
	if (playerCount <= 1) {
		return 0;
	}

	// Calculate breakeven position
	const breakevenPos = Math.floor(playerCount * BREAKEVEN_PERCENTILE);

	if (placement < breakevenPos) {
		// Gaining zone: curved distribution from MAX_WIN_POINTS to ~0
		const posRatio = placement / breakevenPos;
		// Use power curve for more reward at top positions
		let points = MAX_WIN_POINTS * (1 - posRatio * posRatio);

		// Add winner bonus for 1st place only
		if (placement === 0) {
			points += WINNER_BONUS;
		}

		return points;
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
 * Calculate the sum of raw placement points for all positions
 * Used to determine the zero-sum normalization adjustment
 */
function calculateRawPlacementSum(playerCount: number): number {
	let sum = 0;
	for (let i = 0; i < playerCount; i++) {
		sum += calculateRawPlacementPoints(i, playerCount);
	}
	return sum;
}

/**
 * Calculate placement points based on rank position and player count
 * Normalized to ensure zero-sum across all lobby sizes (16-23 players)
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
	const rawPoints = calculateRawPlacementPoints(placement, playerCount);

	// Calculate current raw sum
	const rawSum = calculateRawPlacementSum(playerCount);

	// Calculate adjustment needed to achieve zero-sum (TARGET = 0)
	const adjustment = (TARGET_INFLATION_PER_GAME - rawSum) / playerCount;

	// Return adjusted points (rounded for better zero-sum accuracy)
	return Math.round(rawPoints + adjustment);
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
	const scaledDiff = Math.max(-1, Math.min(1, ratingDiff / 400)) * OPPONENT_STRENGTH_FACTOR;

	// Apply modifier based on whether this is a gain or loss
	// For gains: higher rated = less gain (1.0 - scaledDiff)
	// For losses: higher rated = more loss (1.0 + scaledDiff)
	if (isGain) {
		return 1.0 - scaledDiff;
	} else {
		return 1.0 + scaledDiff;
	}
}

// ============================================
// Kill Pool Calculations
// ============================================

/**
 * Calculate kill pool points based on player's share of total kills
 *
 * This is the second zero-sum pool that rewards active players proportionally.
 * Unlike the old capped system, this has NO CAPS - your points scale with your
 * actual contribution to the game's total kills.
 *
 * Formula: killPoints = (killShare - averageShare) × KILL_POOL_MULTIPLIER
 *
 * This is inherently zero-sum because:
 * - Sum of all killShares = 1.0
 * - Sum of all averageShares = playerCount × (1/playerCount) = 1.0
 * - Sum of all deviations = 0
 * - Sum of all killPoints = 0
 *
 * @param playerKillValue Player's kill value for this game
 * @param allKillValues Array of all players' kill values in the game
 * @returns Points from kill pool (positive for above-average, negative for below-average)
 *
 * Examples (18-player game with 21347 total kills, multiplier=55):
 * - 4664 kills (21.9% share): (0.219 - 0.056) × 55 = +9 points
 * - 2381 kills (11.2% share): (0.112 - 0.056) × 55 = +3 points
 * - 0 kills (0% share): (0.000 - 0.056) × 55 = -3 points
 */
export function calculateKillPoolPoints(playerKillValue: number, allKillValues: number[]): number {
	if (allKillValues.length === 0) {
		return 0;
	}

	// Calculate total kills across all players
	let totalKills = 0;
	for (let i = 0; i < allKillValues.length; i++) {
		totalKills += allKillValues[i];
	}

	// If no one has kills, no kill pool points
	if (totalKills === 0) {
		return 0;
	}

	const playerCount = allKillValues.length;

	// Calculate player's kill share (proportion of total kills)
	const killShare = playerKillValue / totalKills;

	// Calculate average share (what each player would have with equal kills)
	const averageShare = 1.0 / playerCount;

	// Calculate deviation from average share
	const deviation = killShare - averageShare;

	// Convert deviation to points
	// Positive deviation = above average kills = gain points
	// Negative deviation = below average kills = lose points
	const killPoints = deviation * KILL_POOL_MULTIPLIER;

	return Math.round(killPoints);
}

// Keep old function name as alias for backwards compatibility in rating-manager
export function calculateKillAdjustment(playerKillValue: number, allKillValues: number[]): number {
	return calculateKillPoolPoints(playerKillValue, allKillValues);
}

// ============================================
// Combined Rating Calculation
// ============================================

/**
 * Calculate total rating change for a player
 *
 * Formula: ratingChange = placementPoints + killPoints
 *
 * Both pools are independently zero-sum:
 * - Placement pool: distributes points based on final rank
 * - Kill pool: distributes points based on kill share
 *
 * The opponent strength modifier only affects the placement pool,
 * as it represents how impressive your placement was given the competition.
 *
 * @param placement Final rank (0-based index: 0 = 1st, 1 = 2nd, etc.)
 * @param playerRating Player's current rating
 * @param opponentRatings Array of all opponent ratings
 * @param playerCount Total number of players in the game
 * @param playerKillValue Optional: Player's kill value for this game
 * @param allKillValues Optional: Array of all players' kill values
 * @returns Total rating change to apply
 */
export function calculateRatingChange(
	placement: number,
	playerRating: number,
	opponentRatings: number[],
	playerCount: number,
	playerKillValue?: number,
	allKillValues?: number[]
): number {
	// ========================================
	// Pool 1: Placement Points (with opponent modifier)
	// ========================================
	const basePlacementPoints = calculatePlacementPoints(placement, playerCount);

	// Determine if this is a gain or loss based on base points
	const isGain = basePlacementPoints >= 0;

	// Calculate opponent strength modifier
	const opponentStrengthModifier = calculateOpponentStrengthModifier(playerRating, opponentRatings, isGain);

	// Apply opponent strength modifier to placement points
	const placementPoints = Math.round(basePlacementPoints * opponentStrengthModifier);

	// ========================================
	// Pool 2: Kill Points (proportional to kill share)
	// ========================================
	let killPoints = 0;
	if (playerKillValue !== undefined && allKillValues !== undefined && allKillValues.length > 0) {
		killPoints = calculateKillPoolPoints(playerKillValue, allKillValues);
	}

	// ========================================
	// Total: Sum of both zero-sum pools
	// ========================================
	const totalChange = placementPoints + killPoints;

	return totalChange;
}
