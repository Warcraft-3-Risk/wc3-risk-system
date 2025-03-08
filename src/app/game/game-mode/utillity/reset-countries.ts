import { StringToCountry } from 'src/app/country/country-map';

export function resetCountries(): void {
	StringToCountry.forEach((country) => {
		country.reset();
	});
}
