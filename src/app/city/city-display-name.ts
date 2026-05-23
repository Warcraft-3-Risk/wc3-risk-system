export interface CityDisplayNameMetadata {
	name?: string;
	slot?: string;
	quality?: string;
}

export function createCityBuildingName(city: CityDisplayNameMetadata): string | undefined {
	if (!city.name) {
		return undefined;
	}

	const slotText = city.slot ? ` ${city.slot}` : '';
	const qualityText = city.quality ? `${city.slot ? '/' : ' '}${city.quality}` : '';

	return `${city.name}${slotText}${qualityText}`;
}
