import { UnitToCity } from '../city/city-map';
import { ClientManager } from '../game/services/client-manager';
import { MinimapIconManager } from '../managers/minimap-icon-manager';
import { PlayerManager } from '../player/player-manager';
import { ActivePlayer } from '../player/types/active-player';
import { UNIT_TYPE } from '../utils/unit-types';

export const UnitTrainedTrigger: trigger = CreateTrigger();

export function UnitTrainedEvent() {
	TriggerAddCondition(
		UnitTrainedTrigger,
		Condition(() => {
			const trainedUnit = GetTrainedUnit();

			UnitToCity.get(GetTriggerUnit()).onUnitTrain(trainedUnit);

			const player: ActivePlayer = PlayerManager.getInstance().players.get(ClientManager.getInstance().getOwnerOfUnit(trainedUnit));

			if (!IsUnitType(trainedUnit, UNIT_TYPE.TRANSPORT)) {
				player.trackedData.units.add(trainedUnit);
			}

			return false;
		})
	);
}
