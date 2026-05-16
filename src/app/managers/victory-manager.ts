import { ActivePlayer } from '../player/types/active-player';
import { RegionToCity } from '../city/city-map';
import { CITIES_TO_WIN_RATIO, OVERTIME_MODIFIER } from 'src/configs/game-settings';
import { WinTracker } from '../game/services/win-tracker';
import { GlobalGameData } from '../game/state/global-game-state';
import { PLAYER_STATUS } from '../player/status/status-enum';
import { PlayerManager } from '../player/player-manager';
import { TeamManager } from '../teams/team-manager';
import { SettingsContext } from '../settings/settings-context';
import { ParticipantEntity, ParticipantEntityManager } from '../utils/participant-entity';
import { debugPrint } from '../utils/debug-print';
import { DC, DEBUG_PRINTS } from 'src/configs/game-settings';
import { GlobalMessage } from '../utils/messages';
import { isOvertimeEnabled, getTurnCountPostOvertime } from './overtime-logic';

export type VictoryProgressState = 'UNDECIDED' | 'TIE' | 'DECIDED';

export class VictoryManager {
	private static instance: VictoryManager;
	public static GAME_VICTORY_STATE: VictoryProgressState = 'UNDECIDED';

	private winTracker: WinTracker;

	private constructor(
		private playerManager: PlayerManager,
		private teamManager: TeamManager,
		private settingsContext: SettingsContext
	) {
		this.winTracker = new WinTracker();
	}

	public static getInstance(): VictoryManager {
		if (this.instance === undefined) {
			this.instance = new VictoryManager(PlayerManager.getInstance(), TeamManager.getInstance(), SettingsContext.getInstance());
		}

		return this.instance;
	}

	/**
	 * Initialize the VictoryManager with explicitly provided dependencies.
	 */
	public static init(playerManager: PlayerManager, teamManager: TeamManager, settingsContext: SettingsContext): VictoryManager {
		this.instance = new VictoryManager(playerManager, teamManager, settingsContext);
		return this.instance;
	}

	/**
	 * Reset the singleton instance. For testing purposes only.
	 */
	public static resetInstance(): void {
		this.instance = undefined as unknown as VictoryManager;
	}

	public removePlayer(player: ActivePlayer, status: PLAYER_STATUS) {
		this.playerManager.setPlayerStatus(player.getPlayer(), status);
	}

	public updateLeader() {
		const allParticipants = this.getOwnershipByThresholdDescending(0);
		const validParticipants: ParticipantEntity[] = [];
		for (let i = 0; i < allParticipants.length; i++) {
			const participant = allParticipants[i];
			if (participant instanceof ActivePlayer && participant.status.isEliminated()) {
				continue;
			}
			validParticipants.push(participant);
		}

		if (validParticipants.length === 0) return;

		const currentLeader = GlobalGameData.leader;
		const currentLeaderEliminated = currentLeader instanceof ActivePlayer && currentLeader.status.isEliminated();
		const highestCount = ParticipantEntityManager.getCityCount(validParticipants[0]);

		if (currentLeader === undefined || currentLeaderEliminated || ParticipantEntityManager.getCityCount(currentLeader) < highestCount) {
			GlobalGameData.leader = validParticipants[0];
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
		let potentialVictors = this.getOwnershipByThresholdDescending(this.getCityCountWin());

		// Filter out eliminated players - they cannot be victors even if they have enough cities
		potentialVictors = potentialVictors.filter((participant) => {
			if (participant instanceof ActivePlayer) {
				return !participant.status.isEliminated();
			}
			return true; // Teams are already filtered by getActiveTeams()
		});

		if (potentialVictors.length === 0) {
			return [];
		}

		// potentialVictors is already sorted in descending order, so the first element has the max city count
		let max = ParticipantEntityManager.getCityCount(potentialVictors[0]);
		return potentialVictors.filter((x) => ParticipantEntityManager.getCityCount(x) === max);
	}

	public updateAndGetGameState(): VictoryProgressState {
		// Check if there is only one player or team alive (this takes priority)
		let eliminationVictory = false;
		this.haveAllOpponentsBeenEliminated((participant) => {
			GlobalGameData.leader = participant;
			eliminationVictory = true;
		});

		if (eliminationVictory) {
			if (DEBUG_PRINTS.master) debugPrint('No opponents remain!', DC.victory);
			VictoryManager.GAME_VICTORY_STATE = 'DECIDED';
			return VictoryManager.GAME_VICTORY_STATE;
		}

		// Check if there is a city victory condition met
		let playerWinCandidates = this.victors();

		if (playerWinCandidates.length === 0) {
			VictoryManager.GAME_VICTORY_STATE = 'UNDECIDED';
		} else if (playerWinCandidates.length === 1) {
			if (DEBUG_PRINTS.master)
				debugPrint(
					ParticipantEntityManager.getDisplayName(playerWinCandidates[0]) + ' has met the city count victory condition!',
					DC.victory
				);
			GlobalGameData.leader = playerWinCandidates[0];
			VictoryManager.GAME_VICTORY_STATE = 'DECIDED';
		} else {
			VictoryManager.GAME_VICTORY_STATE = 'TIE';
		}

		return VictoryManager.GAME_VICTORY_STATE;
	}

	public getCityCountWin(): number {
		const setting = this.settingsContext.getOvertimeSetting();
		if (isOvertimeEnabled(setting) && GlobalGameData.turnCount >= (setting as number)) {
			return (
				Math.ceil(RegionToCity.size * CITIES_TO_WIN_RATIO) - OVERTIME_MODIFIER * getTurnCountPostOvertime(GlobalGameData.turnCount, setting)
			);
		}

		return Math.ceil(RegionToCity.size * CITIES_TO_WIN_RATIO);
	}

	public haveAllOpponentsBeenEliminated(fnAllEnemiesEleminated: (remainingParticipant: ParticipantEntity) => void): void {
		if (!this.settingsContext.isFFA()) {
			const activeTeams = this.teamManager.getActiveTeams();
			if (activeTeams.length <= 1) {
				fnAllEnemiesEleminated(activeTeams[0].getMemberWithHighestIncome());
				return;
			}
		}

		if (this.playerManager.activePlayersThatAreAlive.size <= 1) {
			const remainingPlayer = Array.from(this.playerManager.activePlayersThatAreAlive.values())[0];
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
				if (DEBUG_PRINTS.master) debugPrint(`Adding win for team ${team.getNumber()}`, DC.victory);
				this.winTracker.addWinForEntity(team.getMemberWithHighestIncome().getPlayer());
				if (DEBUG_PRINTS.master) debugPrint('Win added for team member with highest income', DC.victory);
			}
		);
	}

	public showScore() {
		const info = VictoryManager.getInstance().getPromodeInfo();
		const participantNames = `${ParticipantEntityManager.getDisplayName(ParticipantEntityManager.getParticipantByPlayer(info.leader))} ${info.leaderScore} - ${info.otherScore} ${ParticipantEntityManager.getDisplayName(ParticipantEntityManager.getParticipantByPlayer(info.other))}`;

		GlobalMessage(`${participantNames}`, undefined);
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
