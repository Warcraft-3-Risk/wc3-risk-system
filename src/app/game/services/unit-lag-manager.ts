// SharedSlotManager is responsible for managing the shared slots in the game. The reason for this is to reduce the unit lag.

import { UNIT_TYPE } from 'src/app/utils/unit-types';
import { SharedSlotManager } from './shared-slot-manager';
import { debugPrint } from 'src/app/utils/debug-print';
import { DC, DEBUG_PRINTS } from 'src/configs/game-settings';
import { MinimapIconManager } from 'src/app/managers/minimap-icon-manager';

// Players may experience unit lag when too many orders are issued simultaneously.
// Warcraft III appears to enforce a hard cap on the number of order issues a single player can queue.
// Once this cap is reached, new orders cannot be processed until earlier ones are resolved, causing units to appear unresponsive.
// Importantly, this lag is isolated to individual players and does not impact others.
// As such, we are here solving the issue by giving each player their own "non active player slot", which we will call a shared slot.

export class UnitLagManager {
	// This class will manage the player shared slots and their interactions.
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
		// Guards are managed separately — they hide their minimap icon intentionally.
		// Tracking a guard would undo the hide and create a phantom minimap icon.
		if (IsUnitType(unit, UNIT_TYPE.GUARD)) {
			return;
		}

		// Only shared slots need their units tracked/fixed.
		// Exception: transports are always owned by the real player slot (not a shared slot),
		// but still need custom minimap tracking so they retain the player's color.
		if (!SharedSlotManager.getInstance().isAnySharedSlotOwnerOfUnit(unit) && !IsUnitType(unit, UNIT_TYPE.TRANSPORT)) {
			return;
		}

		// Color the unit to match the real owner instead of using SetPlayerColor (which corrupts WC3 native End-Game screen)
		//const realOwner = SharedSlotManager.getInstance().getOwnerOfUnit(unit);

		//SetUnitColor(unit, GetPlayerColor(realOwner));
		//BlzShowUnitTeamGlow(unit, false);

		// Use MinimapIconManager to handle the visual representation
		if (DEBUG_PRINTS.master) debugPrint(`UnitLagManager: Tracking ${GetUnitName(unit)} via MinimapIconManager.`, DC.unitLag);
		MinimapIconManager.getInstance().registerTrackedUnit(unit);
	}

	public untrackUnit(unit: unit): void {
		if (DEBUG_PRINTS.master) debugPrint(`UnitLagManager: Untracking ${GetUnitName(unit)}.`, DC.unitLag);
		MinimapIconManager.getInstance().unregisterTrackedUnit(unit);
	}

	public static IsUnitAlly(unit: unit, player: player): boolean {
		return IsUnitAlly(unit, player);
	}

	public static IsUnitEnemy(unit: unit, player: player): boolean {
		return IsUnitEnemy(unit, player);
	}
}
