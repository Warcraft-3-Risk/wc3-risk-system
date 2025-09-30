import { GlobalGameData } from 'src/app/game/state/global-game-state';
import { debugPrint } from 'src/app/utils/debug-print';
import { UNIT_TYPE } from 'src/app/utils/unit-types';

export function UnitDamagedEvent() {
	const t: trigger = CreateTrigger();

	for (let i = 0; i < bj_MAX_PLAYER_SLOTS; i++) {
		TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_DAMAGED, null);
	}

	TriggerAddCondition(
		t,
		Condition(() => {
			if (GlobalGameData.matchState === 'postMatch') return false;

			const damagedUnit: unit = GetTriggerUnit();
			const damagingUnit: unit = GetEventDamageSource();

			if (!IsUnitType(damagingUnit, UNIT_TYPE.CITY)) {
				return;
			}

			if (IsUnitAlly(damagedUnit, GetOwningPlayer(damagingUnit)) || GetOwningPlayer(damagedUnit) === GetOwningPlayer(damagingUnit)) {
				BlzSetEventDamage(0);
			}

			return false;
		})
	);
}
