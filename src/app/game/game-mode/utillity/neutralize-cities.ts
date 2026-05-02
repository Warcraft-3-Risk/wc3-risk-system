import { CityToCountry } from 'src/app/country/country-map';
import { UnitToCity } from 'src/app/city/city-map';
import { Wait } from 'src/app/utils/wait';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { debugPrint } from 'src/app/utils/debug-print';
import { DC, DEBUG_PRINTS } from 'src/configs/game-settings';

/**
 * Neutralizes all cities in batches.
 * This clears out unit training queues by changing city ownership to Neutral Hostile,
 * and removes the guards up front so they are not hanging around during unit removal.
 * Proceeding this before `removeUnits` prevents newly trained units from being missed.
 */
export async function neutralizeCities(batchSize = 25, intervalSeconds = 0.1): Promise<void> {
	if (DEBUG_PRINTS.master) debugPrint(`[ResetState] Neutralizing cities in batches of ${batchSize}`, DC.gameMode);

	let batchCount = 0;

	for (const [city] of CityToCountry) {
		if (city.getOwner() === NEUTRAL_HOSTILE) continue;

		// Change ownership to neutral to cancel active training queues
		city.barrack.reset();
		SetUnitOwner(city.cop, NEUTRAL_HOSTILE, true);

		// Remove the guard up-front
		if (city.guard.unit) {
			UnitToCity.delete(city.guard.unit);
		}
		city.guard.remove();

		batchCount++;
		if (batchCount >= batchSize) {
			batchCount = 0;
			await Wait.forSeconds(intervalSeconds);
		}
	}
}
