export enum PatrolState {
	LOADING,
	MOVING,
	UNLOADING,
	RETURNING,
}

export interface TransportPatrolContext {
	patrolState: PatrolState;
	patrolDestX: number;
	patrolDestY: number;
	patrolOriginX: number;
	patrolOriginY: number;
	patrolLoadTimer: number;
	pathingDisableDuration: number;
	cargoCount: number;

	unitAlive: boolean;
	unitX: number;
	unitY: number;
	currentOrderId: number;

	stopPatrol(): void;
	setUnitPathing(enabled: boolean): void;
	castAutoLoad(): void;
	removeAutoLoadEffect(): void;
	addAutoLoadEffect(): void;
	cancelLoadingOrders(): void;
	issueMoveOrder(x: number, y: number): void;
	issueUnloadAllOrder(x: number, y: number): void;
	issueStopOrder(): void;
}

export class TransportPatrolLogic {
	public static handlePatrolTick(ctx: TransportPatrolContext): void {
		if (!ctx.unitAlive) {
			ctx.stopPatrol();
			return;
		}

		if (ctx.pathingDisableDuration > 0) {
			ctx.pathingDisableDuration--;
			if (ctx.pathingDisableDuration <= 0) {
				ctx.setUnitPathing(true);
			}
		}

		switch (ctx.patrolState) {
			case PatrolState.LOADING: {
				ctx.castAutoLoad();
				ctx.patrolLoadTimer++;

				if (ctx.cargoCount >= 10 || (ctx.patrolLoadTimer >= 5 && ctx.cargoCount > 0)) {
					ctx.patrolState = PatrolState.MOVING;
					ctx.removeAutoLoadEffect();
					ctx.patrolLoadTimer = 0;
					ctx.cancelLoadingOrders();
					ctx.issueMoveOrder(ctx.patrolDestX, ctx.patrolDestY);
				}
				break;
			}

			case PatrolState.MOVING: {
				const dx = ctx.unitX - ctx.patrolDestX;
				const dy = ctx.unitY - ctx.patrolDestY;
				const distSq = dx * dx + dy * dy;

				// Dist < 500 means distSq < 250000
				if (distSq < 250000) {
					ctx.patrolState = PatrolState.UNLOADING;
					ctx.issueUnloadAllOrder(ctx.patrolDestX, ctx.patrolDestY);
				} else if (ctx.currentOrderId !== 851986) {
					// 851986 = move
					ctx.issueMoveOrder(ctx.patrolDestX, ctx.patrolDestY);
				}
				break;
			}

			case PatrolState.UNLOADING: {
				if (ctx.cargoCount === 0) {
					ctx.patrolState = PatrolState.RETURNING;
					ctx.issueMoveOrder(ctx.patrolOriginX, ctx.patrolOriginY);
					ctx.setUnitPathing(false);
					ctx.pathingDisableDuration = 5;
				} else if (ctx.currentOrderId !== 852048) {
					// 852048 = unloadall point
					ctx.issueUnloadAllOrder(ctx.patrolDestX, ctx.patrolDestY);
				}
				break;
			}

			case PatrolState.RETURNING: {
				const rdx = ctx.unitX - ctx.patrolOriginX;
				const rdy = ctx.unitY - ctx.patrolOriginY;
				const rdistSq = rdx * rdx + rdy * rdy;

				// Dist < 50 means distSq < 2500
				if (rdistSq < 2500) {
					ctx.patrolState = PatrolState.LOADING;
					ctx.issueStopOrder();
					ctx.addAutoLoadEffect();
				} else if (ctx.currentOrderId !== 851986) {
					// 851986 = move
					ctx.issueMoveOrder(ctx.patrolOriginX, ctx.patrolOriginY);
				}
				break;
			}
		}
	}
}
