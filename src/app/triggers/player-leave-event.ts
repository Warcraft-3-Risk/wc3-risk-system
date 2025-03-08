import { PlayerManager } from '../player/player-manager';
import { PLAYER_STATUS } from '../player/status/status-enum';
import { ActivePlayer } from '../player/types/active-player';
import { PLAYER_SLOTS } from '../utils/utils';

export function PlayerLeaveEvent() {
	const t: trigger = CreateTrigger();

	for (let i = 0; i < PLAYER_SLOTS; i++) {
		TriggerRegisterPlayerEvent(t, Player(i), EVENT_PLAYER_LEAVE);
	}

	TriggerAddCondition(
		t,
		Condition(() => {
			const player: ActivePlayer = PlayerManager.getInstance().players.get(GetTriggerPlayer());

			player.status.set(PLAYER_STATUS.LEFT);
		})
	);
}
