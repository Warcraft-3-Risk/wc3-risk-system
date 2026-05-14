/**
 * Pure guard-priority logic extracted for testing.
 *
 * These functions mirror the comparison logic in `unit-comparisons.ts` and
 * `replace-guard.ts` but operate on plain data objects instead of WC3 handles,
 * making them testable without the WC3 runtime.
 */

export interface GuardCandidate {
	/** Unique identifier for the unit. */
	id: number;
	/** Point value (cost/priority weight) of the unit. */
	pointValue: number;
	/** Current hit points. */
	health: number;
}

export interface GuardSettings {
	/** true = maximize (prefer expensive units), false = minimize (prefer cheap units). */
	value: boolean;
	/** true = maximize (prefer healthy units), false = minimize (prefer damaged units). */
	health: boolean;
}

/**
 * Compare two guard candidates by point value, using the provided settings.
 *
 * @returns The preferred candidate, or `initial` when no preference is expressed.
 */
export function compareByValue(
	compare: GuardCandidate | undefined,
	initial: GuardCandidate | undefined,
	settings: GuardSettings
): GuardCandidate | undefined {
	if (!initial) return compare;
	if (!compare) return initial;
	if (compare.id === initial.id) return initial;

	if (!settings.value && compare.pointValue < initial.pointValue) {
		return compare;
	}

	if (settings.value && compare.pointValue > initial.pointValue) {
		return compare;
	}

	if (compare.pointValue === initial.pointValue) {
		return compareByHealth(compare, initial, settings);
	}

	return initial;
}

/**
 * Tiebreaker: compare two guard candidates by health.
 */
export function compareByHealth(
	compare: GuardCandidate | undefined,
	initial: GuardCandidate | undefined,
	settings: GuardSettings
): GuardCandidate | undefined {
	if (!initial) return compare;
	if (!compare) return initial;
	if (compare.id === initial.id) return initial;

	if (!settings.health && compare.health < initial.health) {
		return compare;
	}

	if (settings.health && compare.health > initial.health) {
		return compare;
	}

	return initial;
}

/**
 * Select the best guard from a list of candidates according to the given settings.
 *
 * This mirrors `ReplaceGuard` which iterates a group and applies `CompareUnitByValue`
 * to find the optimal candidate. The initial pick is the first candidate in the array
 * (simulating `GroupPickRandomUnit`).
 *
 * @param candidates - Available guard candidates (non-empty).
 * @param settings - The **city owner's** guard priority settings.
 * @returns The best candidate, or `undefined` if the array is empty.
 */
export function selectBestGuard(candidates: GuardCandidate[], settings: GuardSettings): GuardCandidate | undefined {
	if (candidates.length === 0) return undefined;

	let best: GuardCandidate = candidates[0];
	for (let i = 1; i < candidates.length; i++) {
		best = compareByValue(candidates[i], best, settings) ?? best;
	}
	return best;
}
