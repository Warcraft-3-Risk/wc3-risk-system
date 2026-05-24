import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransportPatrolLogic, TransportPatrolContext, PatrolState } from '../src/app/utils/transport-patrol-logic';

describe('TransportPatrolLogic', () => {
	let ctx: TransportPatrolContext;

	beforeEach(() => {
		ctx = {
			patrolState: PatrolState.LOADING,
			patrolDestX: 1000,
			patrolDestY: 1000,
			patrolOriginX: 0,
			patrolOriginY: 0,
			patrolLoadTimer: 0,
			pathingDisableDuration: 0,
			cargoCount: 0,

			unitAlive: true,
			unitX: 0,
			unitY: 0,
			currentOrderId: 0,

			stopPatrol: vi.fn(),
			setUnitPathing: vi.fn(),
			castAutoLoad: vi.fn(),
			removeAutoLoadEffect: vi.fn(),
			addAutoLoadEffect: vi.fn(),
			cancelLoadingOrders: vi.fn(),
			issueMoveOrder: vi.fn(),
			issueUnloadAllOrder: vi.fn(),
			issueStopOrder: vi.fn(),
		};
	});

	it('should stop patrol if unit is dead', () => {
		ctx.unitAlive = false;
		TransportPatrolLogic.handlePatrolTick(ctx);
		expect(ctx.stopPatrol).toHaveBeenCalled();
	});

	it('should tick down pathingDisableDuration and restore pathing when it reaches 0', () => {
		ctx.pathingDisableDuration = 2;
		TransportPatrolLogic.handlePatrolTick(ctx);
		expect(ctx.pathingDisableDuration).toBe(1);
		expect(ctx.setUnitPathing).not.toHaveBeenCalled();

		TransportPatrolLogic.handlePatrolTick(ctx);
		expect(ctx.pathingDisableDuration).toBe(0);
		expect(ctx.setUnitPathing).toHaveBeenCalledWith(true);
	});

	describe('LOADING state', () => {
		beforeEach(() => {
			ctx.patrolState = PatrolState.LOADING;
		});

		it('should cast auto load and increment timer while not full or threshold', () => {
			TransportPatrolLogic.handlePatrolTick(ctx);
			expect(ctx.castAutoLoad).toHaveBeenCalled();
			expect(ctx.patrolLoadTimer).toBe(1);
			expect(ctx.patrolState).toBe(PatrolState.LOADING);
		});

		it('should transition to MOVING if cargo reaches 10', () => {
			ctx.cargoCount = 10;
			TransportPatrolLogic.handlePatrolTick(ctx);
			expect(ctx.patrolState).toBe(PatrolState.MOVING);
			expect(ctx.removeAutoLoadEffect).toHaveBeenCalled();
			expect(ctx.cancelLoadingOrders).toHaveBeenCalled();
			expect(ctx.issueMoveOrder).toHaveBeenCalledWith(ctx.patrolDestX, ctx.patrolDestY);
			expect(ctx.patrolLoadTimer).toBe(0);
		});

		it('should transition to MOVING if timer is >= 5 and cargo > 0', () => {
			ctx.patrolLoadTimer = 4; // gets incremented to 5
			ctx.cargoCount = 1;
			TransportPatrolLogic.handlePatrolTick(ctx);
			expect(ctx.patrolState).toBe(PatrolState.MOVING);
		});

		it('should NOT transition to MOVING if timer is >= 5 but cargo is 0', () => {
			ctx.patrolLoadTimer = 4; // gets incremented to 5
			ctx.cargoCount = 0;
			TransportPatrolLogic.handlePatrolTick(ctx);
			expect(ctx.patrolState).toBe(PatrolState.LOADING);
			expect(ctx.issueMoveOrder).not.toHaveBeenCalled();
		});
	});

	describe('MOVING state', () => {
		beforeEach(() => {
			ctx.patrolState = PatrolState.MOVING;
			ctx.unitX = 500;
			ctx.unitY = 500;
		});

		it('should transition to UNLOADING and order unload if near destination', () => {
			ctx.unitX = 900;
			ctx.unitY = 900; // distSq = 20000, which is < 250000
			TransportPatrolLogic.handlePatrolTick(ctx);
			expect(ctx.patrolState).toBe(PatrolState.UNLOADING);
			expect(ctx.issueUnloadAllOrder).toHaveBeenCalledWith(1000, 1000);
		});

		it('should re-issue move order if not near destination and not currently moving', () => {
			ctx.currentOrderId = 0;
			TransportPatrolLogic.handlePatrolTick(ctx);
			expect(ctx.patrolState).toBe(PatrolState.MOVING);
			expect(ctx.issueMoveOrder).toHaveBeenCalledWith(1000, 1000);
		});

		it('should do nothing if far from destination but already moving', () => {
			ctx.currentOrderId = 851986; // move order
			TransportPatrolLogic.handlePatrolTick(ctx);
			expect(ctx.issueMoveOrder).not.toHaveBeenCalled();
		});
	});

	describe('UNLOADING state', () => {
		beforeEach(() => {
			ctx.patrolState = PatrolState.UNLOADING;
			ctx.unitX = 1000;
			ctx.unitY = 1000;
			ctx.cargoCount = 5;
		});

		it('should transition to RETURNING, order move to origin, and disable pathing if cargo is empty', () => {
			ctx.cargoCount = 0;
			TransportPatrolLogic.handlePatrolTick(ctx);
			expect(ctx.patrolState).toBe(PatrolState.RETURNING);
			expect(ctx.issueMoveOrder).toHaveBeenCalledWith(0, 0);
			expect(ctx.setUnitPathing).toHaveBeenCalledWith(false);
			expect(ctx.pathingDisableDuration).toBe(5);
		});

		it('should re-issue unloadall order if cargo not empty and not currently unloading', () => {
			ctx.currentOrderId = 0;
			TransportPatrolLogic.handlePatrolTick(ctx);
			expect(ctx.patrolState).toBe(PatrolState.UNLOADING);
			expect(ctx.issueUnloadAllOrder).toHaveBeenCalledWith(1000, 1000);
		});

		it('should do nothing if cargo not empty and currently unloading', () => {
			ctx.currentOrderId = 852048; // unload order
			TransportPatrolLogic.handlePatrolTick(ctx);
			expect(ctx.issueUnloadAllOrder).not.toHaveBeenCalled();
		});
	});

	describe('RETURNING state', () => {
		beforeEach(() => {
			ctx.patrolState = PatrolState.RETURNING;
			ctx.unitX = 500;
			ctx.unitY = 500;
		});

		it('should transition to LOADING, order stop, and add auto-load effect if near origin', () => {
			ctx.unitX = 30;
			ctx.unitY = 30; // distSq = 1800, which is < 2500
			TransportPatrolLogic.handlePatrolTick(ctx);
			expect(ctx.patrolState).toBe(PatrolState.LOADING);
			expect(ctx.issueStopOrder).toHaveBeenCalled();
			expect(ctx.addAutoLoadEffect).toHaveBeenCalled();
		});

		it('should re-issue move order if far from origin and not moving', () => {
			ctx.currentOrderId = 0;
			TransportPatrolLogic.handlePatrolTick(ctx);
			expect(ctx.patrolState).toBe(PatrolState.RETURNING);
			expect(ctx.issueMoveOrder).toHaveBeenCalledWith(0, 0);
		});

		it('should do nothing if far from origin but already moving', () => {
			ctx.currentOrderId = 851986; // move order
			TransportPatrolLogic.handlePatrolTick(ctx);
			expect(ctx.issueMoveOrder).not.toHaveBeenCalled();
		});
	});
});
