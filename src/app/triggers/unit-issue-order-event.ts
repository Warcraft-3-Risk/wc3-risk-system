import { AnnounceOnLocationObserverOnly } from '../game/announcer/announce';
import { debugPrint } from '../utils/debug-print';

export function UnitIssueOrderEvent() {
	const t: trigger = CreateTrigger();

	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
		TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_ISSUED_POINT_ORDER, null);
	}

	TriggerAddCondition(
		t,
		Condition(() => {
			switch (GetIssuedOrderId()) {
				case 851984: // order_attackground
					AnnounceOnLocationObserverOnly('SPLASH', GetOrderPointX(), GetOrderPointY(), 2.0, 3.0, GetTriggerPlayer());
					break;
				default:
					break;
			}
		})
	);
}
