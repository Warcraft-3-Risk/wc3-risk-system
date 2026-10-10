export class TransportTooltipLogic {
	/**
	 * Formats the cargo indicator text for a transport: just the number of units aboard.
	 */
	public static getTooltipText(current: number): string {
		return `${current}`;
	}

	/**
	 * Determines whether the cargo indicator should be shown.
	 *
	 * Unlike a frame-based tooltip this is rendered as a world text tag, so there is no need to
	 * test screen bounds - the engine culls it off-screen and it never overlaps the bottom console.
	 */
	public static isVisible(isObserver: boolean, currentCargoCount: number): boolean {
		return isObserver && currentCargoCount > 0;
	}
}
