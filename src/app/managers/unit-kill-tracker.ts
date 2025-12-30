import { debugPrint } from '../utils/debug-print';

/**
 * Manager for tracking kill counts per unit.
 * Uses a Map to associate each unit with its kill count.
 */
export class UnitKillTracker {
	private killCounts: Map<unit, number>;
	private killValues: Map<unit, number>;
	private static instance: UnitKillTracker;

	private constructor() {
		this.killCounts = new Map<unit, number>();
		this.killValues = new Map<unit, number>();
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
	 * Adds kill value to a unit and returns the total kill value.
	 * @param killingUnit - The unit that got the kill.
	 * @param value - The point value of the killed unit.
	 * @returns The total accumulated kill value for this unit.
	 */
	public addKillValue(killingUnit: unit, value: number): number {
		if (!killingUnit) {
			debugPrint(`[TRACKER] Killing unit is null, returning 0`);
			return 0;
		}
		const currentValue = this.killValues.get(killingUnit) || 0;
		const newValue = currentValue + value;
		this.killValues.set(killingUnit, newValue);
		return newValue;
	}

	/**
	 * Gets the accumulated kill value for a specific unit.
	 * @param unit - The unit to query.
	 * @returns The total point value of units killed, or 0 if the unit has no kills.
	 */
	public getKillValue(unit: unit): number {
		if (!unit) return 0;
		return this.killValues.get(unit) || 0;
	}

	/**
	 * Removes a unit from tracking (call when unit dies or is removed).
	 * @param unit - The unit to stop tracking.
	 */
	public removeUnit(unit: unit): void {
		if (!unit) return;
		this.killCounts.delete(unit);
		this.killValues.delete(unit);
	}

	/**
	 * Resets all kill counts (useful for game resets).
	 */
	public reset(): void {
		this.killCounts.clear();
		this.killValues.clear();
	}
}
