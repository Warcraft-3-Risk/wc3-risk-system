import { UNIT_ID } from 'src/configs/unit-id';
import { debugPrint } from 'src/app/utils/debug-print';

export function UnitUpgradeEvent() {
	const t: trigger = CreateTrigger();

	for (let i = 0; i < bj_MAX_PLAYER_SLOTS; i++) {
		TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_UPGRADE_FINISH, null);
	}

	TriggerAddCondition(
		t,
		Condition(() => {
			const upgradedUnit = GetTriggerUnit();

			SetAltMinimapIcon('war3mapImported\\capital_star.blp');

			UnitSetUsesAltIcon(
				upgradedUnit,
				GetUnitTypeId(upgradedUnit) == UNIT_ID.CAPITAL || GetUnitTypeId(upgradedUnit) == UNIT_ID.CONQUERED_CAPITAL
			);

			return false;
		})
	);
}
