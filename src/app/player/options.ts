export type LabelMode = 'cityName' | 'cityQuality' | 'all' | 'country' | 'none';

export const DefaultLabelMode: LabelMode = 'cityName';

export function normalizeLabelMode(value?: string): LabelMode {
	if (value === 'cityName' || value === 'cityQuality' || value === 'all' || value === 'country' || value === 'none') {
		return value;
	}

	if (value === 'false') {
		return 'none';
	}

	return DefaultLabelMode;
}

export function getNextLabelMode(value: LabelMode): LabelMode {
	if (value === 'cityName') {
		return 'cityQuality';
	}

	if (value === 'cityQuality') {
		return 'all';
	}

	if (value === 'all') {
		return 'country';
	}

	if (value === 'country') {
		return 'none';
	}

	return DefaultLabelMode;
}

export function getLabelModeText(value: LabelMode): string {
	if (value === 'cityName') {
		return 'Country and City Names';
	}

	if (value === 'cityQuality') {
		return 'Country and City Quality';
	}

	if (value === 'all') {
		return 'Country and City Position/Quality';
	}

	if (value === 'country') {
		return 'Country Only';
	}

	return 'Hidden';
}

export type Options = {
	health: boolean;
	value: boolean;
	ping: boolean;
	board: number;
	labelMode: LabelMode;
	colorblind: boolean;
	colorContrast: boolean;
	// Note: showRating preference is now stored in the rating file itself
	// via RatingManager.getShowRatingPreference() / setShowRatingPreference()
};
