import { City } from '../city/city';
import { UnitToCity } from '../city/city-map';
import { debugPrint } from '../utils/debug-print';
import { EVENT_ON_CITY_DESELECTED } from '../utils/events/event-constants';
import { EventEmitter } from '../utils/events/event-emitter';
import { UNIT_TYPE } from '../utils/unit-types';
import { PLAYER_SLOTS } from '../utils/utils';

export function CityDeselectedEvent() {
	const t: trigger = CreateTrigger();
	debugPrint('RegisteringPlayerUnitEvent');
	for (let i = 0; i < PLAYER_SLOTS; i++) {
		TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_DESELECTED);
	}
	debugPrint('RegisteredPlayerUnitEvent');

	TriggerAddCondition(
		t,
		Condition(() => {
			if (!IsUnitType(GetTriggerUnit(), UNIT_TYPE.CITY)) return;

			debugPrint('CityDeselectedEvent');
			const city: City = UnitToCity.get(GetTriggerUnit());
			EventEmitter.getInstance().emit(EVENT_ON_CITY_DESELECTED, city, GetTriggerPlayer());
		})
	);
}
