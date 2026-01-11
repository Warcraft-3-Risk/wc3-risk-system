import { GlobalGameData } from '../game/state/global-game-state';
import { ChatManager } from '../managers/chat-manager';
import { NameManager } from '../managers/names/name-manager';
import { PlayerManager } from '../player/player-manager';
import { ShuffleArray } from '../utils/utils';
import { RatingManager } from '../rating/rating-manager';
import { HexColors } from '../utils/hex-colors';

export function NamesCommand(chatManager: ChatManager, playerManager: PlayerManager, nameManager: NameManager) {
	chatManager.addCmd(['-names', '-players'], () => {
		if (GlobalGameData.matchState != 'inProgress' && GlobalGameData.matchState != 'preMatch') return;

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
				const p = nameList.pop();
				const btag = nameManager.getBtag(p);
				const activePlayer = playerManager.players.get(player);

				// Check if requesting player has opted out
				if (activePlayer && !activePlayer.options.showRating) {
					// Opted out - show no ratings
					DisplayTimedTextToPlayer(player, 0, 0, 5, `${btag}`);
				} else {
					const ratingManager = RatingManager.getInstance();
					if (ratingManager.isRankedGame()) {
						const rating = ratingManager.getPlayerRating(btag);
						DisplayTimedTextToPlayer(player, 0, 0, 5, `${btag} ${HexColors.TANGERINE}(${rating})|r`);
					} else {
						DisplayTimedTextToPlayer(player, 0, 0, 5, `${btag}`);
					}
				}
			} else {
				PauseTimer(namesTimer);
				DestroyTimer(namesTimer);
			}
		});
	});
}
