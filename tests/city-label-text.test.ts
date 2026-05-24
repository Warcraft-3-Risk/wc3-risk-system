import { describe, expect, it } from 'vitest';
import { createCityLabelText } from '../src/app/managers/city-label-text';
import { HexColors } from '../src/app/utils/hex-colors';

describe('createCityLabelText', () => {
	const berlin = {
		name: 'Berlin',
		slot: 'NE',
		quality: 'F',
	};

	it('renders city names with quality suffixes for observer labels', () => {
		expect(createCityLabelText(berlin)).toEqual({
			text: `${HexColors.WHITE}Berlin${HexColors.TANGERINE} F`,
			visibleLength: 8,
		});
	});

	it('omits relative position in city texttags', () => {
		expect(createCityLabelText({ name: 'Douglas', slot: 'NW', quality: 'B' })).toEqual({
			text: `${HexColors.WHITE}Douglas${HexColors.TANGERINE} B`,
			visibleLength: 9,
		});
	});

	it('omits suffix spacing when quality is missing', () => {
		expect(createCityLabelText({ name: 'Test City' })).toEqual({
			text: `${HexColors.WHITE}Test City`,
			visibleLength: 9,
		});
	});
});
