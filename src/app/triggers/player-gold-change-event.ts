import { updateGold } from '../game/game-mode/utillity/update-ui';
import { debugPrint } from '../utils/debug-print';

export function PlayerGoldChangeEvent() {
	const t: trigger = CreateTrigger();

	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
		debugPrint(`Registering gold change event for player ${i}`);
		TriggerRegisterPlayerStateEvent(t, Player(i), PLAYER_STATE_RESOURCE_GOLD, GREATER_THAN_OR_EQUAL, 0);
		debugPrint(`Registered gold change event for player ${i}`);
	}

	TriggerAddCondition(
		t,
		Condition(() => {
			const gold = GetPlayerState(GetTriggerPlayer(), PLAYER_STATE_RESOURCE_GOLD);
			updateGold(GetTriggerPlayer(), gold);
			return true;
		})
	);
}
