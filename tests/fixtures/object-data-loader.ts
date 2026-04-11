/**
 * Loads WC3 map object data from the exploded map directory.
 *
 * Uses `war3-objectdata-th` + `mdx-m3-viewer-th` to parse the binary `.w3u`
 * file from `maps/risk_europe.w3x/` (the canonical terrain source) into
 * typed `Unit` objects with real stats (name, HP, attack, defense, etc.).
 *
 * The result is cached after the first call so tests share a single load.
 */
import { readFileSync } from 'fs';
import * as path from 'path';
import War3MapW3u from 'mdx-m3-viewer-th/dist/cjs/parsers/w3x/w3u/file';
import { ObjectData } from 'war3-objectdata-th';

let cached: ObjectData | undefined = undefined;

/** Root of the canonical map source (europe = master). */
const MAP_DIR = path.resolve(__dirname, '../../maps/risk_europe.w3x');

/**
 * Load and cache the map's object data.
 *
 * Currently loads only the unit modification file (`war3map.w3u`) because
 * the ability/buff skin files in this map trigger edge-case parser errors
 * in `war3-objectdata-th`. Unit data is the primary need for fake-unit
 * fixtures. Additional file types can be added as the library is patched.
 *
 * @throws {Error} If the map file cannot be found or parsed. Ensure the
 * `maps/risk_europe.w3x/` directory exists and contains `war3map.w3u`.
 */
export function loadMapObjectData(): ObjectData {
	if (cached) return cached;

	const w3uPath = path.join(MAP_DIR, 'war3map.w3u');
	let buffer: Buffer;
	try {
		buffer = readFileSync(w3uPath);
	} catch {
		throw new Error(`Failed to read map object data at ${w3uPath}. Ensure maps/risk_europe.w3x/ exists and contains war3map.w3u.`);
	}

	const w3u = new War3MapW3u();
	w3u.load(buffer.buffer);

	const objectData = new ObjectData();
	objectData.load({ w3u });

	cached = objectData;
	return objectData;
}

/**
 * Return the list of all custom unit IDs present in the map.
 */
export function getMapUnitIds(): string[] {
	const od = loadMapObjectData();
	return Object.keys(od.units.map);
}
