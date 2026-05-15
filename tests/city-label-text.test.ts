import { describe, expect, it } from 'vitest';
import { createCityLabelText } from '../src/app/managers/city-label-text';
import { HexColors } from '../src/app/utils/hex-colors';

describe('createCityLabelText', () => {
	const berlin = {
		name: 'Berlin',
		slot: 'NE',
		quality: 'F',
	};

	it('renders plain city names for the default mode', () => {
		expect(createCityLabelText(berlin, 'cityName')).toEqual({
			text: `${HexColors.WHITE}Berlin`,
			visibleLength: 6,
		});
	});

	it('renders city quality without relative position', () => {
		expect(createCityLabelText(berlin, 'cityQuality')).toEqual({
			text: `${HexColors.WHITE}Berlin${HexColors.TANGERINE} F`,
			visibleLength: 8,
		});
	});

	it('renders city position and quality for full labels', () => {
		expect(createCityLabelText(berlin, 'all')).toEqual({
			text: `${HexColors.WHITE}Berlin${HexColors.TANGERINE} NE/F`,
			visibleLength: 11,
		});
	});

	it('omits the slash when a full label has no slot', () => {
		expect(createCityLabelText({ name: 'Douglas', quality: 'B' }, 'all')).toEqual({
			text: `${HexColors.WHITE}Douglas${HexColors.TANGERINE} B`,
			visibleLength: 9,
		});
	});

	it('omits suffix spacing when quality is missing', () => {
		expect(createCityLabelText({ name: 'Test City' }, 'cityQuality')).toEqual({
			text: `${HexColors.WHITE}Test City`,
			visibleLength: 9,
		});
	});
});
