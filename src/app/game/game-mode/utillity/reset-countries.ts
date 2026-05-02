import { StringToCountry } from 'src/app/country/country-map';
import { Wait } from 'src/app/utils/wait';

/**
 * Resets all countries in batches to avoid a single-frame lag spike.
 * Each country reset involves multiple WC3 API calls (RemoveUnit,
 * CreateUnit, SetUnitOwner) per city, so yielding between batches
 * spreads the cost across frames.
 */
export async function resetCountries(batchSize = 20, intervalSeconds = 0.2): Promise<void> {
	let cityCount = 0;

	for (const country of StringToCountry.values()) {
		const cities = country.getCities();
		for (let j = 0; j < cities.length; j++) {
			cities[j].reset();

			cityCount++;
			if (cityCount >= batchSize) {
				cityCount = 0;
				await Wait.forSeconds(intervalSeconds);
			}
		}

		// After cities are done, reset the country's spawn and owner logic
		country.reset();
	}
}
