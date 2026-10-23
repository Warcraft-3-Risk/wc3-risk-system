import { UNIT_ID } from 'src/configs/unit-id';
import { UnitToCity } from '../city/city-map';
import { MinimapIconManager } from '../managers/minimap-icon-manager';
import { GlobalGameData } from '../game/state/global-game-state';

export function UnitUpgradeEvent() {
	const t: trigger = CreateTrigger();

	for (let i = 0; i < bj_MAX_PLAYER_SLOTS; i++) {
		TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_UPGRADE_FINISH, null);
	}

	TriggerAddCondition(
		t,
		Condition(() => {
			const upgradedUnit = GetTriggerUnit();
			const city = UnitToCity.get(upgradedUnit);

			if (!city || city.barrack.unit != upgradedUnit) return false;

			// Capitals are drawn as a cross on the minimap instead of their native display.
			// A conquered capital looks like a normal city again, so it gets its native display back.
			MinimapIconManager.getInstance().setCapital(
				city,
				GetUnitTypeId(upgradedUnit) == UNIT_ID.CAPITAL,
				GlobalGameData.matchState != 'inProgress'
			);

			return false;
		})
	);
}
