import { ActivePlayer } from '../player/types/active-player';
import { RegionToCity } from '../city/city-map';
import { CITIES_TO_WIN_RATIO, OVERTIME_MODIFIER } from 'src/configs/game-settings';
import { WinTracker } from '../game/services/win-tracker';
import { MatchData } from '../game/state/match-state';
import { PLAYER_STATUS } from '../player/status/status-enum';

export type VictoryProgressState = 'UNDECIDED' | 'TIE' | 'DECIDED';

export class VictoryManager {
	private static instance: VictoryManager;
	public static CITIES_TO_WIN: number;
	public static OVERTIME_ACTIVE: boolean = false;
	public static OVERTIME_MODE: boolean;
	public static OVERTIME_ACTIVE_AT_TURN: number;
	public static OVERTIME_TOTAL_TURNS: number = 0;
	public static OVERTIME_TURNS_UNTIL_ACTIVE: number = 0;
	public static GAME_VICTORY_STATE: VictoryProgressState = 'UNDECIDED';

	private winTracker: WinTracker;

	private constructor() {
		this.winTracker = new WinTracker();

		// since gameTimer is not set yet and CalculateCitiesToWin relies on the gameTimer, we need to manually set the cities to win
		VictoryManager.CITIES_TO_WIN = Math.ceil(RegionToCity.size * CITIES_TO_WIN_RATIO);

		VictoryManager.OVERTIME_ACTIVE = false;
		VictoryManager.OVERTIME_ACTIVE_AT_TURN = 0;
	}

	public static getInstance(): VictoryManager {
		if (this.instance == null) {
			this.instance = new VictoryManager();
		}

		return this.instance;
	}

	public removePlayer(player: ActivePlayer, status: PLAYER_STATUS) {
		MatchData.setPlayerStatus(player, status);
		this.checkKnockOutVictory();
	}

	public setLeader(player: ActivePlayer) {
		if (player.trackedData.cities.cities.length > MatchData.leader.trackedData.cities.cities.length) {
			MatchData.leader = player;
		}
	}

	public getFrontRunnersByThreshold(threshold: number): ActivePlayer[] {
		return MatchData.remainingPlayers
			.filter((player) => player.trackedData.cities.cities.length >= threshold)
			.sort((player) => player.trackedData.cities.cities.length);
	}

	public victors(): ActivePlayer[] {
		let potentialVictors = MatchData.remainingPlayers.filter((x) => x.trackedData.cities.cities.length >= VictoryManager.CITIES_TO_WIN);

		if (potentialVictors.length == 0) {
			return [];
		}

		let max = potentialVictors.sort((x) => x.trackedData.cities.cities.length)[0].trackedData.cities.cities.length;
		return potentialVictors.filter((x) => x.trackedData.cities.cities.length == max);
	}

	public updateAndGetGameState(): VictoryProgressState {
		this.updateRequiredCityCount();

		let playerWinCandidates = this.victors();

		if (playerWinCandidates.length == 0) {
			VictoryManager.GAME_VICTORY_STATE = 'UNDECIDED';
		} else if (playerWinCandidates.length == 1) {
			VictoryManager.GAME_VICTORY_STATE = 'DECIDED';
		} else {
			VictoryManager.GAME_VICTORY_STATE = 'TIE';
		}

		return VictoryManager.GAME_VICTORY_STATE;
	}

	public updateRequiredCityCount() {
		VictoryManager.CITIES_TO_WIN = this.calculateCitiesToWin();
	}

	private calculateCitiesToWin(): number {
		if (VictoryManager.OVERTIME_MODE) {
			VictoryManager.OVERTIME_TURNS_UNTIL_ACTIVE = VictoryManager.OVERTIME_ACTIVE_AT_TURN - MatchData.turnCount;
			VictoryManager.OVERTIME_TOTAL_TURNS = MatchData.turnCount - VictoryManager.OVERTIME_ACTIVE_AT_TURN;
		}

		if (VictoryManager.OVERTIME_MODE && MatchData.turnCount >= VictoryManager.OVERTIME_ACTIVE_AT_TURN) {
			VictoryManager.OVERTIME_ACTIVE = true;
			return Math.ceil(RegionToCity.size * CITIES_TO_WIN_RATIO) - OVERTIME_MODIFIER * VictoryManager.OVERTIME_TOTAL_TURNS;
		}

		return Math.ceil(RegionToCity.size * CITIES_TO_WIN_RATIO);
	}

	public checkKnockOutVictory(): boolean {
		if (MatchData.remainingPlayers.length == 1) {
			MatchData.leader = MatchData.remainingPlayers[0];
			this.saveStats();
			return true;
		}

		return false;
	}

	public reset() {
		VictoryManager.OVERTIME_ACTIVE = false;
		VictoryManager.GAME_VICTORY_STATE = 'UNDECIDED';
	}

	public updateWinTracker() {
		this.winTracker.addWinForEntity(MatchData.leader.getPlayer());
	}

	public saveStats() {
		VictoryManager.GAME_VICTORY_STATE = 'DECIDED';
		MatchData.remainingPlayers.forEach((player) => {
			if (player.trackedData.turnDied == -1) {
				player.setEndData();
			}
		});
	}
}
