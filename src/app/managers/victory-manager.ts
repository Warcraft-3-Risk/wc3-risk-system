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
import { ParticipantEntity, ParticipantEntityManager } from '../utils/participant-entity';
import { debugPrint } from '../utils/debug-print';

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
	}

	public setLeader(participant: ParticipantEntity) {
		if (GlobalGameData.leader == undefined) {
			GlobalGameData.leader = participant;
		} else if (ParticipantEntityManager.getCityCount(participant) > ParticipantEntityManager.getCityCount(GlobalGameData.leader)) {
			GlobalGameData.leader = participant;
		}
	}

	// This function is used to get the players who have a certain number of cities or more
	public getOwnershipByThresholdDescending(threshold: number): ParticipantEntity[] {
		const participants: ParticipantEntity[] = ParticipantEntityManager.getParticipantEntities();

		return participants
			.filter((participant) => ParticipantEntityManager.getCityCount(participant) >= threshold)
			.sort((a, b) => ParticipantEntityManager.getCityCount(b) - ParticipantEntityManager.getCityCount(a));
	}

	// This function is used to get the players who have won with the most cities (many players can have the same number of cities)
	public victors(): ParticipantEntity[] {
		let potentialVictors = this.getOwnershipByThresholdDescending(VictoryManager.getCityCountWin());

		if (potentialVictors.length == 0) {
			return [];
		}

		// potentialVictors is already sorted in descending order, so the first element has the max city count
		let max = ParticipantEntityManager.getCityCount(potentialVictors[0]);
		return potentialVictors.filter((x) => ParticipantEntityManager.getCityCount(x) == max);
	}

	public updateAndGetGameState(): VictoryProgressState {
		// Check if there is only one player or team alive (this takes priority)
		let eliminationVictory = false;
		VictoryManager.getInstance().haveAllOpponentsBeenEliminated((participant) => {
			GlobalGameData.leader = participant;
			eliminationVictory = true;
		});

		if (eliminationVictory) {
			debugPrint('No opponents remain!');
			VictoryManager.GAME_VICTORY_STATE = 'DECIDED';
			return VictoryManager.GAME_VICTORY_STATE;
		}

		// Check if there is a city victory condition met
		let playerWinCandidates = this.victors();

		if (playerWinCandidates.length == 0) {
			VictoryManager.GAME_VICTORY_STATE = 'UNDECIDED';
		} else if (playerWinCandidates.length == 1) {
			debugPrint(ParticipantEntityManager.getDisplayName(playerWinCandidates[0]) + ' has met the city count victory condition!');
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

	public haveAllOpponentsBeenEliminated(fnAllEnemiesEleminated: (remainingParticipant: ParticipantEntity) => void): void {
		if (!SettingsContext.getInstance().isFFA()) {
			const activeTeams = TeamManager.getInstance().getActiveTeams();
			if (activeTeams.length <= 1) {
				fnAllEnemiesEleminated(activeTeams[0].getMemberWithHighestIncome());
				return;
			}
		}

		if (PlayerManager.getInstance().playersAliveOrNomad.size <= 1) {
			const remainingPlayer = Array.from(PlayerManager.getInstance().playersAliveOrNomad.values())[0];
			return fnAllEnemiesEleminated(remainingPlayer);
		}
		return;
	}

	public reset() {
		VictoryManager.GAME_VICTORY_STATE = 'UNDECIDED';
	}

	public addWinToLeader() {
		ParticipantEntityManager.executeByParticipantEntity(
			GlobalGameData.leader,
			(activePlayer) => this.winTracker.addWinForEntity(activePlayer.getPlayer()),
			(team) => {
				debugPrint(`Adding win for team ${team.getNumber()}`);
				this.winTracker.addWinForEntity(team.getMemberWithHighestIncome().getPlayer());
				debugPrint('Win added for team member with highest income');
			}
		);
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

	public getPromodeInfo(): {
		leader: player;
		other: player;
		leaderScore: number;
		otherScore: number;
	} {
		return this.winTracker.getInfo();
	}
}
