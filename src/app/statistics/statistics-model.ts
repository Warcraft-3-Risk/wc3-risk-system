import { TURN_DURATION_IN_SECONDS } from 'src/configs/game-settings';
import { ActivePlayer } from '../player/types/active-player';
import { HexColors } from '../utils/hex-colors';
import { AddLeadingZero } from '../utils/utils';
import { ColumnConfig, GetStatisticsColumns } from './statistics-column-config';
import { MAP_VERSION } from '../utils/map-info';
import { GlobalGameData } from '../game/state/global-game-state';
import { SettingsContext } from '../settings/settings-context';
import { TeamManager } from '../teams/team-manager';
import { Team } from '../teams/team';
import { ParticipantEntityManager } from '../utils/participant-entity';

export class StatisticsModel {
	private timePlayed: string;
	private ranks: ActivePlayer[];
	private winner: ActivePlayer;
	private columns: ColumnConfig[];

	private matchPlayers: ActivePlayer[];

	constructor(matchPlayers: ActivePlayer[]) {
		this.matchPlayers = matchPlayers;

		this.setData();
	}

	public setData() {
		this.setGameTime();
		this.winner = ParticipantEntityManager.getHighestPriorityParticipant(GlobalGameData.leader);

		if (SettingsContext.getInstance().isFFA()) {
			this.ranks = Array.from([...this.matchPlayers]);
			this.sortPlayersByRank(this.ranks, this.winner);
		} else {
			this.ranks = Array.from([
				...this.sortTeamsByRank(
					TeamManager.getInstance().getTeams(),
					this.winner ? TeamManager.getInstance().getTeamFromPlayer(this.winner.getPlayer()) : undefined
				),
			]);
		}

		this.columns = GetStatisticsColumns(this);
	}

	public getTimePlayed(): string {
		return this.timePlayed;
	}

	public getRanks(): ActivePlayer[] {
		return this.ranks;
	}

	public getWinner(): ActivePlayer {
		return this.winner;
	}

	public getColumnData(): ColumnConfig[] {
		return this.columns;
	}

	public getRival(player: ActivePlayer): ActivePlayer | null {
		let rival: ActivePlayer | null = null;
		let maxKills = 0;

		this.matchPlayers
			.filter((x) => x.status.isActive)
			.forEach((p) => {
				if (p === player) return;

				const killsOnPlayer = p.trackedData.killsDeaths.get(player.getPlayer()).kills;

				if (killsOnPlayer > maxKills) {
					maxKills = killsOnPlayer;
					rival = p;
				}
			});

		return rival;
	}

	private setGameTime() {
		const turnTime: number = TURN_DURATION_IN_SECONDS;
		const minutes: number = parseInt(BlzFrameGetText(BlzGetFrameByName('ResourceBarSupplyText', 0)));
		const seconds: number = turnTime - parseInt(BlzFrameGetText(BlzGetFrameByName('ResourceBarUpkeepText', 0)));
		const hours: number = Math.floor(minutes / turnTime);
		const remainingMinutes: number = minutes % turnTime;
		const formattedTime: string = `${AddLeadingZero(hours)}:${AddLeadingZero(remainingMinutes)}:${AddLeadingZero(seconds)}`;
		const totalTurns: number = minutes + seconds / turnTime;

		this.timePlayed = `${HexColors.TANGERINE}Game Time:|r ${formattedTime}\n${HexColors.TANGERINE}Total Turns:|r ${totalTurns.toFixed(2)}\n${HexColors.TANGERINE}Version:|r v${MAP_VERSION}`;
	}

	private sortPlayersByRank(players: ActivePlayer[], winner?: ActivePlayer): ActivePlayer[] {
		return players.sort((playerA, playerB) => {
			if (playerA === winner) return -1;
			if (playerB === winner) return 1;

			if (playerA.trackedData.turnDied !== playerB.trackedData.turnDied) {
				return playerB.trackedData.turnDied - playerA.trackedData.turnDied;
			}

			return playerB.trackedData.cities.cities.length - playerA.trackedData.cities.cities.length;
		});
	}

	private sortTeamsByRank(teams: Team[], winner?: Team): ActivePlayer[] {
		const sortedTeams = teams.sort((teamA, teamB) => {
			if (teamA.getNumber() === winner?.getNumber()) {
				return -1;
			}
			if (teamB.getNumber() === winner?.getNumber()) {
				return 1;
			}

			// Sort teams by who has members that have lived the longest
			const teamAPlayers = teamA.getMembers();
			const teamBPlayers = teamB.getMembers();

			const teamALongestLife = Math.max(...teamAPlayers.map((player) => player.trackedData.turnDied));
			const teamBLongestLife = Math.max(...teamBPlayers.map((player) => player.trackedData.turnDied));

			if (teamALongestLife !== teamBLongestLife) {
				return teamBLongestLife - teamALongestLife;
			}

			return ParticipantEntityManager.getCityCount(teamB) - ParticipantEntityManager.getCityCount(teamA);
		});

		const winningPlayer = ParticipantEntityManager.getHighestPriorityParticipant(winner);
		return sortedTeams.flatMap((team) => this.sortPlayersByRank(team.getMembers(), winningPlayer));
	}
}
