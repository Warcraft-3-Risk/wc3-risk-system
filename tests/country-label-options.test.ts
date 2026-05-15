import { describe, expect, it } from 'vitest';
import { DefaultCountryLabels, getCountryLabelsText, normalizeCountryLabels } from '../src/app/player/options';

describe('country label options', () => {
	it('defaults country labels on for players', () => {
		expect(DefaultCountryLabels).toBe(true);
		expect(normalizeCountryLabels(undefined)).toBe(true);
	});

	it('keeps disabled saved preferences backward compatible', () => {
		expect(normalizeCountryLabels('false')).toBe(false);
		expect(normalizeCountryLabels('none')).toBe(false);
	});

	it('treats prior visible label modes as country labels on', () => {
		expect(normalizeCountryLabels('true')).toBe(true);
		expect(normalizeCountryLabels('cityName')).toBe(true);
		expect(normalizeCountryLabels('cityQuality')).toBe(true);
		expect(normalizeCountryLabels('all')).toBe(true);
		expect(normalizeCountryLabels('country')).toBe(true);
	});

	it('describes the two F8 country label states', () => {
		expect(getCountryLabelsText(true)).toBe('On');
		expect(getCountryLabelsText(false)).toBe('Off');
	});
});
