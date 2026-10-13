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
import { LocalMessage } from 'src/app/utils/messages';
import { HexColors } from 'src/app/utils/hex-colors';
import { Team } from 'src/app/teams/team';
import { TeamManager } from 'src/app/teams/team-manager';
import { PlayLocalSound } from 'src/app/utils/utils';
import { recordSessionKillsDeaths } from 'src/app/utils/session-stats';

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
		const isPromode: boolean = SettingsContext.getInstance().isPromode();

		GlobalGameData.matchPlayers.forEach((player) => {
			if (isPromode) {
				NameManager.getInstance().setName(player.getPlayer(), 'acct');
			} else {
				NameManager.getInstance().setName(player.getPlayer(), 'btag');
				player.trackedData.bonus.hideUI();
			}
		});

		if (isPromode) {
			// Promode plays a series: show the running session score and wait for -ng
			this.recordSessionStats();
		} else {
			StatisticsController.getInstance().refreshView();
			StatisticsController.getInstance().setViewVisibility(true);
			StatisticsController.getInstance().writeStatisticsData();
		}

		FogManager.getInstance().turnFogOff();

		SetTimeOfDayScale(0);
		SetTimeOfDay(12.0);

		ReplayManager.getInstance().onRoundEnd();

		// Play victory/defeat sounds locally
		this.playOutcomeSounds();
	}

	private recordSessionStats(): void {
		const sessionBoard = ScoreboardManager.getInstance().getSessionBoard();

		if (!sessionBoard) return;

		// The leader is a Team in team modes and an ActivePlayer in FFA/1v1
		const leader = GlobalGameData.leader;
		let winningTeam: Team = undefined;

		if (leader instanceof Team) {
			winningTeam = leader;
		} else if (leader instanceof ActivePlayer) {
			winningTeam = TeamManager.getInstance().getTeamFromPlayer(leader.getPlayer());
		}

		if (winningTeam) {
			const losingPlayers: ActivePlayer[] = [];

			TeamManager.getInstance()
				.getTeams()
				.forEach((team) => {
					if (team != winningTeam) losingPlayers.push(...team.getMembers());
				});

			// Teams win and lose together, so every member gets the W/L
			sessionBoard.recordMatchResult(winningTeam.getMembers(), losingPlayers);
		} else if (leader instanceof ActivePlayer) {
			// FFA / 1v1 promode: the leader wins, everyone else loses
			const losingPlayers = GlobalGameData.matchPlayers.filter((p) => p.getPlayer() != leader.getPlayer());
			sessionBoard.recordMatchResult([leader], losingPlayers);
		}

		recordSessionKillsDeaths(sessionBoard);

		sessionBoard.updateFull();
		ScoreboardManager.getInstance().showSessionBoard();
	}

	private playOutcomeSounds(): void {
		const leader = GlobalGameData.leader;
		const winners = new Set<player>();

		if (leader instanceof Team) {
			leader.getMembers().forEach((m) => winners.add(m.getPlayer()));
		} else if (leader instanceof ActivePlayer) {
			const team = SettingsContext.getInstance().isFFA() ? undefined : TeamManager.getInstance().getTeamFromPlayer(leader.getPlayer());

			if (team) {
				team.getMembers().forEach((m) => winners.add(m.getPlayer()));
			} else {
				winners.add(leader.getPlayer());
			}
		}

		GlobalGameData.matchPlayers.forEach((p) => {
			if (winners.has(p.getPlayer())) {
				PlayLocalSound('Sound\\Interface\\QuestCompleted.flac', p.getPlayer());
			} else if (!p.status.isEliminated()) {
				// Only play for players still alive — eliminated players already heard it
				PlayLocalSound('Sound\\Interface\\QuestFailed.flac', p.getPlayer());
			}
		});
	}

	override onPlayerRestart(player: ActivePlayer) {
		if (SettingsContext.getInstance().isFFA()) {
			LocalMessage(GetLocalPlayer(), `${HexColors.RED}You can not restart in FFA mode!|r`, 'Sound\\Interface\\Error.flac');
		} else {
			this.nextState(this.stateData);
		}
	}
}
