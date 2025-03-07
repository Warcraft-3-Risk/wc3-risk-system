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
		VictoryManager.getInstance().updateRequiredCityCount();
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

	onCityCapture(city: City, preOwner: ActivePlayer, owner: ActivePlayer): void {
		ScoreboardManager.getInstance().updatePartial();
		ScoreboardManager.getInstance().updateScoreboardTitle();
	}

	onUnitKilled(killingUnit: unit, dyingUnit: unit): void {
		ScoreboardManager.getInstance().updatePartial();
	}
}
