import { GameMode } from './game-mode/game-mode';
import { City } from '../city/city';
import { ActivePlayer } from '../player/types/active-player';
import { PlayGlobalSound } from '../utils/utils';
import { TURN_DURATION_IN_SECONDS, TICK_DURATION_IN_SECONDS } from 'src/configs/game-settings';
import { File } from 'w3ts';
import { HexColors } from '../utils/hex-colors';
import { MatchData } from './state/match-state';
import { EventEmitter } from '../utils/events/event-emitter';
import {
	EVENT_ON_REMATCH,
	EVENT_ON_IN_PROGRESS,
	EVENT_ON_CITY_CAPTURE,
	EVENT_ON_PLAYER_ALIVE,
	EVENT_ON_PLAYER_DEAD,
	EVENT_ON_PLAYER_FORFEIT,
	EVENT_ON_PLAYER_LEFT,
	EVENT_ON_PLAYER_NOMAD,
	EVENT_ON_PLAYER_STFU,
	EVENT_ON_UNIT_KILLED,
	EVENT_ON_POST_MATCH,
	EVENT_ON_PRE_MATCH,
	EVENT_SET_GAME_MODE,
	EVENT_ON_START_GAME,
	EVENT_START_GAME_LOOP,
	EVENT_ON_END_MATCH,
	EVENT_ON_CITY_SELECTED,
	EVENT_ON_CITY_DESELECTED,
} from '../utils/events/event-constants';
import { StandardGameMode } from './game-mode/modes/standard-game-mode';
import { GameType } from '../settings/strategies/game-type-strategy';
import { CapitalsGameMode } from './game-mode/modes/capitals-game-mode';

export class GameLoop {
	private static instance: GameLoop;
	private _gameMode: GameMode;
	private _matchLoopTimer: timer;

	private constructor() {
		this.registerEvents();
		this._matchLoopTimer = CreateTimer();
	}

	public static getInstance() {
		if (this.instance == null) {
			this.instance = new GameLoop();
		}

		return this.instance;
	}

	private registerEvents() {
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_ALIVE, (player: ActivePlayer) => this._gameMode.onPlayerAlive(player));
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_DEAD, (player: ActivePlayer) => this._gameMode.onPlayerDead(player));
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_LEFT, (player: ActivePlayer) => this._gameMode.onPlayerLeft(player));
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_NOMAD, (player: ActivePlayer) => this._gameMode.onPlayerNomad(player));
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_STFU, (player: ActivePlayer) => this._gameMode.onPlayerSTFU(player));
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_FORFEIT, (player: ActivePlayer) => this._gameMode.onPlayerForfeit(player));
		EventEmitter.getInstance().on(EVENT_ON_CITY_CAPTURE, (city: City, preOwner: ActivePlayer, owner: ActivePlayer) =>
			this._gameMode.onCityCapture(city, preOwner, owner)
		);
		EventEmitter.getInstance().on(EVENT_ON_UNIT_KILLED, (killingUnit: unit, dyingUnit: unit) =>
			this._gameMode.onUnitKilled(killingUnit, dyingUnit)
		);

		EventEmitter.getInstance().on(EVENT_ON_CITY_SELECTED, (city: City, player: player) => this._gameMode.onCitySelected(city, player));
		EventEmitter.getInstance().on(EVENT_ON_CITY_DESELECTED, (city: City, player: player) => this._gameMode.onCityDeselected(city, player));

		EventEmitter.getInstance().on(EVENT_ON_START_GAME, () => this._gameMode.onStartMatch());
		EventEmitter.getInstance().on(EVENT_ON_REMATCH, () => this._gameMode.onRematch());
		EventEmitter.getInstance().on(EVENT_SET_GAME_MODE, (gameType: GameType) => this.applyGameMode(gameType));

		EventEmitter.getInstance().on(EVENT_ON_PRE_MATCH, () => this._gameMode.onPreMatch());
		EventEmitter.getInstance().on(EVENT_ON_IN_PROGRESS, () => this._gameMode.onInProgress());
		EventEmitter.getInstance().on(EVENT_ON_POST_MATCH, () => this._gameMode.onPostMatch());
		EventEmitter.getInstance().on(EVENT_ON_END_MATCH, () => this._gameMode.onEndMatch());

		EventEmitter.getInstance().on(EVENT_START_GAME_LOOP, () => this.startGameLoop());
	}

	public applyGameMode(gameType: GameType) {
		this._gameMode = gameType === 'Standard' ? new StandardGameMode() : new CapitalsGameMode();
	}

	private startGameLoop() {
		MatchData.matchState = 'inProgress';
		this._gameMode.onStartTurn(MatchData.turnCount);
		// Start a timer that executes the game loop every second
		TimerStart(this._matchLoopTimer, TICK_DURATION_IN_SECONDS, true, () => {
			try {
				// Check if the match is over
				if (this._gameMode.isMatchOver()) {
					PauseTimer(this._matchLoopTimer);
					EventEmitter.getInstance().emit(EVENT_ON_END_MATCH);
					return;
				}

				// Check if a turn has ended
				this._gameMode.onTick(MatchData.tickCounter);

				if (MatchData.tickCounter <= 0) {
					this._gameMode.onEndTurn(MatchData.turnCount);
				}

				// Stop game loop if match is over
				if (this._gameMode.isMatchOver()) {
					PauseTimer(this._matchLoopTimer);
					EventEmitter.getInstance().emit(EVENT_ON_END_MATCH);
					return;
				}

				MatchData.tickCounter--;

				if (MatchData.tickCounter <= 0) {
					this._gameMode.onEndTurn(MatchData.turnCount);
					MatchData.tickCounter = TURN_DURATION_IN_SECONDS;
					MatchData.turnCount++;
					this._gameMode.onStartTurn(MatchData.turnCount);
				}
				this.updateUI();
			} catch (error) {
				File.write('errors', error as string);
				print('Error in Timer ' + error);
			}
		});
	}

	/**
	 * Update the UI elements related to the timer.
	 */
	private updateUI() {
		let tick: string = `${MatchData.tickCounter}`;

		if (MatchData.tickCounter <= 3) {
			tick = `${HexColors.RED}${MatchData.tickCounter}|r`;
			PlayGlobalSound('Sound\\Interface\\BattleNetTick.flac');
		}

		BlzFrameSetText(BlzGetFrameByName('ResourceBarUpkeepText', 0), tick);
		BlzFrameSetText(BlzGetFrameByName('ResourceBarSupplyText', 0), `${MatchData.turnCount}`);
	}
}
