import { PlayerManager } from 'src/app/player/player-manager';
import { PLAYER_STATUS } from 'src/app/player/status/status-enum';

export class PlayerSetupService {
	public run() {
		PlayerManager.getInstance().players.forEach((val) => {
			val.trackedData.setKDMaps();

			if (GetPlayerSlotState(val.getPlayer()) == PLAYER_SLOT_STATE_PLAYING) {
				val.status.set(PLAYER_STATUS.ALIVE);
			} else {
				val.status.set(PLAYER_STATUS.LEFT);

				PlayerManager.getInstance().players.delete(val.getPlayer());
			}
		});
	}
}
