export class TransportTooltipLogic {
	/**
	 * Formats the tooltip text for a transport's cargo.
	 */
	public static getTooltipText(current: number, max: number): string {
		return `${current}/${max}`;
	}

	/**
	 * Determines if a tooltip is visible based on local player observer-status and screen bounds.
	 */
	public static isVisible(isObserver: boolean, isOnScreen: boolean, sy: number, currentCargoCount: number): boolean {
		// WC3 bottom console area is roughly 0.13 in UI coordinates.
		// If the tooltip anchors at sy - 0.025, we want to hide it if sy < 0.16
		return isObserver && isOnScreen && sy >= 0.16 && currentCargoCount > 0;
	}
}
