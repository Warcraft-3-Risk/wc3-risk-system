import { PlayerManager } from 'src/app/player/player-manager';
import { PLAYER_STATUS } from 'src/app/player/status/status-enum';
import { SlavePlayer } from 'src/app/player/types/slave-player';

export class PlayerSetupService {
	public run() {
		PlayerManager.getInstance().players.forEach((val) => {
			val.trackedData.setKDMaps();

			if (GetPlayerSlotState(val.getPlayer()) == PLAYER_SLOT_STATE_PLAYING) {
				val.status.set(PLAYER_STATUS.ALIVE);
			} else {
				val.status.set(PLAYER_STATUS.LEFT);

				PlayerManager.getInstance().slaves.set(val.getPlayer(), new SlavePlayer(val.getPlayer()));
				PlayerManager.getInstance().players.delete(val.getPlayer());
			}
		});
	}
}
