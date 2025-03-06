import { GlobalGameData } from '../game/state/global-game-state';
import { ChatManager } from '../managers/chat-manager';
import { NameManager } from '../managers/names/name-manager';
import { PlayerManager } from '../player/player-manager';
import { ShuffleArray } from '../utils/utils';

export function NamesCommand(chatManager: ChatManager, playerManager: PlayerManager, nameManager: NameManager) {
	chatManager.addCmd(['-names', '-players'], () => {
		if (GlobalGameData.matchState != 'inProgress') return;

		const player: player = GetTriggerPlayer();
		const nameList: player[] = [];

		playerManager.players.forEach((player) => {
			if (player.status.isAlive() || player.status.isNomad()) {
				nameList.push(player.getPlayer());
			}
		});

		ShuffleArray(nameList);

		const namesTimer: timer = CreateTimer();

		TimerStart(namesTimer, 0.75, true, () => {
			if (nameList.length > 0) {
				DisplayTimedTextToPlayer(player, 0, 0, 5, `${nameManager.getBtag(nameList.pop())}`);
			} else {
				PauseTimer(namesTimer);
				DestroyTimer(namesTimer);
			}
		});
	});
}
