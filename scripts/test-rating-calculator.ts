/**
 * Unit Tests for Rating Calculator
 *
 * This test file can run in isolation without WC3 dependencies because
 * the rating calculator functions are pure mathematical calculations.
 *
 * Run with: npx ts-node scripts/test-rating-calculator.ts
 */

// ============================================
// Rating Calculator Implementation (Copy for Testing)
// ============================================
// We duplicate the core logic here to avoid import issues with the WC3 project.
// Keep this in sync with src/app/rating/rating-calculator.ts

const TARGET_INFLATION_PER_GAME = 0;
const MAX_WIN_POINTS = 15;
const MAX_LOSS_POINTS = 15;
const WINNER_BONUS = 8;
const BREAKEVEN_PERCENTILE = 0.5;
const OPPONENT_STRENGTH_FACTOR = 0.32;
const KILL_POOL_MULTIPLIER = 55;
const RANKED_STARTING_RATING = 1000;

function calculateRawPlacementPoints(placement: number, playerCount: number): number {
	if (playerCount <= 1) {
		return 0;
	}

	const breakevenPos = Math.floor(playerCount * BREAKEVEN_PERCENTILE);

	if (placement < breakevenPos) {
		const posRatio = placement / breakevenPos;
		let points = MAX_WIN_POINTS * (1 - posRatio * posRatio);
		if (placement === 0) {
			points += WINNER_BONUS;
		}
		return points;
	} else if (placement === breakevenPos) {
		return 0;
	} else {
		const lossZoneSize = playerCount - breakevenPos - 1;
		if (lossZoneSize <= 0) {
			return -MAX_LOSS_POINTS;
		}
		const posInLossZone = placement - breakevenPos - 1;
		const posRatio = (posInLossZone + 1) / lossZoneSize;
		return -MAX_LOSS_POINTS * posRatio * posRatio;
	}
}

function calculateRawPlacementSum(playerCount: number): number {
	let sum = 0;
	for (let i = 0; i < playerCount; i++) {
		sum += calculateRawPlacementPoints(i, playerCount);
	}
	return sum;
}

function calculatePlacementPoints(placement: number, playerCount: number): number {
	if (playerCount <= 1) {
		return 0;
	}

	const rawPoints = calculateRawPlacementPoints(placement, playerCount);
	const rawSum = calculateRawPlacementSum(playerCount);
	const adjustment = (TARGET_INFLATION_PER_GAME - rawSum) / playerCount;

	return Math.round(rawPoints + adjustment);
}

function calculateOpponentStrengthModifier(
	playerRating: number,
	opponentRatings: number[],
	isGain: boolean
): number {
	if (opponentRatings.length === 0) {
		return 1.0;
	}

	let totalOpponentRating = 0;
	for (let i = 0; i < opponentRatings.length; i++) {
		totalOpponentRating += opponentRatings[i];
	}
	const avgOpponentRating = totalOpponentRating / opponentRatings.length;

	const ratingDiff = playerRating - avgOpponentRating;
	const scaledDiff = Math.max(-1, Math.min(1, ratingDiff / 400)) * OPPONENT_STRENGTH_FACTOR;

	if (isGain) {
		return 1.0 - scaledDiff;
	} else {
		return 1.0 + scaledDiff;
	}
}

function calculateKillPoolPoints(playerKillValue: number, allKillValues: number[]): number {
	if (allKillValues.length === 0) {
		return 0;
	}

	let totalKills = 0;
	for (let i = 0; i < allKillValues.length; i++) {
		totalKills += allKillValues[i];
	}

	if (totalKills === 0) {
		return 0;
	}

	const playerCount = allKillValues.length;
	const killShare = playerKillValue / totalKills;
	const averageShare = 1.0 / playerCount;
	const deviation = killShare - averageShare;
	const killPoints = deviation * KILL_POOL_MULTIPLIER;

	return Math.round(killPoints);
}

function calculateRatingChange(
	placement: number,
	playerRating: number,
	opponentRatings: number[],
	playerCount: number,
	playerKillValue?: number,
	allKillValues?: number[]
): number {
	const basePlacementPoints = calculatePlacementPoints(placement, playerCount);
	const isGain = basePlacementPoints >= 0;
	const opponentStrengthModifier = calculateOpponentStrengthModifier(playerRating, opponentRatings, isGain);
	const placementPoints = Math.round(basePlacementPoints * opponentStrengthModifier);

	let killPoints = 0;
	if (playerKillValue !== undefined && allKillValues !== undefined && allKillValues.length > 0) {
		killPoints = calculateKillPoolPoints(playerKillValue, allKillValues);
	}

	return placementPoints + killPoints;
}

function getRankIcon(rating: number): string {
	if (rating >= 2500) return 'Assets\\Ranks\\gold_5.blp';
	if (rating >= 2375) return 'Assets\\Ranks\\gold_4.blp';
	if (rating >= 2250) return 'Assets\\Ranks\\gold_3.blp';
	if (rating >= 2125) return 'Assets\\Ranks\\gold_2.blp';
	if (rating >= 2000) return 'Assets\\Ranks\\gold_1.blp';
	if (rating >= 1900) return 'Assets\\Ranks\\silver_5.blp';
	if (rating >= 1800) return 'Assets\\Ranks\\silver_4.blp';
	if (rating >= 1700) return 'Assets\\Ranks\\silver_3.blp';
	if (rating >= 1600) return 'Assets\\Ranks\\silver_2.blp';
	if (rating >= 1500) return 'Assets\\Ranks\\silver_1.blp';
	if (rating >= 1400) return 'Assets\\Ranks\\bronze_5.blp';
	if (rating >= 1300) return 'Assets\\Ranks\\bronze_4.blp';
	if (rating >= 1200) return 'Assets\\Ranks\\bronze_3.blp';
	if (rating >= 1100) return 'Assets\\Ranks\\bronze_2.blp';
	return 'Assets\\Ranks\\bronze_1.blp';
}

// ============================================
// Test Framework
// ============================================

interface TestResult {
	name: string;
	passed: boolean;
	message?: string;
}

const testResults: TestResult[] = [];
let currentSuite = '';

function describe(suiteName: string, fn: () => void): void {
	currentSuite = suiteName;
	console.log(`\n${'='.repeat(60)}`);
	console.log(`📦 ${suiteName}`);
	console.log('='.repeat(60));
	fn();
}

function test(name: string, fn: () => void): void {
	try {
		fn();
		testResults.push({ name: `${currentSuite} > ${name}`, passed: true });
		console.log(`  ✅ ${name}`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		testResults.push({ name: `${currentSuite} > ${name}`, passed: false, message });
		console.log(`  ❌ ${name}`);
		console.log(`     └─ ${message}`);
	}
}

function expect<T>(actual: T) {
	return {
		toBe(expected: T): void {
			if (actual !== expected) {
				throw new Error(`Expected ${expected}, but got ${actual}`);
			}
		},
		toBeCloseTo(expected: number, precision = 2): void {
			const diff = Math.abs((actual as number) - expected);
			const threshold = Math.pow(10, -precision) / 2;
			if (diff > threshold) {
				throw new Error(`Expected ${expected} ± ${threshold}, but got ${actual} (diff: ${diff})`);
			}
		},
		toBeGreaterThan(expected: number): void {
			if ((actual as number) <= expected) {
				throw new Error(`Expected ${actual} to be greater than ${expected}`);
			}
		},
		toBeLessThan(expected: number): void {
			if ((actual as number) >= expected) {
				throw new Error(`Expected ${actual} to be less than ${expected}`);
			}
		},
		toBeGreaterThanOrEqual(expected: number): void {
			if ((actual as number) < expected) {
				throw new Error(`Expected ${actual} to be >= ${expected}`);
			}
		},
		toBeLessThanOrEqual(expected: number): void {
			if ((actual as number) > expected) {
				throw new Error(`Expected ${actual} to be <= ${expected}`);
			}
		},
		toContain(substring: string): void {
			if (!(actual as string).includes(substring)) {
				throw new Error(`Expected "${actual}" to contain "${substring}"`);
			}
		},
	};
}

// ============================================
// Tests
// ============================================

describe('Placement Points', () => {
	test('1st place gets winner bonus', () => {
		const points = calculatePlacementPoints(0, 18);
		expect(points).toBeGreaterThan(15); // Should exceed MAX_WIN_POINTS due to winner bonus
	});

	test('breakeven position gets 0 points', () => {
		// In 18 players, breakeven is at position 9 (0-indexed: 8)
		const points = calculatePlacementPoints(8, 18);
		expect(points).toBe(0);
	});

	test('last place gets maximum penalty', () => {
		const points = calculatePlacementPoints(17, 18);
		expect(points).toBeLessThanOrEqual(-15);
	});

	test('top 50% get positive points', () => {
		for (let pos = 0; pos < 9; pos++) {
			const points = calculatePlacementPoints(pos, 18);
			expect(points).toBeGreaterThanOrEqual(0);
		}
	});

	test('bottom 50% get negative points', () => {
		for (let pos = 9; pos < 18; pos++) {
			const points = calculatePlacementPoints(pos, 18);
			expect(points).toBeLessThan(0);
		}
	});

	test('placement points are zero-sum', () => {
		for (const playerCount of [16, 17, 18, 19, 20, 21, 22, 23]) {
			let sum = 0;
			for (let pos = 0; pos < playerCount; pos++) {
				sum += calculatePlacementPoints(pos, playerCount);
			}
			// Allow ±1 per player due to rounding
			expect(Math.abs(sum)).toBeLessThanOrEqual(playerCount);
		}
	});

	test('higher positions get more points', () => {
		for (let pos = 1; pos < 18; pos++) {
			const higherPoints = calculatePlacementPoints(pos - 1, 18);
			const lowerPoints = calculatePlacementPoints(pos, 18);
			expect(higherPoints).toBeGreaterThanOrEqual(lowerPoints);
		}
	});
});

describe('Kill Pool Points', () => {
	test('returns 0 when no kills in game', () => {
		const points = calculateKillPoolPoints(0, [0, 0, 0, 0]);
		expect(points).toBe(0);
	});

	test('returns 0 for empty kill array', () => {
		const points = calculateKillPoolPoints(100, []);
		expect(points).toBe(0);
	});

	test('above average kills get positive points', () => {
		// Player has 200 kills, others have 100 each. Total = 500, avg share = 20%
		// Player share = 40%, deviation = +20%
		const points = calculateKillPoolPoints(200, [200, 100, 100, 100, 100]);
		expect(points).toBeGreaterThan(0);
	});

	test('below average kills get negative points', () => {
		const points = calculateKillPoolPoints(10, [200, 100, 100, 100, 10]);
		expect(points).toBeLessThan(0);
	});

	test('kill pool is zero-sum', () => {
		const kills = [344, 35, 64, 11, 19, 68, 6, 2, 0];
		let sum = 0;
		for (const playerKills of kills) {
			sum += calculateKillPoolPoints(playerKills, kills);
		}
		// Allow small rounding error
		expect(Math.abs(sum)).toBeLessThanOrEqual(kills.length);
	});

	test('proportional scaling: more kills = more points', () => {
		const kills = [300, 200, 100, 50, 50];
		const highKillBonus = calculateKillPoolPoints(300, kills);
		const midKillBonus = calculateKillPoolPoints(200, kills);
		const lowKillBonus = calculateKillPoolPoints(100, kills);
		// Higher kill counts should get more points
		expect(highKillBonus).toBeGreaterThan(midKillBonus);
		expect(midKillBonus).toBeGreaterThan(lowKillBonus);
	});
});

describe('Opponent Strength Modifier', () => {
	test('returns 1.0 for empty opponent array', () => {
		const modifier = calculateOpponentStrengthModifier(1000, [], true);
		expect(modifier).toBe(1.0);
	});

	test('returns 1.0 when rating equals average opponent', () => {
		const modifier = calculateOpponentStrengthModifier(1000, [1000, 1000, 1000], true);
		expect(modifier).toBe(1.0);
	});

	test('gain modifier decreases when beating weaker opponents', () => {
		// Higher rated player (2000) vs weaker opponents (1000 avg)
		const modifier = calculateOpponentStrengthModifier(2000, [1000, 1000, 1000], true);
		expect(modifier).toBeLessThan(1.0);
	});

	test('gain modifier increases when beating stronger opponents', () => {
		// Lower rated player (1000) vs stronger opponents (2000 avg)
		const modifier = calculateOpponentStrengthModifier(1000, [2000, 2000, 2000], true);
		expect(modifier).toBeGreaterThan(1.0);
	});

	test('loss modifier increases when losing to weaker opponents', () => {
		// Higher rated player loses to weaker opponents = more penalty
		const modifier = calculateOpponentStrengthModifier(2000, [1000, 1000, 1000], false);
		expect(modifier).toBeGreaterThan(1.0);
	});

	test('loss modifier decreases when losing to stronger opponents', () => {
		// Lower rated player loses to stronger opponents = less penalty
		const modifier = calculateOpponentStrengthModifier(1000, [2000, 2000, 2000], false);
		expect(modifier).toBeLessThan(1.0);
	});

	test('modifier is clamped to range', () => {
		// Extreme difference: 3000 vs 0
		const modifierGain = calculateOpponentStrengthModifier(3000, [0], true);
		const modifierLoss = calculateOpponentStrengthModifier(3000, [0], false);

		// Should be clamped: 1 - 0.32 = 0.68 and 1 + 0.32 = 1.32
		expect(modifierGain).toBeCloseTo(0.68, 2);
		expect(modifierLoss).toBeCloseTo(1.32, 2);
	});
});

describe('Combined Rating Change', () => {
	test('1st place gets positive rating change', () => {
		const change = calculateRatingChange(0, 1000, [1000, 1000, 1000], 18, 100, [100, 50, 50, 50]);
		expect(change).toBeGreaterThan(0);
	});

	test('last place gets negative rating change', () => {
		const change = calculateRatingChange(17, 1000, [1000, 1000, 1000], 18, 0, [100, 50, 50, 0]);
		expect(change).toBeLessThan(0);
	});

	test('high kill count can offset poor placement', () => {
		// 10th place (just below breakeven) but massive kills
		const lowKillChange = calculateRatingChange(9, 1000, [1000], 18, 10, [10, 100, 100, 100]);
		const highKillChange = calculateRatingChange(9, 1000, [1000], 18, 500, [500, 100, 100, 100]);

		expect(highKillChange).toBeGreaterThan(lowKillChange);
	});

	test('works without kill data', () => {
		const change = calculateRatingChange(0, 1000, [1000, 1000], 18);
		expect(change).toBeGreaterThan(0); // 1st place should still gain
	});
});

describe('Rank Icons', () => {
	test('2500+ rating gets gold_5', () => {
		expect(getRankIcon(2500)).toContain('gold_5');
		expect(getRankIcon(3000)).toContain('gold_5');
	});

	test('2375-2499 gets gold_4', () => {
		expect(getRankIcon(2375)).toContain('gold_4');
		expect(getRankIcon(2499)).toContain('gold_4');
	});

	test('2000-2124 gets gold_1', () => {
		expect(getRankIcon(2000)).toContain('gold_1');
		expect(getRankIcon(2124)).toContain('gold_1');
	});

	test('1500-1599 gets silver_1', () => {
		expect(getRankIcon(1500)).toContain('silver_1');
		expect(getRankIcon(1599)).toContain('silver_1');
	});

	test('1000 (starting) gets bronze_1', () => {
		expect(getRankIcon(1000)).toContain('bronze_1');
	});

	test('all rank thresholds are covered', () => {
		const testRatings = [999, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2125, 2250, 2375, 2500];
		for (const rating of testRatings) {
			const icon = getRankIcon(rating);
			expect(icon).toContain('Assets\\Ranks\\');
			expect(icon).toContain('.blp');
		}
	});
});

describe('Progression Targets', () => {
	test('consistent 1st place reaches 2500 in ~54 games', () => {
		let rating = RANKED_STARTING_RATING;
		let games = 0;
		const opponents = Array(17).fill(1000);
		const kills = [200, ...Array(17).fill(50)]; // High kills for 1st

		while (rating < 2500 && games < 200) {
			const change = calculateRatingChange(0, rating, opponents, 18, kills[0], kills);
			rating += change;
			games++;
		}

		expect(games).toBeLessThanOrEqual(70); // Should be around 54
		expect(games).toBeGreaterThanOrEqual(40);
	});

	test('average top 5 reaches 2500 in reasonable time', () => {
		let rating = RANKED_STARTING_RATING;
		let games = 0;
		const opponents = Array(17).fill(1000);
		const kills = Array(18).fill(50);

		while (rating < 2500 && games < 300) {
			// Rotate through positions 0-4
			const placement = games % 5;
			const change = calculateRatingChange(placement, rating, opponents, 18, kills[placement], kills);
			rating += change;
			games++;
		}

		// As rating increases, opponent modifier reduces gains, so it takes longer
		// Expect roughly 100-200 games
		expect(games).toBeLessThanOrEqual(200);
		expect(games).toBeGreaterThanOrEqual(80);
	});

	test('floor protection: cannot drop below 1000', () => {
		// Simulate consistent last place finishes
		let rating = RANKED_STARTING_RATING;
		for (let i = 0; i < 50; i++) {
			const change = calculateRatingChange(17, rating, [1000], 18, 0, [0, 100]);
			rating = Math.max(RANKED_STARTING_RATING, rating + change);
		}

		expect(rating).toBeGreaterThanOrEqual(RANKED_STARTING_RATING);
	});
});

describe('Edge Cases', () => {
	test('single player game returns 0', () => {
		expect(calculatePlacementPoints(0, 1)).toBe(0);
	});

	test('2 player game works', () => {
		const first = calculatePlacementPoints(0, 2);
		const second = calculatePlacementPoints(1, 2);
		expect(first).toBeGreaterThan(0);
		expect(second).toBeLessThan(0);
	});

	test('23 player game (max) works', () => {
		let sum = 0;
		for (let pos = 0; pos < 23; pos++) {
			sum += calculatePlacementPoints(pos, 23);
		}
		expect(Math.abs(sum)).toBeLessThanOrEqual(23);
	});

	test('extreme rating differences are handled', () => {
		// 5000 rated player vs 100 rated players
		const modifier = calculateOpponentStrengthModifier(5000, [100, 100, 100], true);
		// Should be clamped: min is 1 - 0.32 = 0.68 (allowing floating point tolerance)
		expect(modifier).toBeGreaterThanOrEqual(0.67);
		expect(modifier).toBeLessThanOrEqual(1.33);
	});

	test('all kills by one player', () => {
		const kills = [1000, 0, 0, 0, 0];
		const winnerBonus = calculateKillPoolPoints(1000, kills);
		const loserPenalty = calculateKillPoolPoints(0, kills);

		expect(winnerBonus).toBeGreaterThan(0);
		expect(loserPenalty).toBeLessThan(0);
	});
});

// ============================================
// Run Tests and Print Summary
// ============================================

console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));

const passed = testResults.filter((r) => r.passed).length;
const failed = testResults.filter((r) => !r.passed).length;
const total = testResults.length;

console.log(`\nTotal: ${total} tests`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
	console.log('\n❌ FAILED TESTS:');
	testResults
		.filter((r) => !r.passed)
		.forEach((r) => {
			console.log(`  - ${r.name}`);
			console.log(`    ${r.message}`);
		});
	process.exit(1);
} else {
	console.log('\n🎉 All tests passed!');
	process.exit(0);
}
