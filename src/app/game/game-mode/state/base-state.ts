import { City } from 'src/app/city/city';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { StateData } from './state-data';
import { EventEmitter } from 'src/app/utils/events/event-emitter';
import { EVENT_NEXT_STATE, EVENT_ON_PLAYER_DEAD, EVENT_QUEST_UPDATE_PLAYER_STATUS } from 'src/app/utils/events/event-constants';
import { GlobalGameData } from '../../state/global-game-state';
import {
	onPlayerAliveHandle,
	onPlayerDeadHandle,
	onPlayerLeftHandle,
	onPlayerNomadHandle,
	onPlayerSTFUHandle,
} from '../utillity/on-player-status';
import { updateGold } from '../utillity/update-ui';

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

	onPlayerDead(player: ActivePlayer, forfeit?: boolean): void {
		onPlayerDeadHandle(player, forfeit);
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
		EventEmitter.getInstance().emit(EVENT_ON_PLAYER_DEAD, player, true);
	}

	onCityCapture(city: City, preOwner: ActivePlayer, owner: ActivePlayer) {
		// Update soft gold cap display
		updateGold(owner.getPlayer(), GetPlayerState(owner.getPlayer(), PLAYER_STATE_RESOURCE_GOLD));
		updateGold(preOwner.getPlayer(), GetPlayerState(preOwner.getPlayer(), PLAYER_STATE_RESOURCE_GOLD));
	}

	onUnitKilled(killingUnit: unit, dyingUnit: unit) {}

	onCitySelected(city: City, player: player) {}

	onSwapGuard(targetedUnit: unit, city: City, triggerPlayer: player) {}

	nextState(stateData: T) {
		this.onExitState();
		EventEmitter.getInstance().emit(EVENT_NEXT_STATE, this.stateData);
	}
}
