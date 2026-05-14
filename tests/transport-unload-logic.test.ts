import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransportUnloadLogic, TransportUnloadContext } from '../src/app/utils/transport-unload-logic';

describe('TransportUnloadLogic', () => {
	let ctx: TransportUnloadContext;

	beforeEach(() => {
		ctx = {
			transportInvalidTerrain: false,
			abilityTargetX: 0,
			abilityTargetY: 0,
			actualTargetX: 0,
			actualTargetY: 0,
			targetTerrainInvalid: false,
			stopAndError: vi.fn(),
		};
	});

	it('should allow unload if transport is on valid terrain', () => {
		ctx.transportInvalidTerrain = false;
		const result = TransportUnloadLogic.validateUnload(ctx);
		expect(result).toBe(true);
		expect(ctx.stopAndError).not.toHaveBeenCalled();
	});

	it('should allow unload if on invalid terrain but target is valid and close', () => {
		ctx.transportInvalidTerrain = true;
		ctx.abilityTargetX = 100;
		ctx.actualTargetX = 0; // distance 100 -> distSq 10000 (< 90000)
		ctx.targetTerrainInvalid = false;

		const result = TransportUnloadLogic.validateUnload(ctx);
		expect(result).toBe(true);
		expect(ctx.stopAndError).not.toHaveBeenCalled();
	});

	it('should deny unload and show error if distance > 300 on invalid terrain', () => {
		ctx.transportInvalidTerrain = true;
		ctx.abilityTargetX = 400;
		ctx.actualTargetX = 0; // distance 400 -> distSq 160000 (> 90000)

		const result = TransportUnloadLogic.validateUnload(ctx);
		expect(result).toBe(false);
		expect(ctx.stopAndError).toHaveBeenCalled();
	});

	it('should deny unload and show error if distance <= 300 but target terrain is invalid', () => {
		ctx.transportInvalidTerrain = true;
		ctx.abilityTargetX = 100;
		ctx.actualTargetX = 0; // distance 100 -> distSq 10000 (< 90000)
		ctx.targetTerrainInvalid = true;

		const result = TransportUnloadLogic.validateUnload(ctx);
		expect(result).toBe(false);
		expect(ctx.stopAndError).toHaveBeenCalled();
	});
});
