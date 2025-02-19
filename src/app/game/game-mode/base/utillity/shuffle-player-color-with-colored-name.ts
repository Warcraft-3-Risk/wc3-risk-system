import { NameManager } from 'src/app/managers/names/name-manager';
import { PlayerManager } from 'src/app/player/player-manager';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { SettingsContext } from 'src/app/settings/settings-context';
import { PLAYER_COLORS } from 'src/app/utils/player-colors';
import { ShuffleArray } from 'src/app/utils/utils';

//TODO Decide if we actually need this, the only use case would be if we let non promode games restart, but that should never really happen because people are not sitting around and waiting.
export function ShufflePlayerColorWithColoredName(): void {
	const activePlayers: Map<player, ActivePlayer> = PlayerManager.getInstance().players;
	const nameManager: NameManager = NameManager.getInstance();
	const colors: playercolor[] = PLAYER_COLORS.slice(0, activePlayers.size);

	ShuffleArray(colors);

	if (SettingsContext.getInstance().isPromode()) {
		activePlayers.forEach((val, playerHandle) => {
			nameManager.setColor(playerHandle, GetPlayerColor(playerHandle));
			nameManager.setName(playerHandle, 'acct');
			val.trackedData.bonus.disable();
		});

		SetMapFlag(MAP_LOCK_ALLIANCE_CHANGES, true);
		//TODO Handle teams for promode
	} else {
		activePlayers.forEach((val, playerHandle) => {
			nameManager.setColor(playerHandle, colors.pop());
			nameManager.setName(playerHandle, 'color');
		});
	}
}
