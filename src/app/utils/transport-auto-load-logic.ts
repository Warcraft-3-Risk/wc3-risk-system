export interface TransportAutoLoadContext {
	duration: number;
	cargoCount: number;
	autoloadEnabled: boolean;
	isTerrainInvalid: boolean;

	handleAutoLoadOff(): void;
	castAutoLoad(): void;
}

export class TransportAutoLoadLogic {
	/**
	 * Handles a single tick for an auto-loading transport.
	 * Executes the auto-load scan, decrements the duration, and turns off
	 * auto-load if completion conditions or limits are reached.
	 */
	public static handleAutoLoadTick(ctx: TransportAutoLoadContext): void {
		ctx.castAutoLoad();
		ctx.duration--;

		if (ctx.cargoCount >= 10 || !ctx.autoloadEnabled || ctx.isTerrainInvalid || ctx.duration <= 0) {
			ctx.handleAutoLoadOff();
		}
	}
}
