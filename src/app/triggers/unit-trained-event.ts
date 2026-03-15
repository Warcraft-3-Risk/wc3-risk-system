import { UnitToCity } from '../city/city-map';
import { ClientManager } from '../game/services/client-manager';
import { UnitLagManager } from '../game/services/unit-lag-manager';
import { PlayerManager } from '../player/player-manager';
import { ActivePlayer } from '../player/types/active-player';
import { debugPrint } from '../utils/debug-print';
import { UNIT_TYPE } from '../utils/unit-types';

export const UnitTrainedTrigger: trigger = CreateTrigger();

export function UnitTrainedEvent() {
	TriggerAddCondition(
		UnitTrainedTrigger,
		Condition(() => {
			const trainedUnit = GetTrainedUnit();

			UnitToCity.get(GetTriggerUnit()).onUnitTrain(trainedUnit);

			const oldSlot = GetOwningPlayer(trainedUnit);
			const realOwner = ClientManager.getInstance().getOwnerOfUnit(trainedUnit);

			// Transports must always be owned by the real player so rally-loading works correctly
			if (IsUnitType(trainedUnit, UNIT_TYPE.TRANSPORT)) {
				if (oldSlot !== realOwner) {
					debugPrint(`[SlotCount] Transport reassigned from client slot ${GetPlayerId(oldSlot)} to real owner ${GetPlayerId(realOwner)}`);
					SetUnitOwner(trainedUnit, realOwner, true);
					ClientManager.getInstance().incrementUnitCount(realOwner);
				} else {
					debugPrint(`[SlotCount] Transport trained on real owner slot ${GetPlayerId(oldSlot)}`);
					ClientManager.getInstance().incrementUnitCount(oldSlot);
				}
			} else {
				const optimalSlot = ClientManager.getInstance().getSlotWithLowestUnitCount(realOwner);

				if (optimalSlot !== oldSlot) {
					// Reassign the trained unit to the optimal (lowest-count) slot
					debugPrint(`[SlotCount] Trained unit reassigned from slot ${GetPlayerId(oldSlot)} to slot ${GetPlayerId(optimalSlot)}`);
					SetUnitOwner(trainedUnit, optimalSlot, true);
					ClientManager.getInstance().incrementUnitCount(optimalSlot);
				} else {
					debugPrint(`[SlotCount] Trained unit on slot ${GetPlayerId(oldSlot)}`);
					ClientManager.getInstance().incrementUnitCount(oldSlot);
				}
			}

			// Hide native minimap marker and use custom minimap icon (resolves real owner color)
			UnitLagManager.getInstance().trackUnit(trainedUnit);

			const player: ActivePlayer = PlayerManager.getInstance().players.get(realOwner);

			if (!IsUnitType(trainedUnit, UNIT_TYPE.TRANSPORT)) {
				player.trackedData.units.add(trainedUnit);
			}

			return false;
		})
	);
}
