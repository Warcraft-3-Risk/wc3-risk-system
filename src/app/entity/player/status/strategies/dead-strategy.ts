import { StatusStrategy } from './status-strategy';
import { GamePlayer } from '../../game-player';

export class DeadStrategy implements StatusStrategy {
	run(gamePlayer: GamePlayer): void {
		// if (gamePlayer.getStatus().isDead() || gamePlayer.getStatus().isLeft()) return;
		// gamePlayer.getStatus().status = PLAYER_STATUS.DEAD;
		// gamePlayer.setEndData();
		// gamePlayer.getData().getIncome().income = 1;
		// VictoryManager.getInstance().removePlayer(gamePlayer);
		// GlobalMessage(
		// 	`${NameManager.getInstance().getDisplayName(gamePlayer.getPlayer())} has been defeated!`,
		// 	'Sound\\Interface\\SecretFound.flac'
		// );
	}
}
