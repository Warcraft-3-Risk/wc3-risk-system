import { City } from '../city/city';
import { ActivePlayer } from '../player/types/active-player';
import { EventEmitter } from '../utils/events/event-emitter';
import {
	EVENT_NEXT_STATE,
	EVENT_ON_CITY_CAPTURE,
	EVENT_ON_CITY_SELECTED,
	EVENT_ON_PLAYER_ALIVE,
	EVENT_ON_PLAYER_DEAD,
	EVENT_ON_PLAYER_FORFEIT,
	EVENT_ON_PLAYER_LEFT,
	EVENT_ON_PLAYER_NOMAD,
	EVENT_ON_PLAYER_RESTART,
	EVENT_ON_PLAYER_STFU,
	EVENT_ON_SWAP_GUARD,
	EVENT_ON_UNIT_KILLED,
	EVENT_QUEST_UPDATE_PLAYER_STATUS,
	EVENT_SET_GAME_MODE,
} from '../utils/events/event-constants';
import { StandardMode } from './game-mode/mode/standard-mode';
import { GameType } from '../settings/strategies/game-type-strategy';
import { Quests } from '../quests/quests';
import { BaseMode } from './game-mode/mode/base-mode';
import { StateData } from './game-mode/state/state-data';
import { CapitalsMode } from './game-mode/mode/capitals-mode';
import { SettingsContext } from '../settings/settings-context';
import { PromodeMode } from './game-mode/mode/promode-mode';
import { EqualizedPromodeMode } from './game-mode/mode/equalized-promode-mode';
import { W3CMode } from './game-mode/mode/w3c-mode';
import { W3C_MODE_ENABLED } from '../utils/map-info';

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
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_DEAD, (player: ActivePlayer, forfeit?) =>
			this._currentMode?.getCurrentState().onPlayerDead(player, forfeit)
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

		EventEmitter.getInstance().on(EVENT_ON_SWAP_GUARD, (targetedUnit: unit, city: City, triggerPlayer: player) =>
			this._currentMode?.getCurrentState().onSwapGuard(targetedUnit, city, triggerPlayer)
		);

		EventEmitter.getInstance().on(EVENT_SET_GAME_MODE, (gameType: GameType) => this.applyGameMode(gameType));

		EventEmitter.getInstance().on(EVENT_QUEST_UPDATE_PLAYER_STATUS, () => Quests.getInstance().updatePlayersQuest());

		EventEmitter.getInstance().on(EVENT_NEXT_STATE, (data: StateData) => this._currentMode?.nextState(data));
	}

	public applyGameMode(gameType: GameType) {
		if (gameType == 'Capitals') {
			this._currentMode = new CapitalsMode();
		} else {
			if (W3C_MODE_ENABLED) {
				this._currentMode = new W3CMode();
			} else if (SettingsContext.getInstance().isEqualizedPromode()) {
				this._currentMode = new EqualizedPromodeMode();
			} else if (SettingsContext.getInstance().isPromode()) {
				this._currentMode = new PromodeMode();
			} else {
				this._currentMode = new StandardMode();
			}
		}
		EventEmitter.getInstance().emit(EVENT_NEXT_STATE);
	}
}
