export const DefaultCountryLabels = true;

export function normalizeCountryLabels(value?: string): boolean {
	if (value === 'false' || value === 'none') {
		return false;
	}

	return DefaultCountryLabels;
}

export function getCountryLabelsText(value: boolean): string {
	return value ? 'On' : 'Off';
}

export type Options = {
	health: boolean;
	value: boolean;
	ping: boolean;
	board: number;
	countryLabels: boolean;
	colorblind: boolean;
	colorContrast: boolean;
	cameraPan: boolean;
	// Note: showRating preference is now stored in the rating file itself
	// via RatingManager.getShowRatingPreference() / setShowRatingPreference()
};
