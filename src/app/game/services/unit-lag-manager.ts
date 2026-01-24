// PlayerClientManager is responsible for managing the players' clients in the game. The reason for this is to reduce the unit lag.

import { UNIT_TYPE } from 'src/app/utils/unit-types';
import { ClientManager } from './client-manager';
import { debugPrint } from 'src/app/utils/debug-print';
import { MinimapIconManager } from 'src/app/managers/minimap-icon-manager';

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

	private constructor() {}

	// Track a unit by registering it with the MinimapIconManager.
	// This replaces the old method of using dummy units to follow the tracked unit.
	// The untracked unit is effectively just managed for its minimap icon color.
	public trackUnit(unit: unit): void {
		// Only clients need their units tracked/fixed
		if (!ClientManager.getInstance().isAnyClientOwnerOfUnit(unit)) {
			// debugPrint(`UnitLagManager: Not tracking ${GetUnitName(unit)} as its owner is not a client.`);
			return;
		}

		// Use MinimapIconManager to handle the visual representation
		debugPrint(`UnitLagManager: Tracking ${GetUnitName(unit)} via MinimapIconManager.`);
		MinimapIconManager.getInstance().registerTrackedUnit(unit);
	}

	public untrackUnit(unit: unit): void {
		debugPrint(`UnitLagManager: Untracking ${GetUnitName(unit)}.`);
		MinimapIconManager.getInstance().unregisterTrackedUnit(unit);
	}

	public static IsUnitAlly(unit: unit, player: player): boolean {
		return IsUnitAlly(unit, player) && !IsUnitType(unit, UNIT_TYPE.MINIMAP_INDICATOR);
	}

	public static IsUnitEnemy(unit: unit, player: player): boolean {
		return IsUnitEnemy(unit, player) && !IsUnitType(unit, UNIT_TYPE.MINIMAP_INDICATOR);
	}
}
