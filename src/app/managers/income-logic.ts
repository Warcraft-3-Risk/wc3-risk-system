/**
 * Pure income calculation logic — no WC3 API dependencies.
 * These functions can be unit tested without the game engine.
 */

export interface IncomeState {
	income: number;
	delta: number;
}

export interface GoldState {
	earned: number;
	max: number;
	currentGold: number;
}

/**
 * Calculate the income change when a player gains control of a country.
 * Income gained equals the number of cities in that country.
 * @param countryCityCount Number of cities in the country
 * @returns Income to add
 */
export function incomeFromCountryCapture(countryCityCount: number): number {
	return countryCityCount;
}

/**
 * Calculate the income change when a player loses control of a country.
 * @param countryCityCount Number of cities in the country
 * @returns Income to subtract (positive value)
 */
export function incomeFromCountryLoss(countryCityCount: number): number {
	return countryCityCount;
}

/**
 * Apply gold income to a player's gold state.
 * @param currentGold Current gold amount
 * @param incomeAmount Amount of income to add
 * @param goldState Mutable gold tracking state
 * @returns New gold total
 */
export function applyIncome(
	currentGold: number,
	incomeAmount: number,
	goldState: GoldState,
): number {
	const newGold = currentGold + incomeAmount;

	if (incomeAmount >= 1) {
		goldState.earned += incomeAmount;
	}

	if (newGold > goldState.max) {
		goldState.max = newGold;
	}

	goldState.currentGold = newGold;
	return newGold;
}

/**
 * Update income state when a country changes ownership.
 * @param incomeState The player's income state to mutate
 * @param countryCityCount Number of cities in the country
 * @param gained Whether the player gained (true) or lost (false) the country
 */
export function updateIncomeForCountryChange(
	incomeState: IncomeState,
	countryCityCount: number,
	gained: boolean,
): void {
	if (gained) {
		incomeState.income += countryCityCount;
		incomeState.delta += countryCityCount;
	} else {
		incomeState.income -= countryCityCount;
		incomeState.delta -= countryCityCount;
	}
}

/**
 * Update income state when a region bonus changes.
 * @param incomeState The player's income state to mutate
 * @param regionBonus The gold bonus for the region
 * @param gained Whether the player gained (true) or lost (false) the region
 */
export function updateIncomeForRegionChange(
	incomeState: IncomeState,
	regionBonus: number,
	gained: boolean,
): void {
	if (gained) {
		incomeState.income += regionBonus;
		incomeState.delta += regionBonus;
	} else {
		incomeState.income -= regionBonus;
		incomeState.delta -= regionBonus;
	}
}
