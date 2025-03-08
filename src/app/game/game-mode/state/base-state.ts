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
		EventEmitter.getInstance().emit(EVENT_QUEST_UPDATE_PLAYER_STATUS);
		onPlayerDeadHandle(player);
	}
	onPlayerNomad(player: ActivePlayer): void {
		onPlayerNomadHandle(player);
	}
	onPlayerLeft(player: ActivePlayer): void {
		EventEmitter.getInstance().emit(EVENT_QUEST_UPDATE_PLAYER_STATUS);
		onPlayerLeftHandle(player);
	}
	onPlayerSTFU(player: ActivePlayer): void {
		onPlayerSTFUHandle(player);
	}
	onPlayerForfeit(player: ActivePlayer): void {
		EventEmitter.getInstance().emit(EVENT_QUEST_UPDATE_PLAYER_STATUS);
		onPlayerForfeitHandle(player);
	}

	onCityCapture(city: City, preOwner: ActivePlayer, owner: ActivePlayer) {}
	onUnitKilled(killingUnit: unit, dyingUnit: unit) {}

	onCitySelected(city: City, player: player) {}

	nextState(stateData: T) {
		this.onExitState();
		EventEmitter.getInstance().emit(EVENT_NEXT_STATE, this.stateData);
	}
}
