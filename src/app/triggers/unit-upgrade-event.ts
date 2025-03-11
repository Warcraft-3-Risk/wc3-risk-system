import { EventEmitter } from '../utils/events/event-emitter';
import { EVENT_ON_UNIT_UPGRADE_FINISH } from '../utils/events/event-constants';

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

			EventEmitter.getInstance().emit(EVENT_ON_UNIT_UPGRADE_FINISH, upgradedUnit);

			return false;
		})
	);
}
