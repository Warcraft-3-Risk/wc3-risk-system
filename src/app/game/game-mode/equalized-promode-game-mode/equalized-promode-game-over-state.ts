import { NameManager } from 'src/app/managers/names/name-manager';
import { VictoryManager } from 'src/app/managers/victory-manager';
import { GlobalGameData } from '../../state/global-game-state';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { ReplayManager } from 'src/app/statistics/replay-manager';
import { BaseState } from '../state/base-state';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { Quests } from 'src/app/quests/quests';
import { FogManager } from 'src/app/managers/fog-manager';
import { PlayerManager } from 'src/app/player/player-manager';
import { LocalMessage, GlobalMessage } from 'src/app/utils/messages';
import { HexColors } from 'src/app/utils/hex-colors';
import { EqualizedPromodeData } from '../mode/equalized-promode-mode';
import { Wait } from 'src/app/utils/wait';
import { ParticipantEntityManager } from 'src/app/utils/participant-entity';
import { EqualizedPromodeDistributionService } from '../../services/distribution-service/equalized-promode-distribution-service';

/**
 * Custom GameOverState for Equalized ProMode.
 * Handles the two-round system where:
 * - Round 1 ends -> automatically start Round 2
 * - Round 2 ends -> check overall winner and show score
 */
export class EqualizedPromodeGameOverState extends BaseState<EqualizedPromodeData> {
	onEnterState() {
		GlobalGameData.matchState = 'postMatch';

		Quests.getInstance().updatePlayersQuest();

		// Set end data for all remaining active players
		PlayerManager.getInstance().activePlayersThatAreAlive.forEach((player) => {
			player.setEndData();
		});

		// Get the winner of this round
		const leaderEntity = GlobalGameData.leader ? ParticipantEntityManager.getHighestPriorityParticipant(GlobalGameData.leader) : null;
		const roundWinner = leaderEntity ? leaderEntity.getPlayer() : null;

		// Check which round we just finished using static round number
		const currentRound = EqualizedPromodeDistributionService.getRoundNumber();

		if (currentRound === 1) {
			// Just finished Round 1 - prepare for Round 2
			this.handleRound1End(roundWinner);
		} else {
			// Just finished Round 2 - determine overall winner
			this.handleRound2End(roundWinner);
		}
	}

	/**
	 * Handle the end of Round 1.
	 * Store the winner and automatically start Round 2.
	 */
	private handleRound1End(round1Winner: player | null) {
		// Use static methods to store data (survives state reset)
		EqualizedPromodeDistributionService.setRound1Winner(round1Winner);
		EqualizedPromodeDistributionService.setRoundNumber(2);

		// Get winner's name for display
		const winnerName = round1Winner ? NameManager.getInstance().getDisplayName(round1Winner) : 'Unknown';

		// Show message that Round 1 is over and Round 2 is starting
		GlobalMessage(
			`${HexColors.TANGERINE}${winnerName} won the first round!|r\n\n` +
			`${HexColors.GREEN}Starting round 2 with swapped positions...|r`,
			'Sound\\Interface\\ItemReceived.flac',
			5
		);

		// Automatically restart to begin Round 2
		this.runAsync();
	}

	/**
	 * Handle the end of Round 2.
	 * Determine the overall winner and add wins accordingly.
	 */
	private handleRound2End(round2Winner: player | null) {
		const round1Winner = EqualizedPromodeDistributionService.getRound1Winner();

		// Hide match scoreboard and show names
		ScoreboardManager.getInstance().destroyBoards();
		GlobalGameData.matchPlayers.forEach((player) => {
			NameManager.getInstance().setName(player.getPlayer(), 'acct');
		});

		// Determine overall outcome
		if (round1Winner && round2Winner && round1Winner === round2Winner) {
			// Same player won both rounds - they win the pair
			VictoryManager.getInstance().addWinToLeader();
		}

		// Show current score
		VictoryManager.getInstance().showScore();

		// Reset round data for next pair
		EqualizedPromodeDistributionService.setRoundNumber(1);
		EqualizedPromodeDistributionService.setRound1Winner(null);

		FogManager.getInstance().turnFogOff();
		SetTimeOfDayScale(0);
		SetTimeOfDay(12.0);

		ReplayManager.getInstance().onRoundEnd();
	}

	/**
	 * Async function to automatically restart after Round 1.
	 */
	async runAsync(): Promise<void> {
		await Wait.forSeconds(5); // Give players time to see the message
		this.nextState(this.stateData);
	}

	/**
	 * Handle player restart (-ng command).
	 * Only allow restart after Round 2 is complete.
	 */
	override onPlayerRestart(player: ActivePlayer) {
		const currentRound = EqualizedPromodeDistributionService.getRoundNumber();

		if (currentRound === 2) {
			// Currently between Round 1 and Round 2 - restart is automatic, don't allow manual
			LocalMessage(
				GetLocalPlayer(),
				`${HexColors.TANGERINE}Round 2 starting automatically...|r`,
				'Sound\\Interface\\Error.flac'
			);
		} else {
			// After Round 2 - allow restart to begin new pair
			this.nextState(this.stateData);
		}
	}
}