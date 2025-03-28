import { ActivePlayer } from '../../types/active-player';
import { StatusStrategy } from './status-strategy';
import { EventEmitter } from 'src/app/utils/events/event-emitter';
import { EVENT_ON_PLAYER_NOMAD } from 'src/app/utils/events/event-constants';

export class NomadStrategy implements StatusStrategy {
	run(gamePlayer: ActivePlayer): void {
		if (gamePlayer.status.isEliminated()) return;
		EventEmitter.getInstance().emit(EVENT_ON_PLAYER_NOMAD, gamePlayer);
	}
}
