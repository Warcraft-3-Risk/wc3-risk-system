// PlayerClientManager is responsible for managing the players' clients in the game. The reason for this is to reduce the unit lag.

import { UNIT_ID } from 'src/configs/unit-id';
import { ClientManager } from './client-manager';

// Players may experience unit lag when too many orders are issued simultaneously.
// Warcraft III appears to enforce a hard cap on the number of order issues a single player can queue.
// Once this cap is reached, new orders cannot be processed until earlier ones are resolved, causing units to appear unresponsive.
// Importantly, this lag is isolated to individual players and does not impact others.
// As such, we are here solving the issue by giving each player their own client "non active player slot", which we will call a client slot.

export class UnitLagManager {
	// This class will manage the player clients and their interactions.
	private static instance: UnitLagManager;

	public static getInstance(): UnitLagManager {
		if (!UnitLagManager.instance) {
			UnitLagManager.instance = new UnitLagManager();
		}
		return UnitLagManager.instance;
	}

	private trackedUnits: Map<unit, unit> = new Map<unit, unit>();

	private constructor() {
		// Initialize player client manager
	}

	public trackUnit(unit: unit): void {
		if (this.trackedUnits.get(unit)) {
			return;
		}

		// Hide tracked unit on minimap
		BlzSetUnitBooleanFieldBJ(unit, UNIT_BF_HIDE_MINIMAP_DISPLAY, true);

		// Create a dummy minimap indicator unit that follows the tracked unit

		const minimapIndicator = CreateUnit(
			ClientManager.getInstance().getActualOwner(GetOwningPlayer(unit)), // Use the actual owner of the unit
			UNIT_ID.DUMMY_MINIMAP_INDICATOR,
			GetUnitX(unit),
			GetUnitY(unit),
			270
		);
		IssueTargetOrderById(minimapIndicator, 851986, unit);
		this.trackedUnits.set(unit, minimapIndicator);
	}

	public untrackUnit(unit: unit): void {
		// Unit has a dummy and we want to remove it
		if (this.trackedUnits.get(unit)) {
			BlzSetUnitBooleanFieldBJ(unit, UNIT_BF_HIDE_MINIMAP_DISPLAY, true);
			RemoveUnit(this.trackedUnits.get(unit));
			this.trackedUnits.delete(unit);
		}
	}

	// public allocateToClient(): void {

	// }

	// public grantBountyToOwnerOfclient(unit: unit, amount: number): void {

	// }
}
