import { describe, expect, it } from 'vitest';
import { createCountryLabelText } from '../src/app/managers/country-label-text';
import { HexColors } from '../src/app/utils/hex-colors';

describe('createCountryLabelText', () => {
	const germany = {
		name: 'Germany',
		cityCount: 6,
	};

	it('renders country names without suffixes in the default city-name mode', () => {
		expect(createCountryLabelText(germany, 'cityName')).toEqual({
			text: `${HexColors.TANGERINE} Germany `,
			visibleLength: 7,
		});
	});

	it('keeps city-count suffixes in city quality mode', () => {
		expect(createCountryLabelText(germany, 'cityQuality')).toEqual({
			text: `${HexColors.TANGERINE} Germany +6 `,
			visibleLength: 11,
		});
	});

	it('keeps city-count suffixes in full city suffix mode', () => {
		expect(createCountryLabelText(germany, 'all')).toEqual({
			text: `${HexColors.TANGERINE} Germany +6 `,
			visibleLength: 11,
		});
	});

	it('keeps city-count suffixes in country-only mode', () => {
		expect(createCountryLabelText(germany, 'country')).toEqual({
			text: `${HexColors.TANGERINE} Germany +6 `,
			visibleLength: 11,
		});
	});
});
