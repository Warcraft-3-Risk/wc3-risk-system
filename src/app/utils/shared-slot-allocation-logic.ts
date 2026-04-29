/**
 * Pure shared-slot allocation logic extracted for testing.
 *
 * Models the allocation algorithm from `SharedSlotManager` without
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
// New unit placement
// ---------------------------------------------------------------------------

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
