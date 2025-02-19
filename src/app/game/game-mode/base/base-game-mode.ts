import { ActivePlayer } from 'src/app/player/types/active-player';
import { City } from 'src/app/city/city';
import { StringToCountry } from 'src/app/country/country-map';
import { NameManager } from 'src/app/managers/names/name-manager';
import { VictoryProgressState, VictoryManager } from 'src/app/managers/victory-manager';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { HexColors } from 'src/app/utils/hex-colors';
import { CountdownMessage, GlobalMessage } from 'src/app/utils/messages';
import { CITIES_TO_WIN_WARNING_RATIO, NOMAD_DURATION, STARTING_INCOME, STFU_DURATION } from 'src/configs/game-settings';
import { NEUTRAL_HOSTILE, PlayGlobalSound } from 'src/app/utils/utils';
import { SettingsContext } from 'src/app/settings/settings-context';
import { StatisticsController } from 'src/app/statistics/statistics-controller';
import { MatchData } from '../../state/match-state';
import { PLAYER_STATUS } from 'src/app/player/status/status-enum';
import {
	EVENT_ON_PLAYER_ALIVE,
	EVENT_ON_PLAYER_DEAD,
	EVENT_ON_PLAYER_FORFEIT,
	EVENT_ON_PLAYER_LEFT,
	EVENT_ON_PLAYER_NOMAD,
	EVENT_ON_PLAYER_STFU,
	EVENT_ON_CITY_CAPTURE,
	EVENT_ON_START_GAME,
	EVENT_ON_REMATCH,
	EVENT_ON_PRE_MATCH,
	EVENT_ON_IN_PROGRESS,
	EVENT_ON_POST_MATCH,
	EVENT_START_GAME_LOOP,
	EVENT_ON_UNIT_KILLED,
	EVENT_ON_END_MATCH,
} from 'src/app/utils/events/event-constants';
import { GameMode } from '../game-mode';
import { EventEmitter } from 'src/app/utils/events/event-emitter';
import { TimedEventManager } from 'src/app/libs/timer/timed-event-manager';
import { TimedEvent } from 'src/app/libs/timer/timed-event';
import { PlayerManager } from 'src/app/player/player-manager';
import { removeUnits } from './utillity/remove-units';
import { Wait } from 'src/app/utils/wait';
import { resumingUnits } from './utillity/resuming-units';
import { resetCountries } from './utillity/reset-countries';
import { TreeManager } from '../../services/tree-service';
import { setProModeTempVision } from './utillity/pro-mode-temp-vision';
import { debugPrint } from 'src/app/utils/debug-print';
import { RegionToCity } from 'src/app/city/city-map';
import { StandardDistributionService } from '../../services/distribution-service/standard-distribution-service';

export abstract class BaseGameMode implements GameMode {
	private _statsController: StatisticsController;
	private _scoreboardManager: ScoreboardManager;

	constructor() {
		this._statsController = StatisticsController.getInstance();
		this._scoreboardManager = ScoreboardManager.getInstance();
	}

	onPreMatch(): void {
		debugPrint(EVENT_ON_PRE_MATCH);
	}

	onInProgress(): void {
		debugPrint(EVENT_ON_IN_PROGRESS);
	}

	onPostMatch(): void {
		debugPrint(EVENT_ON_POST_MATCH);

		MatchData.matchState = 'postMatch';

		VictoryManager.getInstance().saveStats();

		// Hide match scoreboard and show score screen
		this._scoreboardManager.destroyBoards();
		PlayerManager.getInstance().players.forEach((player) => {
			if (SettingsContext.getInstance().isPromode()) {
				NameManager.getInstance().setName(player.getPlayer(), 'acct');
			} else {
				NameManager.getInstance().setName(player.getPlayer(), 'btag');
				player.trackedData.bonus.hideUI();
			}
		});
		if (SettingsContext.getInstance().isPromode()) {
			VictoryManager.getInstance().updateWinTracker();
		} else {
			this._statsController.refreshView();
			this._statsController.setViewVisibility(true);
			this._statsController.writeStatisticsData();
		}
	}

	isMatchOver(): boolean {
		return MatchData.matchState == 'postMatch';
	}

	async onStartMatch(): Promise<void> {
		await this.prepareMatch();
		MatchData.matchState = 'preMatch';

		await Wait.forSeconds(2);
		try {
			PlayGlobalSound('Sound\\Interface\\ArrangedTeamInvitation.flac');
			const startDelayTimer: timer = CreateTimer();
			let duration: number = 3;
			TimerStart(startDelayTimer, 1, true, () => {
				CountdownMessage(`The Game will start in:\n${duration}`);
				if (duration == 3) {
					BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), true);
				}
				if (duration <= 0) {
					PauseTimer(startDelayTimer);
					DestroyTimer(startDelayTimer);
					BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), false);
					EnableSelect(true, true);
					EnableDragSelect(true, true);
					PlayGlobalSound('Sound\\Interface\\Hint.flac');
					EventEmitter.getInstance().emit(EVENT_START_GAME_LOOP);
				}
				duration--;
			});
		} catch (error) {
			print('Error in Metagame ' + error);
		}
	}

	onEndMatch(): void {
		debugPrint(EVENT_ON_END_MATCH);
		MatchData.matchState = 'postMatch';
		FogEnable(false);
		BlzEnableSelections(false, false);
		EventEmitter.getInstance().emit(EVENT_ON_POST_MATCH);
	}

	onStartTurn(turn: number): void {
		this._scoreboardManager.updateFull();
		this._scoreboardManager.updateScoreboardTitle();
		PlayerManager.getInstance().playersAliveOrNomad.forEach((player) => {
			player.giveGold();
		});

		StringToCountry.forEach((country) => {
			country.getSpawn().step();
		});

		this.messageGameState();
	}

	onEndTurn(turn: number): void {
		if (VictoryManager.GAME_VICTORY_STATE == 'DECIDED') {
			MatchData.matchState = 'postMatch';
		}

		this._scoreboardManager.updateFull();
	}

	onTick(tick: number): void {
		VictoryManager.getInstance().updateAndGetGameState();
		this._scoreboardManager.updatePartial();
	}

	onPlayerAlive(player: ActivePlayer): void {
		debugPrint(EVENT_ON_PLAYER_ALIVE);
		player.status.status = PLAYER_STATUS.ALIVE;
		player.trackedData.income.income = STARTING_INCOME;

		if (player.trackedData.income.max == 0) {
			player.trackedData.income.max = STARTING_INCOME;
		}
		// MatchData.setPlayerStatus(player, PLAYER_STATUS.ALIVE);
		this._scoreboardManager.updatePartial();
	}

	onPlayerDead(player: ActivePlayer): void {
		debugPrint(EVENT_ON_PLAYER_DEAD);

		player.status.status = PLAYER_STATUS.DEAD;
		player.setEndData();
		player.trackedData.income.income = 1;
		// VictoryManager.getInstance().removePlayer(gamePlayer, PLAYER_STATUS.DEAD);

		GlobalMessage(
			`${NameManager.getInstance().getDisplayName(player.getPlayer())} has been defeated!`,
			'Sound\\Interface\\SecretFound.flac'
		);

		// MatchData.setPlayerStatus(player, PLAYER_STATUS.DEAD);
		if (VictoryManager.getInstance().checkKnockOutVictory()) {
			MatchData.matchState = 'postMatch';
		}
		this._scoreboardManager.updatePartial();
	}

	onPlayerNomad(player: ActivePlayer): void {
		debugPrint(EVENT_ON_PLAYER_NOMAD);
		PlayerManager.getInstance().setPlayerStatus(player.getPlayer(), PLAYER_STATUS.NOMAD);

		if (player.trackedData.units.size <= 0) {
			player.status.set(PLAYER_STATUS.DEAD);
			return;
		}

		player.status.status = PLAYER_STATUS.NOMAD;
		player.trackedData.income.income = 4;

		const tick: number = 1;
		const nomadTimer: timer = CreateTimer();
		player.status.statusDuration = NOMAD_DURATION;

		TimerStart(nomadTimer, tick, true, () => {
			if (!player.status.isAlive() && player.trackedData.cities.cities.length >= 1) {
				if (GetPlayerSlotState(player.getPlayer()) == PLAYER_SLOT_STATE_LEFT) {
					player.status.set(PLAYER_STATUS.LEFT);
				} else {
					player.status.set(PLAYER_STATUS.ALIVE);
					player.trackedData.countries.forEach((val, country) => {
						if (country.getOwner() == player.getPlayer()) {
							player.trackedData.income.income += country.getCities().length;
						}
					});
				}

				PauseTimer(nomadTimer);
				DestroyTimer(nomadTimer);
			} else if (player.trackedData.cities.cities.length <= 0 && player.trackedData.units.size <= 0) {
				if (GetPlayerSlotState(player.getPlayer()) == PLAYER_SLOT_STATE_LEFT) {
					player.status.set(PLAYER_STATUS.LEFT);
				} else {
					player.status.set(PLAYER_STATUS.DEAD);
				}

				PauseTimer(nomadTimer);
				DestroyTimer(nomadTimer);
			} else if (player.status.isNomad()) {
				player.status.statusDuration--;

				if (player.status.statusDuration <= 0 || player.trackedData.units.size <= 0) {
					player.status.set(PLAYER_STATUS.DEAD);
					PauseTimer(nomadTimer);
					DestroyTimer(nomadTimer);
				}
			}
		});

		this._scoreboardManager.updatePartial();
	}

	onPlayerLeft(player: ActivePlayer): void {
		debugPrint(EVENT_ON_PLAYER_LEFT);

		if (player.status.isDead() || player.status.isSTFU()) {
			player.status.status = PLAYER_STATUS.LEFT;
			return;
		}

		player.status.status = PLAYER_STATUS.LEFT;
		player.setEndData();
		player.trackedData.income.income = 0;
		GlobalMessage(
			`${NameManager.getInstance().getDisplayName(player.getPlayer())} has left the game!`,
			'Sound\\Interface\\SecretFound.flac'
		);

		// let previousStatus = MatchData.getPlayerStatus(player);
		// MatchData.setPlayerStatus(player, PLAYER_STATUS.LEFT);
	}

	onPlayerSTFU(player: ActivePlayer): void {
		debugPrint(EVENT_ON_PLAYER_STFU);

		const oldStatus = player.status.status;
		player.status.status = PLAYER_STATUS.STFU;
		SetPlayerState(player.getPlayer(), PLAYER_STATE_OBSERVER, 1);
		player.status.statusDuration = STFU_DURATION;

		const timedEventManager: TimedEventManager = TimedEventManager.getInstance();

		const event: TimedEvent = timedEventManager.registerTimedEvent(player.status.statusDuration, () => {
			if (GetPlayerSlotState(player.getPlayer()) == PLAYER_SLOT_STATE_LEFT) {
				player.status.set(PLAYER_STATUS.LEFT);
				timedEventManager.removeTimedEvent(event);
			} else if (player.status.statusDuration <= 1) {
				SetPlayerState(player.getPlayer(), PLAYER_STATE_OBSERVER, 0);
				player.status.status = oldStatus;
				timedEventManager.removeTimedEvent(event);
			} else if (player.status.isAlive()) {
				SetPlayerState(player.getPlayer(), PLAYER_STATE_OBSERVER, 0);
				timedEventManager.removeTimedEvent(event);
			}

			player.status.statusDuration--;
		});

		// MatchData.setPlayerStatus(player, PLAYER_STATUS.STFU);
		this._scoreboardManager.updatePartial();
	}

	onPlayerForfeit(player: ActivePlayer): void {
		debugPrint(EVENT_ON_PLAYER_FORFEIT);
		const playerStatus = PlayerManager.getInstance().getPlayerStatus(GetTriggerPlayer());
		if (playerStatus.isDead() || playerStatus.isLeft() || playerStatus.isSTFU()) return;

		PlayerManager.getInstance().setPlayerStatus(GetTriggerPlayer(), PLAYER_STATUS.DEAD);
		this._scoreboardManager.updatePartial();
	}

	onCityCapture(city: City, preOwner: ActivePlayer, owner: ActivePlayer): void {
		debugPrint(EVENT_ON_CITY_CAPTURE);
		this._scoreboardManager.updatePartial();
		this._scoreboardManager.updateScoreboardTitle();
	}

	onUnitKilled(killingUnit: unit, dyingUnit: unit): void {
		debugPrint(EVENT_ON_UNIT_KILLED);
		this._scoreboardManager.updatePartial();
	}

	onCitySelected(city: City, player: player): void {}

	onCityDeselected(city: City, player: player): void {}

	async prepareMatch(): Promise<void> {
		debugPrint('Preparing match...');

		FogEnable(false);
		MatchData.prepareMatchData();
		this._statsController.setViewVisibility(false);

		if (!SettingsContext.getInstance().isPromode()) {
			PlayerManager.getInstance().players.forEach((val) => {
				NameManager.getInstance().setName(val.getPlayer(), 'color');
				val.trackedData.reset();
			});
		}

		// Remove irrelevant players from the game
		PlayerManager.getInstance().players.forEach((val) => {
			val.trackedData.setKDMaps();
			if (GetPlayerSlotState(val.getPlayer()) == PLAYER_SLOT_STATE_PLAYING) {
				val.status.set(PLAYER_STATUS.ALIVE);
			} else {
				val.status.set(PLAYER_STATUS.LEFT);

				PlayerManager.getInstance().players.delete(val.getPlayer());
			}
		});

		// Prepare stat tracking
		const players: ActivePlayer[] = [...PlayerManager.getInstance().players.values()];
		players.forEach((player) => {
			SetPlayerState(player.getPlayer(), PLAYER_STATE_RESOURCE_GOLD, 0);
			player.status.set(PLAYER_STATUS.ALIVE);
			player.trackedData.bonus.showForPlayer(player.getPlayer());
			player.trackedData.bonus.repositon();

			if (MatchData.leader == null) {
				MatchData.leader = player;
			}
		});

		if (SettingsContext.getInstance().isFFA() || players.length <= 2) {
			ScoreboardManager.getInstance().ffaSetup(players);
		} else {
			ScoreboardManager.getInstance().teamSetup();
		}

		ScoreboardManager.getInstance().obsSetup(players, [...PlayerManager.getInstance().observers.keys()]);

		VictoryManager.getInstance().updateAndGetGameState();
		this._scoreboardManager.updateScoreboardTitle();

		EnableSelect(false, false);
		EnableDragSelect(false, false);
		FogEnable(true);

		// Distribute bases
		this.onDistributeBases();

		await setProModeTempVision();
	}

	onDistributeBases(): void {
		new StandardDistributionService().runDistro(() => {
			RegionToCity.forEach((city) => {
				city.guard.reposition();
				//Prevent guards from moving and update unit counts
				IssueImmediateOrder(city.guard.unit, 'stop');

				if (GetOwningPlayer(city.guard.unit) != NEUTRAL_HOSTILE) {
					PlayerManager.getInstance().players.get(GetOwningPlayer(city.guard.unit)).trackedData.units.add(city.guard.unit);
				}

				SetUnitInvulnerable(city.guard.unit, false);
			});
		});
	}

	async onRematch(): Promise<void> {
		debugPrint(EVENT_ON_REMATCH);
		FogEnable(false);
		MatchData.prepareMatchData();
		this._statsController.setViewVisibility(false);

		if (MatchData.matchCount == 1) {
		} else {
			print('Removing units...');
			removeUnits();
			await Wait.forSeconds(1);
			print('Resuming units...');
			resumingUnits();
			await Wait.forSeconds(1);
			//TODO why shuffle player color and names? rematch should only happen in promode in which case we dont want this
			//print('Shuffling player identities...');
			//ShufflePlayerColorWithColoredName();
			await Wait.forSeconds(1);
			print('Resetting countries...');
			resetCountries();
			await Wait.forSeconds(1);
			print('Resetting trees...');
			TreeManager.getInstance().reset();
			await Wait.forSeconds(1);
		}

		EventEmitter.getInstance().emit(EVENT_ON_START_GAME);
	}

	private messageGameState() {
		let playersToAnnounce = VictoryManager.getInstance().getOwnershipByThresholdDescending(
			VictoryManager.CITIES_TO_WIN * CITIES_TO_WIN_WARNING_RATIO
		);

		if (playersToAnnounce.length == 0) return;

		function cityCountDescription(candidate: ActivePlayer, state: VictoryProgressState) {
			if (state == 'TIE' && candidate.trackedData.cities.cities.length >= VictoryManager.CITIES_TO_WIN) {
				return `is ${HexColors.RED}TIED|r to win!`;
			} else {
				return `needs ${HexColors.RED}${VictoryManager.CITIES_TO_WIN - candidate.trackedData.cities.cities.length}|r more to win!`;
			}
		}

		function announceCandidate(candidate: ActivePlayer, state: VictoryProgressState): string {
			let line = `${NameManager.getInstance().getDisplayName(candidate.getPlayer())} owns ${HexColors.RED}${
				candidate.trackedData.cities.cities.length
			}|r cities and ${cityCountDescription(candidate, state)}`;

			return line;
		}

		const tiedMessage =
			VictoryManager.GAME_VICTORY_STATE == 'TIE'
				? `${VictoryManager.OVERTIME_ACTIVE ? `${HexColors.RED}TIED!\nGAME EXTENDED BY ONE ROUND!|r` : ''}`
				: '';
		const overtimeMessage = VictoryManager.OVERTIME_ACTIVE ? `${HexColors.RED}OVERTIME!|r` : '';
		const playerMessages = playersToAnnounce.map((player) => announceCandidate(player, VictoryManager.GAME_VICTORY_STATE)).join('\n');

		GlobalMessage([tiedMessage, overtimeMessage, playerMessages].join('\n\n'), 'Sound\\Interface\\ItemReceived.flac', 4);
	}
}
