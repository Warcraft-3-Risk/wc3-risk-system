import { StringToCountry } from 'src/app/country/country-map';
import { VictoryManager, VictoryProgressState } from 'src/app/managers/victory-manager';
import { CITIES_TO_WIN_WARNING_RATIO, TICK_DURATION_IN_SECONDS, TURN_DURATION_IN_SECONDS } from 'src/configs/game-settings';
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
import { OvertimeManager } from 'src/app/managers/overtime-manager';
import { Team } from 'src/app/teams/team';
import { SettingsContext } from 'src/app/settings/settings-context';
import { debugPrint } from 'src/app/utils/debug-print';
import { FogManager } from 'src/app/managers/fog-manager';
import { AnnounceOnLocation } from '../../announcer/announce';
import { ParticipantEntityManager } from 'src/app/utils/participant-entity';
import { ReplayManager } from 'src/app/statistics/replay-manager';
import { ClientManager } from '../../services/client-manager';

export class GameLoopState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		GlobalGameData.matchState = 'inProgress';

		ReplayManager.getInstance().onRoundStart();

		this.onStartTurn(GlobalGameData.turnCount);

		const _matchLoopTimer: timer = CreateTimer();

		updateTickUI();

		TimerStart(_matchLoopTimer, TICK_DURATION_IN_SECONDS, true, () => {
			try {
				// Check if the match is over
				if (this.isMatchOver()) {
					PauseTimer(_matchLoopTimer);
					DestroyTimer(_matchLoopTimer);
					this.nextState(this.stateData);
					return;
				}

				// Check if a turn has ended
				this.onTick(GlobalGameData.tickCounter);

				if (GlobalGameData.tickCounter <= 0) {
					this.onEndTurn(GlobalGameData.turnCount);
				}

				// Stop game loop if match is over
				if (this.isMatchOver()) {
					PauseTimer(_matchLoopTimer);
					DestroyTimer(_matchLoopTimer);
					this.nextState(this.stateData);
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
				print('Error in Timer ' + error);
			}
		});
	}

	isMatchOver(): boolean {
		return GlobalGameData.matchState == 'postMatch';
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
			debugPrint('first turn, turning off fog');
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
		if (phase == 0) {
			debugPrint('Phase is dusk (0), turning on fog');
			SetTimeOfDay(18.0);
			FogManager.getInstance().turnFogOn();
			return;
		}

		if (phase == 1) {
			debugPrint('Phase is night (1), turning on fog');
			SetTimeOfDay(0.0);
			FogManager.getInstance().turnFogOn();
			return;
		}

		if (phase == 2) {
			debugPrint('Phase is dawn (2), turning off fog');
			SetTimeOfDay(6.0);
			FogManager.getInstance().turnFogOff();
			return;
		}

		if (phase == 3) {
			debugPrint('Phase is day (3), turning off fog');
			SetTimeOfDay(12.0);
			FogManager.getInstance().turnFogOff();
			return;
		}
	}

	onStartTurn(turn: number): void {
		this.updateFogSettings(turn);
		const allocated = ClientManager.getInstance().allocateClientSlot();
		debugPrint(`GameLoopState: Client allocation on turn start: ${allocated ? 'successful' : 'not needed or failed'}`);
		// If a client was allocated, we need to update the scoreboard visibility and do a full update
		// This is to ensure that the scoreboard is correctly displayed for the newly allocated client
		if (allocated) {
			debugPrint('GameLoopState: Client allocated, updating scoreboard visibility and full update');
			ScoreboardManager.getInstance().toggleVisibility(false); // Required to prevent shared control clients from overriding the scoreboard
			ScoreboardManager.getInstance().toggleVisibility(true); // ^
			ScoreboardManager.getInstance().updateFull();
			debugPrint('GameLoopState: Scoreboard updated after client allocation');
		}
		ScoreboardManager.getInstance().updateFull();
		ScoreboardManager.getInstance().updateScoreboardTitle();
		GlobalGameData.matchPlayers
			.filter((x) => x.status.isActive())
			.forEach((player) => {
				player.giveGold();
			});

		StringToCountry.forEach((country) => {
			country.getSpawn().step();
		});

		this.messageGameState();
		ReplayManager.getInstance().onTurnStart();
	}

	onEndTurn(turn: number): void {
		if (VictoryManager.GAME_VICTORY_STATE == 'DECIDED') {
			GlobalGameData.matchState = 'postMatch';
		}

		ScoreboardManager.getInstance().updateFull();
	}

	onTick(tick: number): void {
		VictoryManager.getInstance().updateAndGetGameState();
		ScoreboardManager.getInstance().updatePartial();
	}

	private messageGameState() {
		let playersToAnnounce = VictoryManager.getInstance().getOwnershipByThresholdDescending(
			VictoryManager.getCityCountWin() * CITIES_TO_WIN_WARNING_RATIO
		);

		if (playersToAnnounce.length == 0) return;

		function playerCityCountDescription(candidate: ActivePlayer, state: VictoryProgressState) {
			if (state == 'TIE' && candidate.trackedData.cities.cities.length >= VictoryManager.getCityCountWin()) {
				return `is ${HexColors.RED}TIED|r to win!`;
			} else {
				const remainingCities = VictoryManager.getCityCountWin() - candidate.trackedData.cities.cities.length;
				if (remainingCities < 0) {
					return `satisfies the city count to win!`;
				} else if (remainingCities == 0) {
					return `must maintain their city count this round to win!`;
				} else {
					return `needs ${HexColors.RED}${VictoryManager.getCityCountWin() - candidate.trackedData.cities.cities.length}|r more to win!`;
				}
			}
		}

		function playerAnnounceCandidate(candidate: ActivePlayer, state: VictoryProgressState): string {
			let line = `${ParticipantEntityManager.getDisplayName(candidate)} owns ${HexColors.RED}${
				candidate.trackedData.cities.cities.length
			}|r cities and ${playerCityCountDescription(candidate, state)}`;

			return line;
		}

		function teamCityCountDescription(candidate: Team, state: VictoryProgressState) {
			if (state == 'TIE' && candidate.getCities() >= VictoryManager.getCityCountWin()) {
				return `is ${HexColors.RED}TIED|r to win!`;
			} else {
				const remainingCities = VictoryManager.getCityCountWin() - candidate.getCities();
				if (remainingCities < 0) {
					return `satisfies the city count to win!`;
				} else if (remainingCities == 0) {
					return `must maintain their city count this round to win!`;
				} else {
					return `needs ${HexColors.RED}${VictoryManager.getCityCountWin() - candidate.getCities()}|r more to win!`;
				}
			}
		}

		function teamAnnounceCandidate(candidate: Team, state: VictoryProgressState): string {
			let line = `${ParticipantEntityManager.getDisplayName(candidate)}|r owns ${HexColors.RED}${candidate.getCities()}|r cities and ${teamCityCountDescription(candidate, state)}`;

			return line;
		}

		const tiedMessage =
			VictoryManager.GAME_VICTORY_STATE == 'TIE'
				? `${OvertimeManager.isOvertimeActive() ? `${HexColors.RED}TIED!\nGAME EXTENDED BY ONE ROUND!|r` : ''}`
				: '';
		const overtimeMessage = OvertimeManager.isOvertimeActive() ? `${HexColors.RED}OVERTIME!|r` : '';

		if (playersToAnnounce[0] instanceof Team) {
			const playerMessages = playersToAnnounce
				.map((player) => teamAnnounceCandidate(player as Team, VictoryManager.GAME_VICTORY_STATE))
				.join('\n');

			GlobalMessage([tiedMessage, overtimeMessage, playerMessages].join('\n\n'), 'Sound\\Interface\\ItemReceived.flac', 4);
		} else {
			const playerMessages = playersToAnnounce
				.map((player) => playerAnnounceCandidate(player as ActivePlayer, VictoryManager.GAME_VICTORY_STATE))
				.join('\n');

			GlobalMessage([tiedMessage, overtimeMessage, playerMessages].join('\n\n'), 'Sound\\Interface\\ItemReceived.flac', 4);
		}
	}

	onCityCapture(city: City, preOwner: ActivePlayer, owner: ActivePlayer): void {
		ScoreboardManager.getInstance().updatePartial();
		ScoreboardManager.getInstance().updateScoreboardTitle();
	}

	onUnitKilled(killingUnit: unit, dyingUnit: unit): void {
		const killingUnitOwner = ClientManager.getInstance().getOwnerOfUnit(killingUnit);
		const colorString = PLAYER_COLOR_CODES_MAP.get(GetPlayerColor(killingUnitOwner));

		if (
			ClientManager.getInstance().getOwnerOfUnit(killingUnit) == GetOwningPlayer(dyingUnit) &&
			!IsUnitType(killingUnit, UNIT_TYPE_STRUCTURE)
		) {
			if (!IsFoggedToPlayer(GetUnitX(dyingUnit), GetUnitY(dyingUnit), GetLocalPlayer())) {
				AnnounceOnLocation(`${colorString}Denied`, GetUnitX(dyingUnit), GetUnitY(dyingUnit) + 20, 2.0, 3.0);
			}
		}

		ScoreboardManager.getInstance().updatePartial();
	}

	// GameLoopState uses GlobalGameData.matchState to determine if the match is over
	// This is preferable as it allows the state to clean up and transition to the next state
	onPlayerRestart(player: ActivePlayer) {
		const humanPlayersCount: number = PlayerManager.getInstance().getHumanPlayersCount();
		if (humanPlayersCount === 1) {
			GlobalGameData.matchState = 'postMatch';
		}
	}

	onSwapGuard(targetedUnit: unit, city: City, triggerPlayer: player): void {
		city.onCast(targetedUnit, triggerPlayer);
	}

	onPlayerLeft(player: ActivePlayer): void {
		super.onPlayerLeft(player);

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

	onPlayerDead(player: ActivePlayer): void {
		super.onPlayerDead(player);

		VictoryManager.getInstance().haveAllOpponentsBeenEliminated((_) => {
			VictoryManager.getInstance().updateAndGetGameState();
			GlobalGameData.matchState = 'postMatch';
		});
	}
}
