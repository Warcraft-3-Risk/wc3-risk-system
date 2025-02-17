import { StatusStrategy } from './status-strategy';
import { GamePlayer } from '../../game-player';

export class LeftStrategy implements StatusStrategy {
	run(gamePlayer: GamePlayer): void {
		// if (gamePlayer.getStatus().isLeft()) return;
		// if (gamePlayer.getStatus().isDead() || gamePlayer.getStatus().isSTFU()) {
		// 	gamePlayer.getStatus().status = PLAYER_STATUS.LEFT;
		// 	return;
		// }
		// gamePlayer.getStatus().status = PLAYER_STATUS.LEFT;
		// gamePlayer.setEndData();
		// gamePlayer.getData().getIncome().income = 0;
		// GlobalMessage(
		// 	`${NameManager.getInstance().getDisplayName(gamePlayer.getPlayer())} has left the game!`,
		// 	'Sound\\Interface\\SecretFound.flac'
		// );
		// VictoryManager.getInstance().removePlayer(gamePlayer);
	}
}
