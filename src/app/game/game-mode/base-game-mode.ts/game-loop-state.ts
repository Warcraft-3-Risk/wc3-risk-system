import { StringToCountry } from 'src/app/country/country-map';
import { VictoryManager, VictoryProgressState } from 'src/app/managers/victory-manager';
import { CITIES_TO_WIN_WARNING_RATIO, TICK_DURATION_IN_SECONDS, TURN_DURATION_IN_SECONDS } from 'src/configs/game-settings';
import { File } from 'w3ts';
import { GlobalGameData } from '../../state/global-game-state';
import { updateTickUI } from '../utillity/update-ui';
import { BaseState } from '../state/base-state';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { NameManager } from 'src/app/managers/names/name-manager';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { HexColors } from 'src/app/utils/hex-colors';
import { GlobalMessage } from 'src/app/utils/messages';
import { City } from 'src/app/city/city';
import { StateData } from '../state/state-data';
import { PLAYER_COLOR_CODES_MAP } from 'src/app/utils/player-colors';
import { PlayerManager } from 'src/app/player/player-manager';
import { OvertimeManager } from 'src/app/managers/overtime-manager';
import { Team } from 'src/app/teams/team';

export class GameLoopState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		GlobalGameData.matchState = 'inProgress';
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
		FogEnable(false);
		BlzEnableSelections(false, false);
	}

	onStartTurn(turn: number): void {
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
				return `needs ${HexColors.RED}${VictoryManager.getCityCountWin() - candidate.trackedData.cities.cities.length}|r more to win!`;
			}
		}

		function playerAnnounceCandidate(candidate: ActivePlayer, state: VictoryProgressState): string {
			let line = `${NameManager.getInstance().getDisplayName(candidate.getPlayer())} owns ${HexColors.RED}${
				candidate.trackedData.cities.cities.length
			}|r cities and ${playerCityCountDescription(candidate, state)}`;

			return line;
		}

		function teamCityCountDescription(candidate: Team, state: VictoryProgressState) {
			if (state == 'TIE' && candidate.getCities() >= VictoryManager.getCityCountWin()) {
				return `is ${HexColors.RED}TIED|r to win!`;
			} else {
				return `needs ${HexColors.RED}${VictoryManager.getCityCountWin() - candidate.getCities()}|r more to win!`;
			}
		}

		function teamAnnounceCandidate(candidate: Team, state: VictoryProgressState): string {
			let line = `${HexColors.WHITE}Team ${candidate.getNumber()}|r owns ${HexColors.RED}${candidate.getCities()}|r cities and ${teamCityCountDescription(candidate, state)}`;

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
		const player = GetOwningPlayer(killingUnit);
		const colorString = PLAYER_COLOR_CODES_MAP.get(GetPlayerColor(player));

		if (GetOwningPlayer(killingUnit) == GetOwningPlayer(dyingUnit) && !IsUnitType(killingUnit, UNIT_TYPE_STRUCTURE)) {
			if (!IsFoggedToPlayer(GetUnitX(dyingUnit), GetUnitY(dyingUnit), GetLocalPlayer())) {
				const text = CreateTextTag();
				SetTextTagText(text, `${colorString}Denied`, 0.019);
				SetTextTagPos(text, GetUnitX(dyingUnit) - 140, GetUnitY(dyingUnit) + 20, 16.0);
				SetTextTagVisibility(text, true);
				SetTextTagFadepoint(text, 2.0);
				SetTextTagPermanent(text, false);
				SetTextTagLifespan(text, 3.0);
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

		VictoryManager.getInstance().updateAndGetGameState();

		if (VictoryManager.GAME_VICTORY_STATE == 'DECIDED') {
			GlobalGameData.matchState = 'postMatch';
		}
	}

	onPlayerForfeit(player: ActivePlayer): void {
		super.onPlayerForfeit(player);

		VictoryManager.getInstance().updateAndGetGameState();

		if (VictoryManager.GAME_VICTORY_STATE == 'DECIDED') {
			GlobalGameData.matchState = 'postMatch';
		}
	}
}
