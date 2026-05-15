import { type LabelMode } from '../player/options';
import { HexColors } from '../utils/hex-colors';

export interface CountryLabelMetadata {
	name: string;
	cityCount: number;
}

export interface CountryLabelText {
	text: string;
	visibleLength: number;
}

export function createCountryLabelText(country: CountryLabelMetadata, mode: LabelMode): CountryLabelText {
	if (mode === 'cityName') {
		return {
			text: `${HexColors.TANGERINE} ${country.name} `,
			visibleLength: country.name.length,
		};
	}

	const cityCountText = ` +${country.cityCount} `;

	return {
		text: `${HexColors.TANGERINE} ${country.name}${cityCountText}`,
		visibleLength: country.name.length + cityCountText.length,
	};
}
