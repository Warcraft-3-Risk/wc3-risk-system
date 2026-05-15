import { describe, expect, it } from 'vitest';
import { isObserverLabelSlot, shouldShowCityLabels, shouldShowCountryLabels } from '../src/app/managers/label-visibility';

describe('label visibility', () => {
	it('lets players toggle country labels only', () => {
		expect(shouldShowCountryLabels({ playerId: 0, countryLabels: true })).toBe(true);
		expect(shouldShowCountryLabels({ playerId: 0, countryLabels: false })).toBe(false);
		expect(shouldShowCityLabels({ playerId: 0, countryLabels: true })).toBe(false);
	});

	it('always shows country and city labels for observer slot 23', () => {
		expect(isObserverLabelSlot(23)).toBe(true);
		expect(shouldShowCountryLabels({ playerId: 23, countryLabels: false })).toBe(true);
		expect(shouldShowCityLabels({ playerId: 23, countryLabels: false })).toBe(true);
	});

	it('uses WC3 observer status when observer handles are outside player slot 23', () => {
		expect(shouldShowCountryLabels({ playerId: 24, isObserver: true, countryLabels: false })).toBe(true);
		expect(shouldShowCityLabels({ playerId: 24, isObserver: true, countryLabels: false })).toBe(true);
	});

	it('does not treat adjacent player slots as observer slot 23', () => {
		expect(isObserverLabelSlot(22)).toBe(false);
		expect(isObserverLabelSlot(24)).toBe(false);
	});
});
