/**
 * Lightweight unit stub for testing code that expects WC3 unit handles.
 *
 * A `FakeUnitHandle` is constructed from real map object data (parsed from
 * the `.w3u` file) so its stats — name, HP, attack, defense — match what
 * the game would produce at runtime. This lets integration tests exercise
 * game logic with realistic values without launching the WC3 engine.
 */
import type { Unit } from 'war3-objectdata-th';
import type { FakePlayerHandle } from './fake-player';

export interface FakeUnitHandle {
	/** Raw 4-char ID string (e.g. `'u000'`). */
	rawcode: string;
	/** Integer form of the rawcode, matching `GetUnitTypeId()`. */
	typeId: number;
	/** Unit display name from object data. */
	name: string;
	/** Owning player handle. */
	owner: FakePlayerHandle;
	/** World X coordinate. */
	x: number;
	/** World Y coordinate. */
	y: number;
	/** Current hit points. */
	hp: number;
	/** Maximum hit points (from object data). */
	maxHp: number;
	/** Base defense (from object data). */
	defense: number;
	/** Base attack damage (from object data). */
	attackDamage: number;
	/** Base movement speed (from object data). */
	moveSpeed: number;
	/** Whether the unit is alive. */
	alive: boolean;
}

/**
 * Convert a 4-char string to its integer form (matching WC3 `FourCC`).
 *
 * ```
 * fourCCToInt('u000') === FourCC('u000')
 * ```
 */
export function fourCCToInt(s: string): number {
	return ((s.charCodeAt(0) << 24) | (s.charCodeAt(1) << 16) | (s.charCodeAt(2) << 8) | s.charCodeAt(3)) >>> 0;
}

/**
 * Create a fake unit whose stats come from real map object data.
 *
 * ```ts
 * const od = loadMapObjectData();
 * const rifleman = od.units.get('u000')!;
 * const player = createFakePlayer(0);
 * const unit = createFakeUnit(rifleman, player);
 * unit.name  // 'Rifleman'
 * unit.maxHp // 200
 * ```
 */
export function createFakeUnit(unitData: Unit, owner: FakePlayerHandle, overrides?: Partial<FakeUnitHandle>): FakeUnitHandle {
	const rawcode = unitData.newId !== '\0\0\0\0' ? unitData.newId : unitData.oldId;
	return {
		rawcode,
		typeId: fourCCToInt(rawcode),
		name: unitData.name,
		owner,
		x: 0,
		y: 0,
		hp: unitData.hitPointsMaximumBase,
		maxHp: unitData.hitPointsMaximumBase,
		defense: unitData.defenseBase,
		attackDamage: unitData.attack1DamageBase,
		moveSpeed: unitData.speedBase,
		alive: true,
		...overrides,
	};
}
