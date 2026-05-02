import { CityToCountry } from 'src/app/country/country-map';
import { UnitToCity } from 'src/app/city/city-map';
import { Wait } from 'src/app/utils/wait';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { debugPrint } from 'src/app/utils/debug-print';
import { DC, DEBUG_PRINTS } from 'src/configs/game-settings';
import { ORDER_ID } from 'src/configs/order-id';

/**
 * Neutralizes all cities in batches.
 * This clears out unit training queues by issuing a cancel order (ORDER_ID.CANCEL).
 * By combining this with EVENT_UNIT_TRAIN_START listener, remaining queued
 * units will also cascade cancel.
 * Proceeding this before `removeUnits` prevents newly trained units from being missed.
 */
export async function neutralizeCities(batchSize = 25, intervalSeconds = 0.1): Promise<void> {
	if (DEBUG_PRINTS.master) debugPrint(`[ResetState] Neutralizing cities in batches of ${batchSize}`, DC.gameMode);

	let batchCount = 0;

	for (const [city] of CityToCountry) {
		if (city.getOwner() === NEUTRAL_HOSTILE) continue;

		// Cancel active training queues
		// The cascade effect relies on unit-train-start-event handling subsequent queue items
		IssueImmediateOrderById(city.barrack.unit, ORDER_ID.CANCEL);

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
