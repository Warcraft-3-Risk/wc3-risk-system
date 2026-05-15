import { type LabelMode } from '../player/options';
import { HexColors } from '../utils/hex-colors';

export type CityLabelTextMode = Extract<LabelMode, 'cityName' | 'cityQuality' | 'all'>;

export interface CityLabelMetadata {
	name: string;
	slot?: string;
	quality?: string;
}

export interface CityLabelText {
	text: string;
	visibleLength: number;
}

export function createCityLabelText(city: CityLabelMetadata, mode: CityLabelTextMode): CityLabelText {
	if (mode === 'cityName') {
		return {
			text: `${HexColors.WHITE}${city.name}`,
			visibleLength: city.name.length,
		};
	}

	if (mode === 'cityQuality') {
		const qualityText = city.quality ? ` ${city.quality}` : '';

		return {
			text: `${HexColors.WHITE}${city.name}${qualityText ? `${HexColors.TANGERINE}${qualityText}` : ''}`,
			visibleLength: city.name.length + qualityText.length,
		};
	}

	const slotText = city.slot ? ` ${city.slot}` : '';
	const qualityText = city.quality ? `${city.slot ? '/' : ' '}${city.quality}` : '';
	const suffixText = `${slotText}${qualityText}`;

	return {
		text: `${HexColors.WHITE}${city.name}${suffixText ? `${HexColors.TANGERINE}${suffixText}` : ''}`,
		visibleLength: city.name.length + suffixText.length,
	};
}
