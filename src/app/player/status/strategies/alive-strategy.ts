import { ActivePlayer } from '../../types/active-player';
import { PLAYER_STATUS } from '../status-enum';
import { StatusStrategy } from './status-strategy';
import { EventEmitter } from 'src/app/utils/events/event-emitter';
import { EVENT_ON_PLAYER_ALIVE } from 'src/app/utils/events/event-constants';

export class AliveStrategy implements StatusStrategy {
	run(gamePlayer: ActivePlayer): void {
		if (GetPlayerSlotState(gamePlayer.getPlayer()) == PLAYER_SLOT_STATE_LEFT) return gamePlayer.status.set(PLAYER_STATUS.LEFT);
		EventEmitter.getInstance().emit(EVENT_ON_PLAYER_ALIVE, gamePlayer);
	}
}
