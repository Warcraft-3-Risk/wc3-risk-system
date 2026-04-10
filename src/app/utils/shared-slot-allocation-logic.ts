/**
 * Pure shared-slot allocation logic extracted for testing.
 *
 * Models the redistribution algorithm from `SharedSlotManager` without
 * WC3 engine dependencies.  All functions operate on plain data and
 * return deterministic results.
 */

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

export interface SlotState {
	/** Unique slot identifier (typically a WC3 player id). */
	slotId: number;
	/** Number of movable units currently on this slot. */
	unitCount: number;
}

export interface UnitPlacement {
	/** Unique unit identifier. */
	unitId: number;
	/** The slot the unit currently lives on. */
	currentSlotId: number;
}

export interface RedistributionPlan {
	/** Which unit to move. */
	unitId: number;
	/** Source slot. */
	fromSlotId: number;
	/** Destination slot. */
	toSlotId: number;
}

export interface PlayerSlotSnapshot {
	/** Real-player identifier. */
	playerId: number;
	/** Shared slots currently assigned to this player (includes player's own slot). */
	slotIds: number[];
}

// ---------------------------------------------------------------------------
// Slot distribution
// ---------------------------------------------------------------------------

/**
 * How many shared slots should each active player receive?
 *
 * Mirrors `Math.floor(totalSlots / activePlayers)` in
 * `SharedSlotManager.evaluateAndRedistribute()`.
 */
export function calculateSlotsPerPlayer(totalSlots: number, activePlayers: number): number {
	if (activePlayers <= 0) return 0;
	return Math.floor(totalSlots / activePlayers);
}

/**
 * Compute how many slots each player should gain or lose.
 *
 * Returns positive values for players needing more slots,
 * negative for players with excess.
 */
export function calculateSlotDeltas(
	players: PlayerSlotSnapshot[],
	slotsPerPlayer: number
): { playerId: number; delta: number }[] {
	return players.map((p) => ({
		playerId: p.playerId,
		delta: slotsPerPlayer - p.slotIds.length,
	}));
}

// ---------------------------------------------------------------------------
// Unit redistribution
// ---------------------------------------------------------------------------

/**
 * Given a list of movable units and the target slots they should be spread
 * across, produce a plan of which units need to change ownership.
 *
 * The algorithm distributes units round-robin across slots, placing
 * `floor(N/S)` units per slot plus +1 for the first `N % S` slots
 * (matching `SharedSlotManager.redistributeExistingUnits`).
 *
 * Units that are already on their target slot are **excluded** from the plan
 * (no-op optimisation).
 */
export function planUnitRedistribution(units: UnitPlacement[], targetSlots: SlotState[]): RedistributionPlan[] {
	if (units.length === 0 || targetSlots.length === 0) return [];

	const numSlots = targetSlots.length;
	const unitsPerSlot = Math.floor(units.length / numSlots);
	const remainder = units.length % numSlots;

	const plan: RedistributionPlan[] = [];
	let unitIndex = 0;

	for (let slotIdx = 0; slotIdx < numSlots; slotIdx++) {
		const targetSlotId = targetSlots[slotIdx].slotId;
		const targetCount = unitsPerSlot + (slotIdx < remainder ? 1 : 0);

		for (let j = 0; j < targetCount && unitIndex < units.length; j++) {
			const u = units[unitIndex];

			// Skip no-ops: unit already on the correct slot
			if (u.currentSlotId !== targetSlotId) {
				plan.push({
					unitId: u.unitId,
					fromSlotId: u.currentSlotId,
					toSlotId: targetSlotId,
				});
			}

			unitIndex++;
		}
	}

	return plan;
}

/**
 * Count the number of ownership changes a redistribution plan requires.
 * Each change maps to one `SetUnitOwner` + untrack/retrack cycle in
 * production code.
 */
export function countOwnershipChanges(plan: RedistributionPlan[]): number {
	return plan.length;
}

/**
 * Estimate the minimap frame operations cost of a redistribution plan.
 *
 * Each ownership change triggers:
 *   1. untrackUnit → hide frame, delete from Map, push to pool, restore boolean field
 *   2. SetUnitOwner (WC3 native)
 *   3. trackUnit → pop from pool, set size, set level, store in Map, set position, set color, show
 *
 * Estimated cost: ~4 frame-related operations per move (hide, delete, set, show).
 *
 * @param plan - The redistribution plan.
 * @returns Estimated minimap frame operations.
 */
export function estimateMinimapCostOfRedistribution(plan: RedistributionPlan[]): number {
	const FRAME_OPS_PER_MOVE = 4;
	return plan.length * FRAME_OPS_PER_MOVE;
}

// ---------------------------------------------------------------------------
// Incremental allocation (no redistribution of existing units)
// ---------------------------------------------------------------------------

/**
 * When new slots are added to a player, this returns the number of ownership
 * changes that would be required if we do NOT redistribute existing units.
 *
 * The answer is always **zero** — adding slots should not move existing units.
 * New units will be placed via {@link selectSlotForNewUnit} going forward.
 */
export function planIncrementalSlotAddition(
	_existingUnits: UnitPlacement[],
	_oldSlots: SlotState[],
	_newSlots: SlotState[]
): RedistributionPlan[] {
	// Desired behaviour: no existing units are moved when slots are added.
	return [];
}

/**
 * Select the slot with the fewest units for a newly trained / spawned unit.
 *
 * Mirrors `SharedSlotManager.getSlotWithLowestUnitCount()` in production.
 *
 * If multiple slots are tied, returns the first one encountered (any is fine
 * per the spec — "it just picks any, it is not that important").
 */
export function selectSlotForNewUnit(slots: SlotState[]): SlotState | undefined {
	if (slots.length === 0) return undefined;

	let best = slots[0];
	for (let i = 1; i < slots.length; i++) {
		if (slots[i].unitCount < best.unitCount) {
			best = slots[i];
		}
	}
	return best;
}

/**
 * Simulate the full redistribution pipeline:
 * 1. Calculate slots per player.
 * 2. For each player, gather movable units across all their slots.
 * 3. Plan the redistribution.
 * 4. Return aggregate statistics.
 */
export function simulateRedistribution(
	activePlayers: PlayerSlotSnapshot[],
	unitsByPlayer: Map<number, UnitPlacement[]>
): {
	totalOwnershipChanges: number;
	totalUnitsProcessed: number;
	perPlayerChanges: { playerId: number; changes: number; units: number }[];
} {
	const perPlayerChanges: { playerId: number; changes: number; units: number }[] = [];
	let totalOwnershipChanges = 0;
	let totalUnitsProcessed = 0;

	for (const player of activePlayers) {
		const units = unitsByPlayer.get(player.playerId) || [];
		const slots: SlotState[] = player.slotIds.map((id) => ({
			slotId: id,
			unitCount: units.filter((u) => u.currentSlotId === id).length,
		}));

		const plan = planUnitRedistribution(units, slots);
		const changes = countOwnershipChanges(plan);

		perPlayerChanges.push({
			playerId: player.playerId,
			changes,
			units: units.length,
		});

		totalOwnershipChanges += changes;
		totalUnitsProcessed += units.length;
	}

	return { totalOwnershipChanges, totalUnitsProcessed, perPlayerChanges };
}
