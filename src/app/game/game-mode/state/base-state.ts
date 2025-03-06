import { City } from 'src/app/city/city';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { StateData } from './state-data';
import { EventEmitter } from 'src/app/utils/events/event-emitter';
import { EVENT_NEXT_STATE } from 'src/app/utils/events/event-constants';
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
	}
	onPlayerNomad(player: ActivePlayer): void {
		onPlayerNomadHandle(player);
	}
	onPlayerLeft(player: ActivePlayer): void {
		onPlayerLeftHandle(player);
	}
	onPlayerSTFU(player: ActivePlayer): void {
		onPlayerSTFUHandle(player);
	}
	onPlayerForfeit(player: ActivePlayer): void {
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
