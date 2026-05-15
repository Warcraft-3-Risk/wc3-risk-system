import { describe, expect, it } from 'vitest';
import { createCountryLabelText } from '../src/app/managers/country-label-text';
import { HexColors } from '../src/app/utils/hex-colors';

describe('createCountryLabelText', () => {
	const germany = {
		name: 'Germany',
	};

	it('renders country names without suffixes', () => {
		expect(createCountryLabelText(germany)).toEqual({
			text: `${HexColors.TANGERINE} Germany `,
			visibleLength: 7,
		});
	});
});
