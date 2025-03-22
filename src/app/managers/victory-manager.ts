import { ActivePlayer } from '../player/types/active-player';
import { RegionToCity } from '../city/city-map';
import { CITIES_TO_WIN_RATIO, OVERTIME_MODIFIER } from 'src/configs/game-settings';
import { WinTracker } from '../game/services/win-tracker';
import { GlobalGameData } from '../game/state/global-game-state';
import { PLAYER_STATUS } from '../player/status/status-enum';
import { PlayerManager } from '../player/player-manager';
import { TeamManager } from '../teams/team-manager';
import { OvertimeManager } from './overtime-manager';

export type VictoryProgressState = 'UNDECIDED' | 'TIE' | 'DECIDED';

export class VictoryManager {
	private static instance: VictoryManager;
	public static CITIES_TO_WIN: number;
	public static OVERTIME_ACTIVE: boolean = false;
	public static OVERTIME_TOTAL_TURNS: number = 0;
	public static OVERTIME_TURNS_UNTIL_ACTIVE: number = 0;
	public static GAME_VICTORY_STATE: VictoryProgressState = 'UNDECIDED';

	private winTracker: WinTracker;

	private constructor() {
		this.winTracker = new WinTracker();

		// since gameTimer is not set yet and CalculateCitiesToWin relies on the gameTimer, we need to manually set the cities to win
		VictoryManager.CITIES_TO_WIN = Math.ceil(RegionToCity.size * CITIES_TO_WIN_RATIO);

		VictoryManager.OVERTIME_ACTIVE = false;
	}

	public static getInstance(): VictoryManager {
		if (this.instance == null) {
			this.instance = new VictoryManager();
		}

		return this.instance;
	}

	public removePlayer(player: ActivePlayer, status: PLAYER_STATUS) {
		PlayerManager.getInstance().setPlayerStatus(player.getPlayer(), status);
		this.checkKnockOutVictory();
	}

	public setLeader(player: ActivePlayer) {
		if (player.trackedData.cities.cities.length > GlobalGameData.leader.trackedData.cities.cities.length) {
			GlobalGameData.leader = player;
		}
	}

	// This function is used to get the players who have a certain number of cities or more
	public getOwnershipByThresholdDescending(threshold: number): ActivePlayer[] {
		return Array.from(PlayerManager.getInstance().playersAliveOrNomad.values())
			.filter((player) => player.trackedData.cities.cities.length >= threshold)
			.sort((a, b) => b.trackedData.cities.cities.length - a.trackedData.cities.cities.length);
	}

	// This function is used to get the players who have won with the most cities (many players can have the same number of cities)
	public victors(): ActivePlayer[] {
		let potentialVictors = this.getOwnershipByThresholdDescending(VictoryManager.CITIES_TO_WIN);

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
		if (OvertimeManager.isOvertimeEnabled()) {
			VictoryManager.OVERTIME_TURNS_UNTIL_ACTIVE = OvertimeManager.getOvertimeSettingValue() - GlobalGameData.turnCount;
			VictoryManager.OVERTIME_TOTAL_TURNS = GlobalGameData.turnCount - OvertimeManager.getOvertimeSettingValue();
		}

		if (OvertimeManager.isOvertimeEnabled() && GlobalGameData.turnCount >= OvertimeManager.getOvertimeSettingValue()) {
			VictoryManager.OVERTIME_ACTIVE = true;
			return Math.ceil(RegionToCity.size * CITIES_TO_WIN_RATIO) - OVERTIME_MODIFIER * VictoryManager.OVERTIME_TOTAL_TURNS;
		}

		return Math.ceil(RegionToCity.size * CITIES_TO_WIN_RATIO);
	}

	public checkKnockOutVictory(): boolean {
		const activeTeams = TeamManager.getInstance().getActiveTeams();
		if (activeTeams.length <= 1) {
			GlobalGameData.leader = activeTeams[0].getMembersSortedByIncome()[0];
			this.saveStats();
			return true;
		}

		if (PlayerManager.getInstance().playersAliveOrNomad.size <= 1) {
			GlobalGameData.leader = Array.from(PlayerManager.getInstance().playersAliveOrNomad.values())[0];
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
		this.winTracker.addWinForEntity(GlobalGameData.leader.getPlayer());
	}

	public saveStats() {
		VictoryManager.GAME_VICTORY_STATE = 'DECIDED';
		PlayerManager.getInstance().playersAliveOrNomad.forEach((player) => {
			if (player.trackedData.turnDied == -1) {
				player.setEndData();
			}
		});
	}
}
