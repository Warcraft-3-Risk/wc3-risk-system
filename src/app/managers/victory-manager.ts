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
import { Team } from '../teams/team';

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

	public setLeader(participant: ParticipantEntity) {
		if (GlobalGameData.leader == undefined) {
			GlobalGameData.leader = participant;
		} else if (getCityCount(participant) > getCityCount(GlobalGameData.leader)) {
			GlobalGameData.leader = participant;
		}
	}

	// This function is used to get the players who have a certain number of cities or more
	public getOwnershipByThresholdDescending(threshold: number): ParticipantEntity[] {
		const participants: ParticipantEntity[] = SettingsContext.getInstance().isFFA()
			? Array.from(PlayerManager.getInstance().playersAliveOrNomad.values())
			: TeamManager.getInstance().getActiveTeams();

		return participants.filter((participant) => getCityCount(participant) >= threshold).sort((a, b) => getCityCount(b) - getCityCount(a));
	}

	// This function is used to get the players who have won with the most cities (many players can have the same number of cities)
	public victors(): ParticipantEntity[] {
		let potentialVictors = this.getOwnershipByThresholdDescending(VictoryManager.getCityCountWin());

		if (potentialVictors.length == 0) {
			return [];
		}

		let max = getCityCount(potentialVictors.sort((a, b) => getCityCount(b) - getCityCount(a))[0]);
		return potentialVictors.filter((x) => getCityCount(x) == max);
	}

	public updateAndGetGameState(): VictoryProgressState {
		// Quickly decide game is there is only one player or team alive
		const participants: ParticipantEntity[] = SettingsContext.getInstance().isFFA()
			? Array.from(PlayerManager.getInstance().playersAliveOrNomad.values())
			: TeamManager.getInstance().getActiveTeams();

		if (participants.length == 1) {
			VictoryManager.GAME_VICTORY_STATE = 'DECIDED';
			return VictoryManager.GAME_VICTORY_STATE;
		}

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
				GlobalGameData.leader = activeTeams[0].getMemberWithHighestIncome();
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
		if (GlobalGameData.leader instanceof ActivePlayer) {
			this.winTracker.addWinForEntity(GlobalGameData.leader.getPlayer());
		} else {
			this.winTracker.addWinForEntity((GlobalGameData.leader as Team).getMemberWithHighestIncome().getPlayer());
		}
	}

	public wonBestOf(matches: number): player | undefined {
		if (this.winTracker.playedBestOf(matches)) {
			return this.winTracker.getEntityWithMostWins();
		}
		return undefined;
	}

	public getLoser(): player | undefined {
		return this.winTracker.getEntityWithLeastWins();
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
