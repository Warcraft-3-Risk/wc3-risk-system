import { UnitToCity } from '../city/city-map';
import { PlayerManager } from '../player/player-manager';
import { ActivePlayer } from '../player/types/active-player';
import { UNIT_TYPE } from '../utils/unit-types';
import { MinimapIconManager } from '../managers/minimap-icon-manager';
import { ReserveManager } from '../managers/reserve-manager';

export const UnitTrainedTrigger: trigger = CreateTrigger();

export function UnitTrainedEvent() {
	TriggerAddCondition(
		UnitTrainedTrigger,
		Condition(() => {
			const trainedUnit = GetTrainedUnit();

			UnitToCity.get(GetTriggerUnit()).onUnitTrain(trainedUnit);

			// Custom minimap drawing (promode only - a no-op otherwise)
			MinimapIconManager.getInstance().registerIfValid(trainedUnit);

			// Reserves ability (a no-op unless the Reserves game type is on)
			ReserveManager.getInstance().registerUnit(trainedUnit);

			const player: ActivePlayer = PlayerManager.getInstance().players.get(GetOwningPlayer(trainedUnit));

			if (!IsUnitType(trainedUnit, UNIT_TYPE.TRANSPORT)) {
				player.trackedData.units.add(trainedUnit);
			}

			return false;
		})
	);
}
