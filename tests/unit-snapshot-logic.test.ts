import { describe, it, expect } from 'vitest';
import {
	encodeUnit,
	serialiseSnapshot,
	deserialiseSnapshot,
	type UnitEntry,
	type TurnSnapshot,
} from '../src/app/utils/unit-snapshot-logic';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUnit(overrides: Partial<UnitEntry> = {}): UnitEntry {
	return { id: 1, type: 'u000', owner: 0, x: 100, y: 200, ...overrides };
}

// ---------------------------------------------------------------------------
// encodeUnit
// ---------------------------------------------------------------------------

describe('encodeUnit', () => {
	it('produces pipe-delimited string', () => {
		expect(encodeUnit(makeUnit())).toBe('1|u000|0|100|200');
	});

	it('handles different FourCC types', () => {
		expect(encodeUnit(makeUnit({ type: 'h001' }))).toBe('1|h001|0|100|200');
	});

	it('encodes negative coordinates', () => {
		expect(encodeUnit(makeUnit({ x: -500, y: -1200 }))).toBe('1|u000|0|-500|-1200');
	});
});

// ---------------------------------------------------------------------------
// serialiseSnapshot
// ---------------------------------------------------------------------------

describe('serialiseSnapshot', () => {
	it('serialises turn with no units', () => {
		expect(serialiseSnapshot({ turn: 3, units: [] })).toBe('3');
	});

	it('serialises a single unit', () => {
		const snap: TurnSnapshot = { turn: 1, units: [makeUnit()] };
		expect(serialiseSnapshot(snap)).toBe('1;1|u000|0|100|200');
	});

	it('serialises multiple units separated by semicolons', () => {
		const snap: TurnSnapshot = {
			turn: 5,
			units: [makeUnit({ id: 10, type: 'u000', owner: 0, x: 0, y: 0 }), makeUnit({ id: 20, type: 'h001', owner: 1, x: 300, y: 400 })],
		};
		const result = serialiseSnapshot(snap);
		expect(result).toBe('5;10|u000|0|0|0;20|h001|1|300|400');
	});
});

// ---------------------------------------------------------------------------
// deserialiseSnapshot
// ---------------------------------------------------------------------------

describe('deserialiseSnapshot', () => {
	it('round-trips empty turn', () => {
		const original: TurnSnapshot = { turn: 7, units: [] };
		expect(deserialiseSnapshot(serialiseSnapshot(original))).toEqual(original);
	});

	it('round-trips a populated snapshot', () => {
		const original: TurnSnapshot = {
			turn: 2,
			units: [makeUnit({ id: 42, type: 'u000', owner: 3, x: -100, y: 900 }), makeUnit({ id: 99, type: 'h002', owner: 5, x: 0, y: -50 })],
		};
		expect(deserialiseSnapshot(serialiseSnapshot(original))).toEqual(original);
	});

	it('preserves FourCC type string through round-trip', () => {
		const snap: TurnSnapshot = {
			turn: 1,
			units: [makeUnit({ type: 'Hpal' })],
		};
		const result = deserialiseSnapshot(serialiseSnapshot(snap));
		expect(result.units[0].type).toBe('Hpal');
	});

	it('parses coordinates as integers', () => {
		const result = deserialiseSnapshot('4;1|u000|0|123|456');
		expect(result.units[0].x).toBe(123);
		expect(result.units[0].y).toBe(456);
	});
});
