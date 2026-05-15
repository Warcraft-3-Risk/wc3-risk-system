import { describe, expect, it } from 'vitest';
import { createCityBuildingName } from '../src/app/city/city-display-name';

describe('createCityBuildingName', () => {
	it('adds full relative position and quality suffixes to city building names', () => {
		expect(createCityBuildingName({ name: 'Berlin', slot: 'NE', quality: 'F' })).toBe('Berlin NE/F');
	});

	it('supports city building names with only one suffix part', () => {
		expect(createCityBuildingName({ name: 'Douglas', quality: 'B' })).toBe('Douglas B');
		expect(createCityBuildingName({ name: 'Paris', slot: 'W' })).toBe('Paris W');
	});

	it('does not override existing editor names when city data has no name', () => {
		expect(createCityBuildingName({ slot: 'NW', quality: 'C' })).toBeUndefined();
	});
});
