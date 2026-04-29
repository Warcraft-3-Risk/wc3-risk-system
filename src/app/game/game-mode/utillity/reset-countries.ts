import { StringToCountry } from 'src/app/country/country-map';
import { Wait } from 'src/app/utils/wait';

/**
 * Resets all countries in batches to avoid a single-frame lag spike.
 * Each country reset involves multiple WC3 API calls (RemoveUnit,
 * CreateUnit, SetUnitOwner) per city, so yielding between batches
 * spreads the cost across frames.
 */
export async function resetCountries(batchSize = 5, intervalSeconds = 0.1): Promise<void> {
	const countries = Array.from(StringToCountry.values());

	for (let i = 0; i < countries.length; i += batchSize) {
		const end = Math.min(i + batchSize, countries.length);

		for (let j = i; j < end; j++) {
			countries[j].reset();
		}

		if (end < countries.length) {
			await Wait.forSeconds(intervalSeconds);
		}
	}
}
