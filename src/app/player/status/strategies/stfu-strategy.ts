import { ActivePlayer } from '../../types/active-player';
import { StatusStrategy } from './status-strategy';
import { EventEmitter } from 'src/app/utils/events/event-emitter';
import { EVENT_ON_PLAYER_STFU } from 'src/app/utils/events/event-constants';

export class STFUStrategy implements StatusStrategy {
	run(gamePlayer: ActivePlayer): void {
		if (gamePlayer.status.isNomad() || gamePlayer.status.isAlive() || gamePlayer.status.isSTFU()) return;
		EventEmitter.getInstance().emit(EVENT_ON_PLAYER_STFU, gamePlayer);
		// MatchGameLoop.getInstance().onPlayerSTFU(gamePlayer);
	}
}
