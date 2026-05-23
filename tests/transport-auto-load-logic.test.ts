import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransportAutoLoadLogic, TransportAutoLoadContext } from '../src/app/utils/transport-auto-load-logic';

describe('TransportAutoLoadLogic', () => {
	let ctx: TransportAutoLoadContext;

	beforeEach(() => {
		ctx = {
			duration: 10,
			cargoCount: 5,
			autoloadEnabled: true,
			isTerrainInvalid: false,
			handleAutoLoadOff: vi.fn(),
			castAutoLoad: vi.fn(),
		};
	});

	it('should cast auto load and decrement duration', () => {
		TransportAutoLoadLogic.handleAutoLoadTick(ctx);

		expect(ctx.castAutoLoad).toHaveBeenCalled();
		expect(ctx.duration).toBe(9);
		expect(ctx.handleAutoLoadOff).not.toHaveBeenCalled();
	});

	it('should turn off auto load if cargo is full (>= 10)', () => {
		ctx.cargoCount = 10;
		TransportAutoLoadLogic.handleAutoLoadTick(ctx);

		expect(ctx.castAutoLoad).toHaveBeenCalled();
		expect(ctx.duration).toBe(9);
		expect(ctx.handleAutoLoadOff).toHaveBeenCalled();
	});

	it('should turn off auto load if autoloadEnabled becomes false', () => {
		ctx.autoloadEnabled = false;
		TransportAutoLoadLogic.handleAutoLoadTick(ctx);

		expect(ctx.handleAutoLoadOff).toHaveBeenCalled();
	});

	it('should turn off auto load if terrain becomes invalid', () => {
		ctx.isTerrainInvalid = true;
		TransportAutoLoadLogic.handleAutoLoadTick(ctx);

		expect(ctx.handleAutoLoadOff).toHaveBeenCalled();
	});

	it('should turn off auto load if duration reaches 0', () => {
		ctx.duration = 1; // will decrement to 0
		TransportAutoLoadLogic.handleAutoLoadTick(ctx);

		expect(ctx.duration).toBe(0);
		expect(ctx.handleAutoLoadOff).toHaveBeenCalled();
	});
});
