// PlayerClientManager is responsible for managing the players' clients in the game. The reason for this is to reduce the unit lag.

import { UNIT_TYPE } from 'src/app/utils/unit-types';
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

	// Track a unit by creating a dummy minimap indicator that follows it around.
	// The tracked unit will be hidden from the minimap for its owner, but visible to all other players.
	// The dummy unit which is only visible to the owner will superseed the tracked unit on the minimap, masking the tracked unit as white (yours).
	public trackUnit(unit: unit): void {
		// Do not retrack a unit
		if (this.trackedUnits.get(unit)) {
			return;
		}

		// Only clients can have their units tracked
		if (!ClientManager.getInstance().isAnyClientOwnerOfUnit(unit)) {
			debugPrint(`UnitLagManager: Not tracking ${GetUnitName(unit)} as its owner is not a client.`);
			return;
		}

		// Hide tracked unit on minimap - also hides the unit for the client themselves if they own the unit
		if (ClientManager.getInstance().isPlayerOrClientOwnerOfUnit(unit, GetLocalPlayer())) {
			// Hide the tracked unit on the minimap
			// Owner and clients should only see the dummy unit on the minimap
			BlzSetUnitBooleanFieldBJ(unit, UNIT_BF_HIDE_MINIMAP_DISPLAY, true);
			debugPrint(`UnitLagManager: Hiding ${GetUnitName(unit)} from minimap for its owner.`);
		} else {
			// Non-owners should see the tracked unit on the minimap
			BlzSetUnitBooleanFieldBJ(unit, UNIT_BF_HIDE_MINIMAP_DISPLAY, false);
			debugPrint(`UnitLagManager: Showing ${GetUnitName(unit)} on minimap for non-owners.`);
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
		} else {
			debugPrint(`UnitLagManager: No dummy found for ${GetUnitName(unit)}.`);
		}
	}

	public static IsUnitAlly(unit: unit, player: player): boolean {
		return IsUnitAlly(unit, player) && !IsUnitType(unit, UNIT_TYPE.MINIMAP_INDICATOR);
	}

	public static IsUnitEnemy(unit: unit, player: player): boolean {
		return IsUnitEnemy(unit, player) && !IsUnitType(unit, UNIT_TYPE.MINIMAP_INDICATOR);
	}
}
