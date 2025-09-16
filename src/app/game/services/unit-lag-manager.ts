// PlayerClientManager is responsible for managing the players' clients in the game. The reason for this is to reduce the unit lag.

import { UNIT_ID } from 'src/configs/unit-id';
import { ClientManager } from './client-manager';
import { DummyPoolManager } from './dummy-pool-manager';
import { debugPrint } from 'src/app/utils/debug-print';

// Players may experience unit lag when too many orders are issued simultaneously.
// Warcraft III appears to enforce a hard cap on the number of order issues a single player can queue.
// Once this cap is reached, new orders cannot be processed until earlier ones are resolved, causing units to appear unresponsive.
// Importantly, this lag is isolated to individual players and does not impact others.
// As such, we are here solving the issue by giving each player their own client "non active player slot", which we will call a client slot.

export class UnitLagManager {
	// This class will manage the player clients and their interactions.
	private static instance: UnitLagManager;
	private dummyPool: DummyPoolManager;
	private trackedUnits: Map<unit, unit> = new Map<unit, unit>();

	public static getInstance(): UnitLagManager {
		if (!UnitLagManager.instance) {
			UnitLagManager.instance = new UnitLagManager();
		}
		return UnitLagManager.instance;
	}

	private constructor() {
		this.dummyPool = new DummyPoolManager();
	}

	public trackUnit(unit: unit): void {
		if (this.trackedUnits.get(unit)) {
			return;
		}

		// Hide tracked unit on minimap
		if (ClientManager.getInstance().getOwnerOfUnit(unit) == GetLocalPlayer()) {
			BlzSetUnitBooleanFieldBJ(unit, UNIT_BF_HIDE_MINIMAP_DISPLAY, true);
		} else {
			BlzSetUnitBooleanFieldBJ(unit, UNIT_BF_HIDE_MINIMAP_DISPLAY, false);
		}

		// Create a dummy minimap indicator unit that follows the tracked unit
		const dummy = this.dummyPool.pop(
			ClientManager.getInstance().getOwner(ClientManager.getInstance().getOwnerOfUnit(unit)),
			GetUnitX(unit),
			GetUnitY(unit)
		);
		SetUnitPathing(dummy, false);
		IssueTargetOrderById(dummy, 851986, unit);
		BlzSetUnitBooleanFieldBJ(dummy, UNIT_BF_HIDE_MINIMAP_DISPLAY, false);
		this.trackedUnits.set(unit, dummy);
		debugPrint(`UnitLagManager: ${GetUnitName(dummy)} is now tracking ${GetUnitName(unit)}.`);
	}

	public untrackUnit(unit: unit): void {
		// Unit has a dummy and we want to remove it
		const dummy = this.trackedUnits.get(unit);
		if (dummy) {
			this.trackedUnits.delete(unit);
			this.dummyPool.push(dummy);
			BlzSetUnitBooleanFieldBJ(dummy, UNIT_BF_HIDE_MINIMAP_DISPLAY, true);
			debugPrint(`UnitLagManager: ${GetUnitName(dummy)} is stopping tracking of ${GetUnitName(unit)}.`);
		}
	}

	// public allocateToClient(): void {

	// }

	// public grantBountyToOwnerOfclient(unit: unit, amount: number): void {

	// }
}
