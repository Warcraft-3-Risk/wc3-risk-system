import { StatusStrategy } from './status-strategy';
import { GamePlayer } from '../../game-player';

export class AliveStrategy implements StatusStrategy {
	run(gamePlayer: GamePlayer): void {
		// if (GetPlayerSlotState(gamePlayer.getPlayer()) == PLAYER_SLOT_STATE_LEFT) return gamePlayer.getStatus().set(PLAYER_STATUS.LEFT);
		// gamePlayer.getStatus().status = PLAYER_STATUS.ALIVE;
		// gamePlayer.getData().getIncome().income = STARTING_INCOME;
		// if (gamePlayer.getData().getIncome().max == 0) {
		// 	gamePlayer.getData().getIncome().max = STARTING_INCOME;
		// }
	}
}
