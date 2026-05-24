/**
 * Lightweight player stub for testing code that expects WC3 player handles.
 *
 * A `FakePlayerHandle` carries the same data a real WC3 `player` would
 * expose through API calls like `GetPlayerId()` and `GetPlayerName()`,
 * but exists entirely in Node.js — no game engine required.
 */

export interface FakePlayerHandle {
	/** Zero-based player slot (matches `GetPlayerId`). */
	id: number;
	/** Display name (matches `GetPlayerName`). */
	name: string;
	/** Slot state: 'playing' | 'empty' | 'left'. */
	slotState: string;
	/** Controller type: 'user' | 'computer' | 'none'. */
	controller: string;
	/** Current gold. */
	gold: number;
	/** Current lumber. */
	lumber: number;
}

/**
 * Create a fake player with sensible defaults.
 *
 * ```ts
 * const p = createFakePlayer(0, 'Alice');
 * GetPlayerName(p); // 'Alice'  (via wc3-shim)
 * ```
 */
export function createFakePlayer(id: number, name?: string): FakePlayerHandle {
	return {
		id,
		name: name ?? `Player ${id + 1}`,
		slotState: 'playing',
		controller: 'user',
		gold: 0,
		lumber: 0,
	};
}
