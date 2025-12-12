import { MAP_TYPE } from 'src/app/utils/map-info';
import { SetCountriesAsia } from './terrains/asia';
import { SetCountriesEurope } from './terrains/europe';
import { SetCountriesWorld } from './terrains/world';

/**
 * Dynamically loads the appropriate terrain configuration based on MAP_TYPE
 * This function is called during game initialization to set up countries and cities
 *
 * The MAP_TYPE constant is injected during the build process from the config file
 * in the maps directory (maps/risk_europe.json or maps/risk_world.json).
 *
 * To add a new terrain:
 * 1. Create a new config file: maps/risk_your_terrain.json
 * 2. Create a new map folder: maps/risk_your_terrain.w3x/
 * 3. Create a new terrain file: src/configs/terrains/your_terrain.ts
 * 4. Add a case for it in the switch statement below
 */
export function SetCountries() {
	switch (MAP_TYPE) {
		case 'asia':
			SetCountriesAsia();
			break;
		case 'europe':
			SetCountriesEurope();
			break;
		case 'world':
			SetCountriesWorld();
			break;
		default:
			throw new Error(`Unknown map type: ${MAP_TYPE}. Expected 'asia', 'europe', or 'world'.`);
	}
}
