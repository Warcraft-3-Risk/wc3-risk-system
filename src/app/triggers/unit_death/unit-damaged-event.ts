import { GlobalGameData } from 'src/app/game/state/global-game-state';
import { UNIT_TYPE } from 'src/app/utils/unit-types';

export function UnitDamagedEvent() {
	const t: trigger = CreateTrigger();

	for (let i = 0; i < bj_MAX_PLAYER_SLOTS; i++) {
		TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_DAMAGED, undefined);
	}

	TriggerAddCondition(
		t,
		Condition(() => {
			if (GlobalGameData.matchState === 'postMatch') return false;

			const damagedUnit: unit = GetTriggerUnit();
			const damagingUnit: unit = GetEventDamageSource();

			if (IsUnitType(damagingUnit, UNIT_TYPE.CITY) && IsUnitType(damagedUnit, UNIT_TYPE.GUARD)) {
				BlzSetEventDamage(0);
			}

			return false;
		})
	);
}
