import { NameManager } from 'src/app/managers/names/name-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { GlobalGameData } from '../../state/global-game-state';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { StatisticsController } from 'src/app/statistics/statistics-controller';
import { ReplayManager } from 'src/app/statistics/replay-manager';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { Quests } from 'src/app/quests/quests';
import { FogManager } from 'src/app/managers/fog-manager';
import { PlayerManager } from 'src/app/player/player-manager';
import { TeamManager } from 'src/app/teams/team-manager';
import { Team } from 'src/app/teams/team';
import { LocalMessage } from 'src/app/utils/messages';
import { HexColors } from 'src/app/utils/hex-colors';


export class GameOverState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		GlobalGameData.matchState = 'postMatch';

		Quests.getInstance().updatePlayersQuest();

		// Set end data for all remaining active players - defeated players have had their end data set already as they were defeated
		PlayerManager.getInstance().activePlayersThatAreAlive.forEach((player) => {
			player.setEndData();
		});

		// Hide match scoreboard and show score screen
		ScoreboardManager.getInstance().destroyBoards();

		const nameManager = NameManager.getInstance();
		const isPromode = SettingsContext.getInstance().isPromode() || SettingsContext.getInstance().isChaosPromode();

		// Phase 1: Reset colors and set proper display names for the statistics board
		GlobalGameData.matchPlayers.forEach((player) => {
			SetPlayerState(player.getPlayer(), PLAYER_STATE_OBSERVER, 0);

			const handle = player.getPlayer();

			// Reset to original color (before shared-slot-manager overrides)
			nameManager.setColor(handle, nameManager.getOriginalColor(handle));
			nameManager.setName(handle, isPromode ? 'acct' : 'btag');

			if (!isPromode) {
				player.trackedData.bonus.hideUI();
			}
		});

		// Phase 2: Show end-of-match screen
		if (isPromode) {
			// Promode/chaos: show between-matches session board, wait for -ng
			this.recordSessionStats();
		} else {
			// Non-promode: show full statistics board
			StatisticsController.getInstance().refreshView();
			StatisticsController.getInstance().setViewVisibility(true);
			StatisticsController.getInstance().writeStatisticsData();

			// Also record session stats for random teams
			if (SettingsContext.getInstance().isRandomTeams()) {
				this.recordSessionStats();
			}
		}

		// Phase 3: Set chat names to "ColorName (RealName)" observer format
		GlobalGameData.matchPlayers.forEach((player) => {
			nameManager.setName(player.getPlayer(), 'obs');
		});

		FogManager.getInstance().turnFogOff();

		SetTimeOfDayScale(0);
		SetTimeOfDay(12.0);

		ReplayManager.getInstance().onRoundEnd();
	}

	private recordSessionStats(): void {
		const sessionBoard = ScoreboardManager.getInstance().getSessionBoard();
		if (!sessionBoard) return;

		// Determine winning team/player from the leader (can be ActivePlayer or Team)
		const leader = GlobalGameData.leader;
		let winningTeam: Team | undefined;

		if (leader instanceof ActivePlayer) {
			winningTeam = TeamManager.getInstance().getTeamFromPlayer(leader.getPlayer());
		} else if (leader instanceof Team) {
			winningTeam = leader;
		}

		if (winningTeam) {
			const allTeams = TeamManager.getInstance().getTeams();
			const losingPlayers: ActivePlayer[] = [];

			allTeams.forEach((team) => {
				if (team !== winningTeam) {
					losingPlayers.push(...team.getMembers());
				}
			});

			// All team members get the W/L — teams win and lose together
			sessionBoard.recordMatchResult(winningTeam.getMembers(), losingPlayers);
		} else if (leader instanceof ActivePlayer) {
			// FFA/1v1 promode: leader wins, everyone else loses
			const losingPlayers = GlobalGameData.matchPlayers.filter((p) => p.getPlayer() != leader.getPlayer());
			sessionBoard.recordMatchResult([leader], losingPlayers);
		}

		// Record K/D for all match players
		GlobalGameData.matchPlayers.forEach((player) => {
			const kd = player.trackedData.killsDeaths.get(player.getPlayer());
			if (kd) {
				sessionBoard.recordKillsDeaths(player, kd.killValue, kd.deathValue);
			}
		});

		sessionBoard.updateFull();
		ScoreboardManager.getInstance().showSessionBoard();
	}

	override onPlayerRestart(player: ActivePlayer) {
		if (SettingsContext.getInstance().isFFA()) {
			LocalMessage(GetLocalPlayer(), `${HexColors.RED}You can not restart in FFA mode!|r`, 'Sound\\Interface\\Error.flac');
		} else {
			this.nextState(this.stateData);
		}
	}
}
