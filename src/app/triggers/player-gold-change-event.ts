import { setGold } from '../game/game-mode/utillity/update-ui';
import { IncomeManager } from '../managers/income-manager';
import { PlayerManager } from '../player/player-manager';
import { debugPrint } from '../utils/debug-print';
import { PLAYER_SLOTS } from '../utils/utils';

export function PlayerGoldChangeEvent() {
	const t: trigger = CreateTrigger();

	for (let i = 0; i < PLAYER_SLOTS; i++) {
		debugPrint(`Registering gold change event for player ${i}`);
		TriggerRegisterPlayerStateEvent(t, Player(i), PLAYER_STATE_RESOURCE_GOLD, GREATER_THAN_OR_EQUAL, 0);
		debugPrint(`Registered gold change event for player ${i}`);
	}

	TriggerAddCondition(
		t,
		Condition(() => {
			if (GetTriggerPlayer() == GetLocalPlayer()) {
				debugPrint(`PlayerGoldChangeEvent triggered for player ${GetPlayerName(GetTriggerPlayer())}`);
				const gold = GetPlayerState(GetTriggerPlayer(), PLAYER_STATE_RESOURCE_GOLD);
				debugPrint(`  Current gold: ${gold}`);
				const cap = IncomeManager.calculateGoldCap(PlayerManager.getInstance().players.get(GetTriggerPlayer()));
				debugPrint(`  Calculated gold cap: ${cap}`);
				setGold(gold, cap);
				return true;
			}
		})
	);
}
