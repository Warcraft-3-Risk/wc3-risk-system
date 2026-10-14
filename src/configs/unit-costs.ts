import { UNIT_ID } from './unit-id';

/**
 * Gold cost of each trainable unit, copied from the object editor (risk_europe.w3x).
 * Map scripts cannot read gold costs at runtime, so keep this in sync if costs change.
 * Used by the Reserves game type (deploy budget) and the Arena game type (army budget).
 */
export const UNIT_GOLD_COSTS: Map<number, number> = new Map([
	[UNIT_ID.RIFLEMEN, 1],
	[UNIT_ID.MEDIC, 2],
	[UNIT_ID.MORTAR, 3],
	[UNIT_ID.ROARER, 4],
	[UNIT_ID.KNIGHT, 5],
	[UNIT_ID.GENERAL, 10],
	[UNIT_ID.ARTILLERY, 15],
	[UNIT_ID.TANK, 25],
	[UNIT_ID.MARINE, 1],
	[UNIT_ID.CAPTAIN, 5],
	[UNIT_ID.WARSHIP_A, 5],
	[UNIT_ID.WARSHIP_B, 20],
	[UNIT_ID.BATTLESHIP_SS, 45],
]);
