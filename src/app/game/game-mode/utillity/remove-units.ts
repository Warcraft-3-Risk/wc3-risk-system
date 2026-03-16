import { UNIT_TYPE } from 'src/app/utils/unit-types';
import { UnitLagManager } from '../../services/unit-lag-manager';
import { debugPrint } from 'src/app/utils/debug-print';
import { DC } from 'src/configs/game-settings';

export function removeUnits(): void {
	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
		const player = Player(i);
		debugPrint(`Removing units for player ${GetPlayerName(player)} index ${i}`, DC.gameMode);

		const group: group = CreateGroup();
		GroupEnumUnitsOfPlayer(
			group,
			player,
			Filter(() => {
				const unit: unit = GetFilterUnit();
				if (!IsUnitType(unit, UNIT_TYPE.BUILDING) && !IsUnitType(unit, UNIT_TYPE.GUARD)) {
					UnitLagManager.getInstance().untrackUnit(unit);
					RemoveUnit(unit);
				}
			})
		);

		GroupClear(group);
		DestroyGroup(group);
	}
}
