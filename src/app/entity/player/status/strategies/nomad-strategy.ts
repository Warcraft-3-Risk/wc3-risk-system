import { GamePlayer } from '../../game-player';
import { StatusStrategy } from './status-strategy';

export class NomadStrategy implements StatusStrategy {
	run(gamePlayer: GamePlayer): void {
		// if (gamePlayer.getStatus().isLeft()) return;
		// if (gamePlayer.getData().getUnits().size <= 0) return gamePlayer.getStatus().set(PLAYER_STATUS.DEAD);
		// gamePlayer.getStatus().status = PLAYER_STATUS.NOMAD;
		// gamePlayer.getData().getIncome().income = 4;
		// const tick: number = 1;
		// const nomadTimer: timer = CreateTimer();
		// gamePlayer.getStatus().statusDuration = 60;
		// TimerStart(nomadTimer, tick, true, () => {
		// 	if (!gamePlayer.getStatus().isAlive() && gamePlayer.getData().getCities().cities.length >= 1) {
		// 		if (GetPlayerSlotState(gamePlayer.getPlayer()) == PLAYER_SLOT_STATE_LEFT) {
		// 			gamePlayer.getStatus().set(PLAYER_STATUS.LEFT);
		// 		} else {
		// 			gamePlayer.getStatus().set(PLAYER_STATUS.ALIVE);
		// 			gamePlayer
		// 				.getData()
		// 				.getCountries()
		// 				.forEach((val, country) => {
		// 					if (country.getOwner() == gamePlayer.getPlayer()) {
		// 						gamePlayer.getData().getIncome().income += country.getCities().length;
		// 					}
		// 				});
		// 		}
		// 		PauseTimer(nomadTimer);
		// 		DestroyTimer(nomadTimer);
		// 	} else if (gamePlayer.getData().getCities().cities.length <= 0 && gamePlayer.getData().getUnits().size <= 0) {
		// 		if (GetPlayerSlotState(gamePlayer.getPlayer()) == PLAYER_SLOT_STATE_LEFT) {
		// 			gamePlayer.getStatus().set(PLAYER_STATUS.LEFT);
		// 		} else {
		// 			gamePlayer.getStatus().set(PLAYER_STATUS.DEAD);
		// 		}
		// 		PauseTimer(nomadTimer);
		// 		DestroyTimer(nomadTimer);
		// 	} else if (gamePlayer.getStatus().isNomad()) {
		// 		gamePlayer.getStatus().statusDuration--;
		// 		if (gamePlayer.getStatus().statusDuration <= 0 || gamePlayer.getData().getUnits().size <= 0) {
		// 			gamePlayer.getStatus().set(PLAYER_STATUS.DEAD);
		// 			PauseTimer(nomadTimer);
		// 			DestroyTimer(nomadTimer);
		// 		}
		// 	}
		// });
	}
}
