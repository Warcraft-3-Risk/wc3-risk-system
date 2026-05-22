import { StringToCountry } from 'src/app/country/country-map';
import { VictoryManager, VictoryProgressState } from 'src/app/managers/victory-manager';
import {
	CITIES_TO_WIN_WARNING_RATIO,
	TICK_DURATION_IN_SECONDS,
	TURN_DURATION_IN_SECONDS,
	VICTORY_POINT_CITY_THRESHOLD,
	VICTORY_POINTS_PER_TURN,
} from 'src/configs/game-settings';
import { File } from 'w3ts';
import { GlobalGameData } from '../../state/global-game-state';
import { updateTickUI } from '../utillity/update-ui';
import { BaseState } from '../state/base-state';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { HexColors } from 'src/app/utils/hex-colors';
import { GlobalMessage } from 'src/app/utils/messages';
import { City } from 'src/app/city/city';
import { StateData } from '../state/state-data';
import { PLAYER_COLOR_CODES_MAP } from 'src/app/utils/player-colors';
import { PlayerManager } from 'src/app/player/player-manager';
import { isOvertimeActive } from 'src/app/managers/overtime-logic';
import { Team } from 'src/app/teams/team';
import { SettingsContext } from 'src/app/settings/settings-context';
import { debugPrint } from 'src/app/utils/debug-print';
import { DC, DEBUG_PRINTS } from 'src/configs/game-settings';
import { FogManager } from 'src/app/managers/fog-manager';
import { AnnounceOnLocation } from '../../announcer/announce';
import { ParticipantEntityManager } from 'src/app/utils/participant-entity';
import { ReplayManager } from 'src/app/statistics/replay-manager';
import { SharedSlotManager } from '../../services/shared-slot-manager';
import { IncomeManager } from 'src/app/managers/income-manager';
import { RatingManager } from 'src/app/rating/rating-manager';
import { StatisticsController } from 'src/app/statistics/statistics-controller';
import { applyEliminatedBuff } from '../utillity/on-player-status';
import { EventEmitter } from 'src/app/utils/events/event-emitter';
import { EVENT_ON_PLAYER_RESTART } from 'src/app/utils/events/event-constants';
import { shouldAwardVictoryPoint } from 'src/app/managers/victory-point-logic';

export class GameLoopState<T extends StateData> extends BaseState<T> {
	private matchLoopTimer?: timer;
	private hasFinishedMatchLoop = false;

	onEnterState() {
		GlobalGameData.matchState = 'inProgress';
		this.hasFinishedMatchLoop = false;

		// Capture initial game data for rating calculations
		// This locks in player count and ratings at game start - never changes during game
		const ratingManager = RatingManager.getInstance();
		if (ratingManager.isRankedGame()) {
			ratingManager.captureInitialGameData(GlobalGameData.matchPlayers);

			// Save initial pending entry immediately so crash recovery works
			// even if a player crashes before the first turn ends
			const statsModel = StatisticsController.getInstance().getModel();
			statsModel.setData();
			ratingManager.saveRatingsInProgress(statsModel.getRanks(), 0);
		}

		ReplayManager.getInstance().onRoundStart();

		this.onStartTurn(GlobalGameData.turnCount);

		this.matchLoopTimer = CreateTimer();

		updateTickUI();

		TimerStart(this.matchLoopTimer, TICK_DURATION_IN_SECONDS, true, () => {
			try {
				// End game if only one player is remaining
				this.endIfLastActivePlayer();

				// Check if the match is over
				if (this.isMatchOver()) {
					this.finishMatchLoop();
					return;
				}

				// Check if a turn has ended
				this.onTick(GlobalGameData.tickCounter);

				// Stop game loop if match is over
				if (this.isMatchOver()) {
					this.finishMatchLoop();
					return;
				}

				GlobalGameData.tickCounter--;

				if (GlobalGameData.tickCounter <= 0) {
					this.onEndTurn(GlobalGameData.turnCount);
					GlobalGameData.tickCounter = TURN_DURATION_IN_SECONDS;
					GlobalGameData.turnCount++;
					this.onStartTurn(GlobalGameData.turnCount);
				}
				updateTickUI();
			} catch (error) {
				File.write('errors', error as string);
				if (DEBUG_PRINTS.master) debugPrint('Error in Timer ' + error, DC.gameMode);
			}
		});
	}

	private finishMatchLoop(): boolean {
		if (this.hasFinishedMatchLoop) return false;
		this.hasFinishedMatchLoop = true;

		if (this.matchLoopTimer) {
			PauseTimer(this.matchLoopTimer);
			DestroyTimer(this.matchLoopTimer);
			this.matchLoopTimer = undefined;
		}

		this.nextState(this.stateData);
		return true;
	}

	endIfLastActivePlayer(): boolean {
		VictoryManager.getInstance().haveAllOpponentsBeenEliminated((_) => {
			VictoryManager.getInstance().updateAndGetGameState();
			GlobalGameData.matchState = 'postMatch';
			return true;
		});

		return false;
	}

	isMatchOver(): boolean {
		return GlobalGameData.matchState === 'postMatch';
	}

	onExitState(): void {
		GlobalGameData.matchState = 'postMatch';
		BlzEnableSelections(false, false);
	}

	updateFogSettings(turn: number): void {
		if (!SettingsContext.getInstance().isNightFogOn()) {
			return;
		}

		// Match day/night cycle to 2 turns
		SetTimeOfDayScale(2);

		// First turn should always be half day
		if (turn === 0) {
			if (DEBUG_PRINTS.master) debugPrint('first turn, turning off fog', DC.gameMode);
			SetTimeOfDay(12.0);
			FogManager.getInstance().turnFogOff();
			return;
		}

		const phase = (turn - 1) % 4;

		// 0 = dusk
		// 1 = night
		// 2 = dawn
		// 3 = day

		// dusk
		if (phase === 0) {
			if (DEBUG_PRINTS.master) debugPrint('Phase is dusk (0), turning on fog', DC.gameMode);
			SetTimeOfDay(18.0);
			FogManager.getInstance().turnFogOn();
			return;
		}

		if (phase === 1) {
			if (DEBUG_PRINTS.master) debugPrint('Phase is night (1), turning on fog', DC.gameMode);
			SetTimeOfDay(0.0);
			FogManager.getInstance().turnFogOn();
			return;
		}

		if (phase === 2) {
			if (DEBUG_PRINTS.master) debugPrint('Phase is dawn (2), turning off fog', DC.gameMode);
			SetTimeOfDay(6.0);
			FogManager.getInstance().turnFogOff();
			return;
		}

		if (phase === 3) {
			if (DEBUG_PRINTS.master) debugPrint('Phase is day (3), turning off fog', DC.gameMode);
			SetTimeOfDay(12.0);
			FogManager.getInstance().turnFogOff();
			return;
		}
	}

	onStartTurn(turn: number): void {
		this.updateFogSettings(turn);
		if (DEBUG_PRINTS.master) debugPrint(`[Redistribute] Triggered by: turn start (turn ${turn})`, DC.redistribute);
		const changed = SharedSlotManager.getInstance().evaluateAndRedistribute();
		if (DEBUG_PRINTS.master)
			debugPrint(`GameLoopState: Slot redistribution on turn start: ${changed ? 'changes made' : 'no changes'}`, DC.redistribute);

		if (DEBUG_PRINTS.master) debugPrint(`[SharedSlots] === Turn ${turn} Slot Summary ===`, DC.sharedSlots);
		SharedSlotManager.getInstance().debugPrintSlotCounts();

		if (!changed) {
			ScoreboardManager.getInstance().updateFull(Array.from(PlayerManager.getInstance().players.values()), SettingsContext.getInstance().isFFA());
		}
		ScoreboardManager.getInstance().updateScoreboardTitle();
		GlobalGameData.matchPlayers
			.filter((x) => x.status.isActive())
			.forEach((player) => {
				IncomeManager.giveIncome(player);
			});

		StringToCountry.forEach((country) => {
			country.getSpawn().step();
		});

		this.messageGameState();
		ReplayManager.getInstance().onTurnStart();
	}

	onEndTurn(turn: number): void {
		this.awardVictoryPoints();

		if (VictoryManager.GAME_VICTORY_STATE === 'DECIDED') {
			GlobalGameData.matchState = 'postMatch';
		}

		ScoreboardManager.getInstance().updateFull(Array.from(PlayerManager.getInstance().players.values()), SettingsContext.getInstance().isFFA());

		// Save preliminary ratings for crash recovery (only for ranked games)
		const ratingManager = RatingManager.getInstance();
		if (ratingManager.isRankedGame()) {
			const statsModel = StatisticsController.getInstance().getModel();
			statsModel.setData(); // Refresh the rankings
			const currentRanks = statsModel.getRanks();
			ratingManager.saveRatingsInProgress(currentRanks, turn);
		}

		// Refresh rating stats UI for all players to show updated K/D values
		// This runs REGARDLESS of ranked status so players can see their current game stats
		if (DEBUG_PRINTS.master)
			debugPrint(`GameLoopState.onEndTurn() - Refreshing rating stats UI for all players (turn ${turn})`, DC.gameMode);
		GlobalGameData.matchPlayers.forEach((player) => {
			if (player.ratingStatsUI) {
				player.ratingStatsUI.refresh();
			}
		});
	}

	private awardVictoryPoints(): void {
		if (VictoryManager.GAME_VICTORY_STATE === 'DECIDED') {
			return;
		}

		const participants = ParticipantEntityManager.getParticipantEntities();
		participants.forEach((participant) => {
			if (participant instanceof ActivePlayer && participant.status.isEliminated()) {
				return;
			}

			const cityCount = ParticipantEntityManager.getCityCount(participant);
			if (!shouldAwardVictoryPoint(cityCount, VICTORY_POINT_CITY_THRESHOLD)) {
				return;
			}

			ParticipantEntityManager.addVictoryPoints(participant, VICTORY_POINTS_PER_TURN);
		});
	}

	onTick(tick: number): void {
		VictoryManager.getInstance().updateAndGetGameState();

		ScoreboardManager.getInstance().updatePartial(Array.from(PlayerManager.getInstance().players.values()), SettingsContext.getInstance().isFFA());
	}

	private messageGameState() {
		let playersToAnnounce = VictoryManager.getInstance().getOwnershipByThresholdDescending(
			VictoryManager.getInstance().getCityCountWin() * CITIES_TO_WIN_WARNING_RATIO
		);

		// Filter out eliminated players from announcements
		playersToAnnounce = playersToAnnounce.filter((participant) => {
			if (participant instanceof ActivePlayer) {
				return !participant.status.isEliminated();
			}
			return true;
		});

		if (playersToAnnounce.length === 0) return;

		// Find the maximum effective city count among participants above win threshold (for determining actual ties)
		const winThreshold = VictoryManager.getInstance().getCityCountWin();
		let maxEffectiveCityCount = 0;
		playersToAnnounce.forEach((participant) => {
			const effectiveCities = ParticipantEntityManager.getEffectiveCityCount(participant);
			if (effectiveCities >= winThreshold && effectiveCities > maxEffectiveCityCount) {
				maxEffectiveCityCount = effectiveCities;
			}
		});

		function playerCityCountDescription(candidate: ActivePlayer, state: VictoryProgressState, maxCities: number) {
			const playerCities = candidate.trackedData.cities.cities.length;
			const playerVictoryPoints = candidate.trackedData.victoryPoints;
			const effectiveCities = playerCities + playerVictoryPoints;
			// Only show "TIED to win" if player has the maximum city count (actually tied)
			if (state === 'TIE' && effectiveCities >= VictoryManager.getInstance().getCityCountWin() && effectiveCities === maxCities) {
				return `is ${HexColors.RED}TIED|r to win!`;
			} else {
				const remainingCities = VictoryManager.getInstance().getCityCountWin() - effectiveCities;
				if (remainingCities < 0) {
					return `satisfies the effective city count to win!`;
				} else if (remainingCities === 0) {
					return `must maintain their effective city count this round to win!`;
				} else {
					return `needs ${HexColors.RED}${VictoryManager.getInstance().getCityCountWin() - effectiveCities}|r more to win!`;
				}
			}
		}

		function playerAnnounceCandidate(candidate: ActivePlayer, state: VictoryProgressState, maxCities: number): string {
			const cities = candidate.trackedData.cities.cities.length;
			const victoryPoints = candidate.trackedData.victoryPoints;
			const effectiveCities = cities + victoryPoints;
			const cityDisplay = victoryPoints > 0 ? `${cities} (+${victoryPoints} VP)` : `${cities}`;
			let line = `${ParticipantEntityManager.getDisplayName(candidate)} owns ${HexColors.RED}${cityDisplay}|r cities (effective ${HexColors.RED}${effectiveCities}|r) and ${playerCityCountDescription(candidate, state, maxCities)}`;

			return line;
		}

		function teamCityCountDescription(candidate: Team, state: VictoryProgressState, maxCities: number) {
			const teamCities = candidate.getCities();
			const teamVictoryPoints = candidate.getVictoryPoints();
			const effectiveCities = teamCities + teamVictoryPoints;
			// Only show "TIED to win" if team has the maximum city count (actually tied)
			if (state === 'TIE' && effectiveCities >= VictoryManager.getInstance().getCityCountWin() && effectiveCities === maxCities) {
				return `is ${HexColors.RED}TIED|r to win!`;
			} else {
				const remainingCities = VictoryManager.getInstance().getCityCountWin() - effectiveCities;
				if (remainingCities < 0) {
					return `satisfies the effective city count to win!`;
				} else if (remainingCities === 0) {
					return `must maintain their effective city count this round to win!`;
				} else {
					return `needs ${HexColors.RED}${VictoryManager.getInstance().getCityCountWin() - effectiveCities}|r more to win!`;
				}
			}
		}

		function teamAnnounceCandidate(candidate: Team, state: VictoryProgressState, maxCities: number): string {
			const cities = candidate.getCities();
			const victoryPoints = candidate.getVictoryPoints();
			const effectiveCities = cities + victoryPoints;
			const cityDisplay = victoryPoints > 0 ? `${cities} (+${victoryPoints} VP)` : `${cities}`;
			let line = `${ParticipantEntityManager.getDisplayName(candidate)}|r owns ${HexColors.RED}${cityDisplay}|r cities (effective ${HexColors.RED}${effectiveCities}|r) and ${teamCityCountDescription(candidate, state, maxCities)}`;

			return line;
		}

		const overtimeSetting = SettingsContext.getInstance().getOvertimeSetting();
		const tiedMessage =
			VictoryManager.GAME_VICTORY_STATE === 'TIE'
				? `${isOvertimeActive(GlobalGameData.turnCount, overtimeSetting) ? `${HexColors.RED}TIED!\nGAME EXTENDED BY ONE ROUND!|r` : ''}`
				: '';
		const overtimeMessage = isOvertimeActive(GlobalGameData.turnCount, overtimeSetting) ? `${HexColors.RED}OVERTIME!|r` : '';

		if (playersToAnnounce[0] instanceof Team) {
			const playerMessages = playersToAnnounce
				.map((player) => teamAnnounceCandidate(player as Team, VictoryManager.GAME_VICTORY_STATE, maxEffectiveCityCount))
				.join('\n');

			GlobalMessage([tiedMessage, overtimeMessage, playerMessages].join('\n\n'), 'Sound\\Interface\\ItemReceived.flac', 4);
		} else {
			const playerMessages = playersToAnnounce
				.map((player) => playerAnnounceCandidate(player as ActivePlayer, VictoryManager.GAME_VICTORY_STATE, maxEffectiveCityCount))
				.join('\n');

			GlobalMessage([tiedMessage, overtimeMessage, playerMessages].join('\n\n'), 'Sound\\Interface\\ItemReceived.flac', 4);
		}
	}

	onCityCapture(city: City, preOwner: ActivePlayer, owner: ActivePlayer): void {
		super.onCityCapture(city, preOwner, owner);
		ScoreboardManager.getInstance().updatePartial(Array.from(PlayerManager.getInstance().players.values()), SettingsContext.getInstance().isFFA());
		ScoreboardManager.getInstance().updateScoreboardTitle();
	}

	onUnitKilled(killingUnit: unit, dyingUnit: unit): void {
		const cm = SharedSlotManager.getInstance();
		const killingUnitOwner = cm.getOwnerOfUnit(killingUnit);
		const colorString = PLAYER_COLOR_CODES_MAP.get(GetPlayerColor(killingUnitOwner));

		if (killingUnitOwner === cm.getOwnerOfUnit(dyingUnit) && !IsUnitType(killingUnit, UNIT_TYPE_STRUCTURE)) {
			if (!IsFoggedToPlayer(GetUnitX(dyingUnit), GetUnitY(dyingUnit), GetLocalPlayer())) {
				AnnounceOnLocation(`${colorString}Denied`, GetUnitX(dyingUnit), GetUnitY(dyingUnit) + 20, 2.0, 3.0);
			}
		}

		ScoreboardManager.getInstance().updatePartial(Array.from(PlayerManager.getInstance().players.values()), SettingsContext.getInstance().isFFA());
	}

	// GameLoopState uses GlobalGameData.matchState to determine if the match is over
	// This is preferable as it allows the state to clean up and transition to the next state
	onPlayerRestart(player: ActivePlayer) {
		if (GlobalGameData.matchState === 'postMatch') {
			if (this.finishMatchLoop()) {
				EventEmitter.getInstance().emit(EVENT_ON_PLAYER_RESTART, player);
			}
			return;
		}

		const humanPlayersCount: number = PlayerManager.getInstance().getHumanPlayersCount();
		if (humanPlayersCount === 1) {
			GlobalGameData.matchState = 'postMatch';
			this.finishMatchLoop();
		}
	}

	onSwapGuard(targetedUnit: unit, city: City, triggerPlayer: player): void {
		city.onCast(targetedUnit, triggerPlayer);
	}

	onPlayerLeft(player: ActivePlayer): void {
		super.onPlayerLeft(player);

		if (DEBUG_PRINTS.master) debugPrint(`[Redistribute] Triggered by: player left (${GetPlayerName(player.getPlayer())})`, DC.redistribute);

		// In FFA, apply a damage-over-time debuff to the eliminated player's units.
		// Units remain on the player's slot and slowly die off; slots are reclaimed organically.
		// In team games, teammates retain control of the eliminated player's units without debuff.
		if (SettingsContext.getInstance().isFFA()) applyEliminatedBuff(player.getPlayer());

		VictoryManager.getInstance().haveAllOpponentsBeenEliminated((_) => {
			VictoryManager.getInstance().updateAndGetGameState();
			GlobalGameData.matchState = 'postMatch';
		});
	}

	onPlayerForfeit(player: ActivePlayer): void {
		super.onPlayerForfeit(player);

		VictoryManager.getInstance().haveAllOpponentsBeenEliminated((_) => {
			VictoryManager.getInstance().updateAndGetGameState();
			GlobalGameData.matchState = 'postMatch';
		});
	}

	onPlayerDead(player: ActivePlayer, forfeit?: boolean): void {
		super.onPlayerDead(player, forfeit);

		if (DEBUG_PRINTS.master) debugPrint(`[Redistribute] Triggered by: player dead (${GetPlayerName(player.getPlayer())})`, DC.redistribute);

		// In FFA, apply a damage-over-time debuff to the eliminated player's units.
		// Units remain on the player's slot and slowly die off; slots are reclaimed organically.
		// In team games, teammates retain control of the eliminated player's units without debuff.
		if (SettingsContext.getInstance().isFFA()) applyEliminatedBuff(player.getPlayer());

		VictoryManager.getInstance().haveAllOpponentsBeenEliminated((_) => {
			VictoryManager.getInstance().updateAndGetGameState();
			GlobalGameData.matchState = 'postMatch';
		});
	}
}
