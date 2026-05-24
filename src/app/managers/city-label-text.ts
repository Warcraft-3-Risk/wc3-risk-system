import { HexColors } from '../utils/hex-colors';

export interface CityLabelMetadata {
	name: string;
	slot?: string;
	quality?: string;
}

export interface CityLabelText {
	text: string;
	visibleLength: number;
}

export function createCityLabelText(city: CityLabelMetadata): CityLabelText {
	const qualityText = city.quality ? ` ${city.quality}` : '';

	return {
		text: `${HexColors.WHITE}${city.name}${qualityText ? `${HexColors.TANGERINE}${qualityText}` : ''}`,
		visibleLength: city.name.length + qualityText.length,
	};
}
