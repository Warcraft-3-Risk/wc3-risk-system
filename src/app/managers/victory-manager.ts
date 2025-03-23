import { ActivePlayer } from '../player/types/active-player';
import { RegionToCity } from '../city/city-map';
import { CITIES_TO_WIN_RATIO, OVERTIME_MODIFIER } from 'src/configs/game-settings';
import { WinTracker } from '../game/services/win-tracker';
import { GlobalGameData } from '../game/state/global-game-state';
import { PLAYER_STATUS } from '../player/status/status-enum';
import { PlayerManager } from '../player/player-manager';
import { TeamManager } from '../teams/team-manager';
import { OvertimeManager } from './overtime-manager';
import { SettingsContext } from '../settings/settings-context';
import { getCityCount, ParticipantEntity } from '../utils/participant-entity';

export type VictoryProgressState = 'UNDECIDED' | 'TIE' | 'DECIDED';

export class VictoryManager {
	private static instance: VictoryManager;
	public static GAME_VICTORY_STATE: VictoryProgressState = 'UNDECIDED';

	private winTracker: WinTracker;

	private constructor() {
		this.winTracker = new WinTracker();
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
	public getOwnershipByThresholdDescending(threshold: number): ParticipantEntity[] {
		if (SettingsContext.getInstance().isFFA()) {
			return Array.from(PlayerManager.getInstance().playersAliveOrNomad.values())
				.filter((player) => player.trackedData.cities.cities.length >= threshold)
				.sort((a, b) => b.trackedData.cities.cities.length - a.trackedData.cities.cities.length);
		} else {
			return TeamManager.getInstance()
				.getActiveTeams()
				.filter((team) => team.getCities() >= threshold)
				.sort((a, b) => b.getCities() - a.getCities());
		}
	}

	// This function is used to get the players who have won with the most cities (many players can have the same number of cities)
	public victors(): ParticipantEntity[] {
		let potentialVictors = this.getOwnershipByThresholdDescending(VictoryManager.getCityCountWin());

		if (potentialVictors.length == 0) {
			return [];
		}

		let max = getCityCount(potentialVictors.sort((x) => getCityCount(x))[0]);
		return potentialVictors.filter((x) => getCityCount(x) == max);
	}

	public updateAndGetGameState(): VictoryProgressState {
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

	public static getCityCountWin(): number {
		if (OvertimeManager.isOvertimeEnabled() && GlobalGameData.turnCount >= OvertimeManager.getOvertimeSettingValue()) {
			return Math.ceil(RegionToCity.size * CITIES_TO_WIN_RATIO) - OVERTIME_MODIFIER * OvertimeManager.getTurnCountPostOvertime();
		}

		return Math.ceil(RegionToCity.size * CITIES_TO_WIN_RATIO);
	}

	public checkKnockOutVictory(): boolean {
		// TeamManager needs to be aware if there is are teams in the game. This is to be used here.
		if (!SettingsContext.getInstance().isFFA()) {
			const activeTeams = TeamManager.getInstance().getActiveTeams();
			if (activeTeams.length <= 1) {
				GlobalGameData.leader = activeTeams[0].getMembersSortedByIncome()[0];
				this.saveStats();
				return true;
			}
		}

		if (PlayerManager.getInstance().playersAliveOrNomad.size <= 1) {
			GlobalGameData.leader = Array.from(PlayerManager.getInstance().playersAliveOrNomad.values())[0];
			this.saveStats();
			return true;
		}
		return false;
	}

	public reset() {
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
