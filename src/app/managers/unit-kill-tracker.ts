/**
 * Manager for tracking kill counts per unit.
 * Uses a Map to associate each unit with its kill count.
 */
export class UnitKillTracker {
	private killCounts: Map<unit, number>;
	private static instance: UnitKillTracker;

	private constructor() {
		this.killCounts = new Map<unit, number>();
	}

	/**
	 * Gets the singleton instance of the UnitKillTracker.
	 * @returns The singleton instance.
	 */
	public static getInstance(): UnitKillTracker {
		if (this.instance == null) {
			this.instance = new UnitKillTracker();
		}
		return this.instance;
	}

	/**
	 * Increments the kill count for a specific unit.
	 * @param killingUnit - The unit that got the kill.
	 */
	public incrementKills(killingUnit: unit): void {
		if (!killingUnit) return;

		const currentKills = this.killCounts.get(killingUnit) || 0;
		this.killCounts.set(killingUnit, currentKills + 1);
	}

	/**
	 * Gets the kill count for a specific unit.
	 * @param unit - The unit to query.
	 * @returns The number of kills, or 0 if the unit has no kills.
	 */
	public getKills(unit: unit): number {
		if (!unit) return 0;
		return this.killCounts.get(unit) || 0;
	}

	/**
	 * Removes a unit from tracking (call when unit dies or is removed).
	 * @param unit - The unit to stop tracking.
	 */
	public removeUnit(unit: unit): void {
		if (!unit) return;
		this.killCounts.delete(unit);
	}

	/**
	 * Resets all kill counts (useful for game resets).
	 */
	public reset(): void {
		this.killCounts.clear();
	}
}
