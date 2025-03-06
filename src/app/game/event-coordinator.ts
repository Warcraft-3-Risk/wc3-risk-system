import { City } from '../city/city';
import { ActivePlayer } from '../player/types/active-player';
import { EventEmitter } from '../utils/events/event-emitter';
import {
	EVENT_ON_CITY_CAPTURE,
	EVENT_ON_PLAYER_ALIVE,
	EVENT_ON_PLAYER_DEAD,
	EVENT_ON_PLAYER_FORFEIT,
	EVENT_ON_PLAYER_LEFT,
	EVENT_ON_PLAYER_NOMAD,
	EVENT_ON_PLAYER_STFU,
	EVENT_ON_UNIT_KILLED,
	EVENT_SET_GAME_MODE,
	EVENT_ON_CITY_SELECTED,
	EVENT_QUEST_UPDATE_PLAYER_STATUS,
	EVENT_NEXT_STATE,
	EVENT_ON_PLAYER_RESTART,
} from '../utils/events/event-constants';
import { StandardMode } from './game-mode/mode/standard-mode';
import { GameType } from '../settings/strategies/game-type-strategy';
import { Quests } from '../quests/quests';
import { BaseMode } from './game-mode/mode/base-mode';
import { StateData } from './game-mode/state/state-data';
import { CapitalsMode } from './game-mode/mode/capitals-mode';

export class EventCoordinator {
	private static instance: EventCoordinator;
	private _currentMode: BaseMode<StateData>;

	private constructor() {
		this.registerEvents();
	}

	public static getInstance() {
		if (this.instance == null) {
			this.instance = new EventCoordinator();
		}

		return this.instance;
	}

	private registerEvents() {
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_ALIVE, (player: ActivePlayer) =>
			this._currentMode?.getCurrentState().onPlayerAlive(player)
		);
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_DEAD, (player: ActivePlayer) =>
			this._currentMode?.getCurrentState().onPlayerDead(player)
		);
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_LEFT, (player: ActivePlayer) =>
			this._currentMode?.getCurrentState().onPlayerLeft(player)
		);
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_NOMAD, (player: ActivePlayer) =>
			this._currentMode?.getCurrentState().onPlayerNomad(player)
		);
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_STFU, (player: ActivePlayer) =>
			this._currentMode?.getCurrentState().onPlayerSTFU(player)
		);
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_FORFEIT, (player: ActivePlayer) =>
			this._currentMode?.getCurrentState().onPlayerForfeit(player)
		);
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_RESTART, (player: ActivePlayer) =>
			this._currentMode?.getCurrentState().onPlayerRestart(player)
		);
		EventEmitter.getInstance().on(EVENT_ON_CITY_CAPTURE, (city: City, preOwner: ActivePlayer, owner: ActivePlayer) =>
			this._currentMode?.getCurrentState().onCityCapture(city, preOwner, owner)
		);
		EventEmitter.getInstance().on(EVENT_ON_UNIT_KILLED, (killingUnit: unit, dyingUnit: unit) =>
			this._currentMode?.getCurrentState().onUnitKilled(killingUnit, dyingUnit)
		);

		EventEmitter.getInstance().on(EVENT_ON_CITY_SELECTED, (city: City, player: player) =>
			this._currentMode?.getCurrentState().onCitySelected(city, player)
		);

		EventEmitter.getInstance().on(EVENT_SET_GAME_MODE, (gameType: GameType) => this.applyGameMode(gameType));

		EventEmitter.getInstance().on(EVENT_QUEST_UPDATE_PLAYER_STATUS, () => Quests.getInstance().UpdateShuffledPlayerListQuest());

		EventEmitter.getInstance().on(EVENT_NEXT_STATE, (data: StateData) => this._currentMode?.nextState(data));
	}

	public applyGameMode(gameType: GameType) {
		this._currentMode = gameType == 'Capitals' ? (this._currentMode = new CapitalsMode()) : new StandardMode();
		EventEmitter.getInstance().emit(EVENT_NEXT_STATE);
	}
}
