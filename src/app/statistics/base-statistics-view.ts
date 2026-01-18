/**
 * Interface defining the common API for statistics views
 * Both RankedStatisticsView and UnrankedStatisticsView implement this interface
 */
export interface IStatisticsView {
	/**
	 * Set the visibility of the statistics board
	 * @param isVisible Whether to show or hide the board
	 */
	setVisibility(isVisible: boolean): void;

	/**
	 * Set the visibility of the statistics board for a specific player
	 * Uses GetLocalPlayer() check to only affect the specified player
	 * @param isVisible Whether to show or hide the board
	 * @param player The player to set visibility for
	 */
	setVisibilityForPlayer(isVisible: boolean, player: player): void;

	/**
	 * Set the played time text in the header
	 * @param time Formatted time string
	 */
	setPlayedTimeText(time: string): void;

	/**
	 * Set the game winner text in the header
	 * @param playerName Winner's display name
	 */
	setGameWinnerText(playerName: string): void;

	/**
	 * Get the minimize button text for the trigger player
	 * @returns 'Minimize' or 'Maximize'
	 */
	getMinimizeButtonText(): string;

	/**
	 * Refresh all row data based on current column configurations
	 */
	refreshRows(): void;

	/**
	 * Register a callback for minimize button clicks
	 * @param callback Function to call when button is clicked
	 */
	setMinimizeButtonClickEvent(callback: () => void): void;

	/**
	 * Show statistics for a specific player (maximize view)
	 * @param player The player to show stats for
	 */
	showStats(player: player): void;

	/**
	 * Hide statistics for a specific player (minimize view)
	 * @param player The player to hide stats for
	 */
	hideStats(player: player): void;
}
