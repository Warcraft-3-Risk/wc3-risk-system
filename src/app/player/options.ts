export type Options = {
	health: boolean;
	value: boolean;
	ping: boolean;
	board: number;
	labels: boolean;
	// Note: showRating preference is now stored in the rating file itself
	// via RatingManager.getShowRatingPreference() / setShowRatingPreference()
};
