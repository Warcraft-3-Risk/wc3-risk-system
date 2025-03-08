import { City } from 'src/app/city/city';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { StateData } from './state-data';
import { EventEmitter } from 'src/app/utils/events/event-emitter';
import { EVENT_NEXT_STATE, EVENT_QUEST_UPDATE_PLAYER_STATUS } from 'src/app/utils/events/event-constants';
import { GlobalGameData } from '../../state/global-game-state';
import {
	onPlayerAliveHandle,
	onPlayerDeadHandle,
	onPlayerNomadHandle,
	onPlayerLeftHandle,
	onPlayerSTFUHandle,
	onPlayerForfeitHandle,
} from '../utillity/on-player-status';

export abstract class BaseState<T extends StateData> {
	get stateData(): T {
		return GlobalGameData.stateData as T;
	}

	set stateData(t: T) {
		GlobalGameData.stateData = t;
	}

	onEnterState() {}
	onExitState() {}

	onPlayerRestart(player: ActivePlayer) {}

	onPlayerAlive(player: ActivePlayer): void {
		onPlayerAliveHandle(player);
	}
	onPlayerDead(player: ActivePlayer): void {
		onPlayerDeadHandle(player);
		EventEmitter.getInstance().emit(EVENT_QUEST_UPDATE_PLAYER_STATUS);
	}
	onPlayerNomad(player: ActivePlayer): void {
		onPlayerNomadHandle(player);
	}
	onPlayerLeft(player: ActivePlayer): void {
		onPlayerLeftHandle(player);
		EventEmitter.getInstance().emit(EVENT_QUEST_UPDATE_PLAYER_STATUS);
	}
	onPlayerSTFU(player: ActivePlayer): void {
		onPlayerSTFUHandle(player);
	}
	onPlayerForfeit(player: ActivePlayer): void {
		onPlayerForfeitHandle(player);
		EventEmitter.getInstance().emit(EVENT_QUEST_UPDATE_PLAYER_STATUS);
	}

	onCityCapture(city: City, preOwner: ActivePlayer, owner: ActivePlayer) {}
	onUnitKilled(killingUnit: unit, dyingUnit: unit) {}

	onCitySelected(city: City, player: player) {}

	nextState(stateData: T) {
		this.onExitState();
		EventEmitter.getInstance().emit(EVENT_NEXT_STATE, this.stateData);
	}
}
