/**
 * Calculates the appropriate destination Y coordinate when transporting an entity
 * between the east and west boundaries of the world map, maintaining its relative
 * north/south (Y) position proportion.
 *
 * @param enteringY The Y coordinate of the unit before transport
 * @param enterMinY The bottom (min Y) of the enter region
 * @param enterMaxY The top (max Y) of the enter region
 * @param leaveMinY The bottom (min Y) of the destination leave region
 * @param leaveMaxY The top (max Y) of the destination leave region
 * @returns The adapted Y coordinate for the destination region.
 */
export function calculateWrappedYPosition(
	enteringY: number,
	enterMinY: number,
	enterMaxY: number,
	leaveMinY: number,
	leaveMaxY: number
): number {
	const enterHeight = enterMaxY - enterMinY;

	if (enterHeight === 0) {
		const leaveHeight = leaveMaxY - leaveMinY;
		return leaveMinY + leaveHeight / 2;
	}

	let yProgress = (enteringY - enterMinY) / enterHeight;

	// Clamp to 0-1 range to ensure we don't inadvertently place them
	// outside the enter/leave zones if they leaked past bounds somehow.
	yProgress = Math.max(0, Math.min(1, yProgress));

	const leaveHeight = leaveMaxY - leaveMinY;
	return leaveMinY + yProgress * leaveHeight;
}
