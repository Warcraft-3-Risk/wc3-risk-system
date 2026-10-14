import { MAP_TYPE } from 'src/app/utils/map-info';
import { UNIT_ID } from './unit-id';

/**
 * An Arena game type battlefield: one country, with one city for each of the two players.
 * Units are kept inside the area painted with the country's own terrain.
 */
export interface ArenaData {
	/** Country name, as in the terrain config (src/configs/terrains). */
	country: string;
	/** Names of the two spawn cities, one per player - ideally at opposite ends of the country. */
	cities: [string, string];
	/**
	 * Optional direction (degrees, 0 = east, 90 = north, 270 = south) to spawn a city's army in, by city name.
	 * By default the army spawns towards the enemy city - use this where that side of the city is blocked.
	 */
	spawnDirections?: Record<string, number>;
}

/** One part of an arena army: this many units of this type. */
export interface ArenaArmyEntry {
	typeId: number;
	count: number;
}

/** Arenas per terrain, played in rotation. A terrain without arenas cannot play the Arena game type. */
const ARENAS_BY_TERRAIN: Record<string, ArenaData[]> = {
	europe: [
		{ country: 'Algeria', cities: ['Oran', 'Constantine'] },
		{ country: 'Jordan', cities: ['Aqaba', 'Maan'] },
		{ country: 'Volga', cities: ['Kazan', 'Samara'] },
		{ country: 'Arkhangelsk', cities: ['Arkhangelsk', 'Kotlas'] },
		// Nuuk is boxed in by trees towards Qaanaaq, so its army spawns south of the city
		{ country: 'West Greenland', cities: ['Qaanaaq', 'Nuuk'], spawnDirections: { Nuuk: 270 } },
		{ country: 'Poland', cities: ['Wroclaw', 'Krakow'] },
		{ country: 'Northern Italy', cities: ['Milan', 'Florence'] },
		{ country: 'Spain', cities: ['Madrid', 'Seville'] },
		{ country: 'Iceland', cities: ['Akureyri', 'Reykjavik'] },
		{ country: 'Norway', cities: ['Bergen', 'Trondheim'] },
		{ country: 'Ireland', cities: ['Cork', 'Dublin'] },
	],
	asia: [],
};

export function getArenas(): ArenaData[] {
	return ARENAS_BY_TERRAIN[MAP_TYPE] || [];
}

/**
 * The armies an arena round can be played with. Each round picks one at random (never the same one twice in a row)
 * and every player gets exactly that army.
 */
export const ARENA_ARMIES: ArenaArmyEntry[][] = [
	[{ typeId: UNIT_ID.TANK, count: 5 }],
	[
		{ typeId: UNIT_ID.TANK, count: 5 },
		{ typeId: UNIT_ID.ROARER, count: 1 },
	],
	[
		{ typeId: UNIT_ID.RIFLEMEN, count: 20 },
		{ typeId: UNIT_ID.MEDIC, count: 2 },
		{ typeId: UNIT_ID.ROARER, count: 1 },
	],
	[
		{ typeId: UNIT_ID.GENERAL, count: 1 },
		{ typeId: UNIT_ID.RIFLEMEN, count: 10 },
		{ typeId: UNIT_ID.MEDIC, count: 1 },
		{ typeId: UNIT_ID.ROARER, count: 1 },
	],
	[{ typeId: UNIT_ID.RIFLEMEN, count: 10 }],
	[
		{ typeId: UNIT_ID.ARTILLERY, count: 1 },
		{ typeId: UNIT_ID.RIFLEMEN, count: 10 },
		{ typeId: UNIT_ID.MEDIC, count: 1 },
		{ typeId: UNIT_ID.ROARER, count: 1 },
	],
	[{ typeId: UNIT_ID.ARTILLERY, count: 3 }],
	[
		{ typeId: UNIT_ID.KNIGHT, count: 1 },
		{ typeId: UNIT_ID.RIFLEMEN, count: 5 },
		{ typeId: UNIT_ID.MEDIC, count: 1 },
	],
	[
		{ typeId: UNIT_ID.KNIGHT, count: 2 },
		{ typeId: UNIT_ID.RIFLEMEN, count: 3 },
	],
	[
		{ typeId: UNIT_ID.RIFLEMEN, count: 10 },
		{ typeId: UNIT_ID.MORTAR, count: 5 },
	],
	[
		{ typeId: UNIT_ID.MARINE, count: 8 },
		// u009 - shown as "Major" in game
		{ typeId: UNIT_ID.CAPTAIN, count: 1 },
	],
	[
		{ typeId: UNIT_ID.MARINE, count: 5 },
		{ typeId: UNIT_ID.ROARER, count: 1 },
	],
	[
		{ typeId: UNIT_ID.RIFLEMEN, count: 6 },
		{ typeId: UNIT_ID.MARINE, count: 6 },
	],
	[
		{ typeId: UNIT_ID.KNIGHT, count: 4 },
		{ typeId: UNIT_ID.MEDIC, count: 1 },
	],
	[
		{ typeId: UNIT_ID.TANK, count: 2 },
		{ typeId: UNIT_ID.RIFLEMEN, count: 8 },
		{ typeId: UNIT_ID.MEDIC, count: 1 },
	],
	[
		{ typeId: UNIT_ID.ARTILLERY, count: 2 },
		{ typeId: UNIT_ID.RIFLEMEN, count: 10 },
	],
	[
		{ typeId: UNIT_ID.MORTAR, count: 6 },
		{ typeId: UNIT_ID.RIFLEMEN, count: 6 },
	],
	[
		{ typeId: UNIT_ID.TANK, count: 1 },
		{ typeId: UNIT_ID.KNIGHT, count: 2 },
		{ typeId: UNIT_ID.RIFLEMEN, count: 5 },
	],
	[
		{ typeId: UNIT_ID.GENERAL, count: 2 },
		{ typeId: UNIT_ID.RIFLEMEN, count: 8 },
	],
	[
		{ typeId: UNIT_ID.RIFLEMEN, count: 15 },
		{ typeId: UNIT_ID.MEDIC, count: 3 },
	],
	[
		{ typeId: UNIT_ID.ROARER, count: 3 },
		{ typeId: UNIT_ID.RIFLEMEN, count: 6 },
	],
	[
		{ typeId: UNIT_ID.TANK, count: 1 },
		{ typeId: UNIT_ID.ARTILLERY, count: 1 },
		{ typeId: UNIT_ID.GENERAL, count: 1 },
	],
];
