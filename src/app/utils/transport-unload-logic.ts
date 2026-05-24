export interface TransportUnloadContext {
	transportInvalidTerrain: boolean;
	abilityTargetX: number;
	abilityTargetY: number;
	actualTargetX: number;
	actualTargetY: number;
	targetTerrainInvalid: boolean;

	stopAndError(): void;
}

export class TransportUnloadLogic {
	/**
	 * Validates whether the transport is allowed to unload at the target location.
	 * Handled constraints:
	 * - If transport is on valid terrain (pebble), unloading is always allowed.
	 * - If transport is on invalid terrain (ocean), it must unload within a small range
	 *   (MAX_UNLOAD_DISTANCE = 300) and the target point must be on valid terrain.
	 *
	 * @returns True if the unload action is valid, False otherwise.
	 */
	public static validateUnload(ctx: TransportUnloadContext): boolean {
		if (ctx.transportInvalidTerrain) {
			const dx = ctx.abilityTargetX - ctx.actualTargetX;
			const dy = ctx.abilityTargetY - ctx.actualTargetY;
			const distSq = dx * dx + dy * dy;

			// MAX_UNLOAD_DISTANCE = 300, therefore 300^2 = 90000
			if (distSq > 90000) {
				ctx.stopAndError();
				return false;
			} else if (ctx.targetTerrainInvalid) {
				ctx.stopAndError();
				return false;
			}
		}

		return true;
	}
}
