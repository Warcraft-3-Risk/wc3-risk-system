import { HexColors } from '../utils/hex-colors';

export interface CountryLabelMetadata {
	name: string;
}

export interface CountryLabelText {
	text: string;
	visibleLength: number;
}

export function createCountryLabelText(country: CountryLabelMetadata): CountryLabelText {
	return {
		text: `${HexColors.TANGERINE} ${country.name} `,
		visibleLength: country.name.length,
	};
}
