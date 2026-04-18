import { EventCategory, RandomEvent } from './random-event';

export function shouldTriggerEvent(turn: number, interval: number): boolean {
	return turn > 0 && turn % interval === 0;
}

export function isPreviewTurn(turn: number, interval: number): boolean {
	return turn > 0 && (turn + 1) % interval === 0;
}

export function selectEvent(
	pool: RandomEvent[],
	recentHistory: string[],
	lastCategory: EventCategory | undefined,
	rng: (min: number, max: number) => number
): RandomEvent | undefined {
	const eligible = pool.filter((e) => {
		if (recentHistory.includes(e.id)) return false;
		if (e.category === lastCategory) return false;
		if (e.isEligible && !e.isEligible()) return false;
		return true;
	});

	if (eligible.length === 0) {
		// Fallback: ignore history constraint, still respect category
		const fallback = pool.filter((e) => {
			if (e.category === lastCategory) return false;
			if (e.isEligible && !e.isEligible()) return false;
			return true;
		});

		if (fallback.length === 0) {
			// Last resort: any eligible event
			const lastResort = pool.filter((e) => !e.isEligible || e.isEligible());
			if (lastResort.length === 0) return undefined;
			return lastResort[rng(0, lastResort.length - 1)];
		}

		return fallback[rng(0, fallback.length - 1)];
	}

	return eligible[rng(0, eligible.length - 1)];
}
