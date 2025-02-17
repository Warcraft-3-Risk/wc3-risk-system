import { StatusStrategy } from './status-strategy';
import { GamePlayer } from '../../game-player';

const STFU_DURATION: number = 300;

export class STFUStrategy implements StatusStrategy {
	run(gamePlayer: GamePlayer): void {
		// if (gamePlayer.getStatus().isNomad() || gamePlayer.getStatus().isAlive() || gamePlayer.getStatus().isSTFU()) return;
		// const oldStatus = gamePlayer.getStatus().status;
		// gamePlayer.getStatus().status = PLAYER_STATUS.STFU;
		// SetPlayerState(gamePlayer.getPlayer(), PLAYER_STATE_OBSERVER, 1);
		// gamePlayer.getStatus().statusDuration = STFU_DURATION;
		// const timedEventManager: TimedEventManager = TimedEventManager.getInstance();
		// const event: TimedEvent = timedEventManager.registerTimedEvent(gamePlayer.getStatus().statusDuration, () => {
		// 	if (GetPlayerSlotState(gamePlayer.getPlayer()) == PLAYER_SLOT_STATE_LEFT) {
		// 		gamePlayer.getStatus().set(PLAYER_STATUS.LEFT);
		// 		timedEventManager.removeTimedEvent(event);
		// 	} else if (gamePlayer.getStatus().statusDuration <= 1) {
		// 		SetPlayerState(gamePlayer.getPlayer(), PLAYER_STATE_OBSERVER, 0);
		// 		gamePlayer.getStatus().status = oldStatus;
		// 		timedEventManager.removeTimedEvent(event);
		// 	} else if (gamePlayer.getStatus().isAlive()) {
		// 		SetPlayerState(gamePlayer.getPlayer(), PLAYER_STATE_OBSERVER, 0);
		// 		timedEventManager.removeTimedEvent(event);
		// 	}
		// 	gamePlayer.getStatus().statusDuration--;
		// });
	}
}
