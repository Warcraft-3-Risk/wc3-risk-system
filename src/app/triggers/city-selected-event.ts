import { City } from '../city/city';
import { UnitToCity } from '../city/city-map';
import { EVENT_ON_CITY_SELECTED } from '../utils/events/event-constants';
import { EventEmitter } from '../utils/events/event-emitter';
import { UNIT_TYPE } from '../utils/unit-types';
import { PLAYER_SLOTS } from '../utils/utils';

export function CitySelectedEvent() {
	const t: trigger = CreateTrigger();
	for (let i = 0; i < PLAYER_SLOTS; i++) {
		TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SELECTED);
	}

	TriggerAddCondition(
		t,
		Condition(() => {
			if (!IsUnitType(GetTriggerUnit(), UNIT_TYPE.CITY)) return;

			const city: City = UnitToCity.get(GetTriggerUnit());
			EventEmitter.getInstance().emit(EVENT_ON_CITY_SELECTED, city, GetTriggerPlayer());
		})
	);
}
