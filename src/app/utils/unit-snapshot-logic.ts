/**
 * Pure unit-snapshot serialisation logic — no WC3 API dependencies.
 *
 * Each end-of-turn snapshot is serialised into a compact, single-line
 * format suitable for bulk file export. Unit types are stored as their
 * 4-character FourCC strings (e.g. "u000") for human readability.
 */

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

export interface UnitEntry {
	/** WC3 handle id (unique per unit). */
	id: number;
	/** FourCC unit-type string (e.g. "u000", "h001"). */
	type: string;
	/** Owner player index (0-based). */
	owner: number;
	/** World X coordinate (rounded to integer). */
	x: number;
	/** World Y coordinate (rounded to integer). */
	y: number;
}

export interface TurnSnapshot {
	turn: number;
	units: UnitEntry[];
}

// ---------------------------------------------------------------------------
// Serialisation
// ---------------------------------------------------------------------------

/**
 * Encode a single unit entry as a compact pipe-delimited string.
 * Format: `id|type|owner|x|y`
 */
export function encodeUnit(u: UnitEntry): string {
	return `${u.id}|${u.type}|${u.owner}|${u.x}|${u.y}`;
}

/**
 * Serialise a full turn snapshot into a single line.
 * Format: `turn;unit1;unit2;...`
 */
export function serialiseSnapshot(snap: TurnSnapshot): string {
	if (snap.units.length === 0) return `${snap.turn}`;
	return `${snap.turn};${snap.units.map((u) => encodeUnit(u)).join(';')}`;
}

/**
 * Deserialise a line produced by {@link serialiseSnapshot} back into a
 * {@link TurnSnapshot}. Useful for offline analysis tooling.
 */
export function deserialiseSnapshot(line: string): TurnSnapshot {
	const parts = line.split(';');
	const turn = parseInt(parts[0], 10);

	if (parts.length <= 1) return { turn, units: [] };

	const units: UnitEntry[] = [];
	for (let i = 1; i < parts.length; i++) {
		const fields = parts[i].split('|');
		units.push({
			id: parseInt(fields[0], 10),
			type: fields[1],
			owner: parseInt(fields[2], 10),
			x: parseInt(fields[3], 10),
			y: parseInt(fields[4], 10),
		});
	}
	return { turn, units };
}
