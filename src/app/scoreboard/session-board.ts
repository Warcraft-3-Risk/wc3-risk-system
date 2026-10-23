import { NameManager } from '../managers/names/name-manager';
import { ActivePlayer } from '../player/types/active-player';
import { Team } from '../teams/team';
import { SetTeamScoreText } from '../ui/console';
import { HexColors } from '../utils/hex-colors';
import { Scoreboard } from './scoreboard';

export interface SessionStats {
	wins: number;
	losses: number;
	kills: number;
	deaths: number;
}

/**
 * Between-matches scoreboard for modes that play a series (promode, chaos promode).
 * It is created once per session and survives resets, accumulating wins, losses
 * and kill/death values across every match played.
 *
 * When teams are passed (team promode), players are grouped under a totals row per team,
 * and the team score replaces the version text in the top right corner.
 */
export class SessionBoard extends Scoreboard {
	private players: ActivePlayer[];
	private teams: Team[];
	private stats: Map<player, SessionStats> = new Map();
	private readonly PLAYER_COL = 1;
	private readonly WINS_COL = 2;
	private readonly LOSSES_COL = 3;
	private readonly KILLS_COL = 4;
	private readonly DEATHS_COL = 5;

	constructor(players: ActivePlayer[], teams?: Team[]) {
		super();
		this.players = [...players];
		this.teams = teams ? [...teams] : undefined;
		this.size = this.players.length + 2 + (this.teams ? this.teams.length : 0);

		// Initialize stats for all players
		this.players.forEach((p) => {
			this.stats.set(p.getPlayer(), { wins: 0, losses: 0, kills: 0, deaths: 0 });
		});

		MultiboardSetColumnCount(this.board, 5);

		for (let i = 1; i <= this.size; i++) {
			MultiboardSetRowCount(this.board, MultiboardGetRowCount(this.board) + 1);
			this.setItemWidth(12.5, i, this.PLAYER_COL);
			this.setItemWidth(2.5, i, this.WINS_COL);
			this.setItemWidth(2.5, i, this.LOSSES_COL);
			this.setItemWidth(4.0, i, this.KILLS_COL);
			this.setItemWidth(4.0, i, this.DEATHS_COL);
		}

		// Header
		this.setItemValue(`${HexColors.TANGERINE}Player|r`, 1, this.PLAYER_COL);
		this.setItemValue(`${HexColors.TANGERINE}W|r`, 1, this.WINS_COL);
		this.setItemValue(`${HexColors.TANGERINE}L|r`, 1, this.LOSSES_COL);
		this.setItemValue(`${HexColors.TANGERINE}K|r`, 1, this.KILLS_COL);
		this.setItemValue(`${HexColors.TANGERINE}D|r`, 1, this.DEATHS_COL);

		this.setTitle('Session Score');

		this.updateFull();

		MultiboardSetItemsStyle(this.board, true, false);
		this.setVisibility(false);
	}

	public recordMatchResult(winningPlayers: ActivePlayer[], losingPlayers: ActivePlayer[]): void {
		winningPlayers.forEach((p) => {
			const stats = this.stats.get(p.getPlayer());
			if (stats) stats.wins++;
		});
		losingPlayers.forEach((p) => {
			const stats = this.stats.get(p.getPlayer());
			if (stats) stats.losses++;
		});
	}

	// Testing aid for -setscore. Team W/L is read from its members, so every member gets the same wins.
	public setTeamWins(team: Team, wins: number): void {
		team.getMembers().forEach((member) => {
			const stats = this.stats.get(member.getPlayer());
			if (stats) stats.wins = wins;
		});
	}

	public recordKillsDeaths(player: ActivePlayer, kills: number, deaths: number): void {
		const stats = this.stats.get(player.getPlayer());
		if (stats) {
			stats.kills += kills;
			stats.deaths += deaths;
		}
	}

	public updateFull(): void {
		this.sortPlayers(this.players);

		if (this.teams) {
			this.updateTeams();
		} else {
			let row = 2;
			this.players.forEach((player) => {
				if (this.updatePlayerRow(player, row)) row++;
			});
		}
	}

	public updatePartial(): void {
		this.updateFull();
	}

	public setAlert(_player: player, _alert: string): void {
		// Not used for session board
	}

	public destroy(): void {
		this.players = null;
		this.teams = null;
		this.stats = null;
		DestroyMultiboard(this.board);
		this.board = null;
	}

	private updateTeams(): void {
		const teamStats = new Map<Team, SessionStats>();
		this.teams.forEach((team) => teamStats.set(team, this.getTeamStats(team)));

		// Sort by wins descending, then K/D ratio descending, then team number for a stable order
		this.teams.sort((a, b) => {
			const sa = teamStats.get(a);
			const sb = teamStats.get(b);

			if (sb.wins != sa.wins) return sb.wins - sa.wins;

			const kdA = this.getKD(sa);
			const kdB = this.getKD(sb);
			if (kdB != kdA) return kdB - kdA;

			return a.getNumber() - b.getNumber();
		});

		let row = 2;
		this.teams.forEach((team) => {
			const stats = teamStats.get(team);

			this.setItemValue(`${HexColors.WHITE}Team #${team.getNumber()}|r`, row, this.PLAYER_COL);
			this.setItemValue(`${HexColors.LIGHT_BLUE}${stats.wins}`, row, this.WINS_COL);
			this.setItemValue(`${HexColors.LIGHT_BLUE}${stats.losses}`, row, this.LOSSES_COL);
			this.setItemValue(`${HexColors.LIGHT_BLUE}${stats.kills}`, row, this.KILLS_COL);
			this.setItemValue(`${HexColors.LIGHT_BLUE}${stats.deaths}`, row, this.DEATHS_COL);
			row++;

			const members = this.players.filter((p) => team.playerIsInTeam(p.getPlayer()));
			members.forEach((player) => {
				if (this.updatePlayerRow(player, row)) row++;
			});
		});

		this.updateTeamScoreText(teamStats);
	}

	/**
	 * Shows the team score in the top right corner, where the map version normally sits.
	 * Teams are always listed by number so each side keeps its position between matches.
	 */
	private updateTeamScoreText(teamStats: Map<Team, SessionStats>): void {
		const byNumber = [...this.teams].sort((a, b) => a.getNumber() - b.getNumber());
		const first = byNumber[0];
		const last = byNumber[byNumber.length - 1];

		SetTeamScoreText(`T${first.getNumber()}`, teamStats.get(first).wins, teamStats.get(last).wins, `T${last.getNumber()}`);
	}

	private getTeamStats(team: Team): SessionStats {
		const total: SessionStats = { wins: 0, losses: 0, kills: 0, deaths: 0 };

		team.getMembers().forEach((member) => {
			const stats = this.stats.get(member.getPlayer());
			if (!stats) return;

			// Teams win and lose together, so every member carries the team's W/L
			total.wins = Math.max(total.wins, stats.wins);
			total.losses = Math.max(total.losses, stats.losses);
			total.kills += stats.kills;
			total.deaths += stats.deaths;
		});

		return total;
	}

	// Sort by wins descending, then K/D ratio descending
	private sortPlayers(players: ActivePlayer[]): void {
		players.sort((a, b) => {
			const sa = this.stats.get(a.getPlayer());
			const sb = this.stats.get(b.getPlayer());
			if (!sa || !sb) return 0;

			if (sb.wins != sa.wins) return sb.wins - sa.wins;

			const kdA = this.getKD(sa);
			const kdB = this.getKD(sb);
			if (kdB != kdA) return kdB - kdA;

			return GetPlayerId(a.getPlayer()) - GetPlayerId(b.getPlayer());
		});
	}

	private getKD(stats: SessionStats): number {
		return stats.deaths > 0 ? stats.kills / stats.deaths : stats.kills;
	}

	private updatePlayerRow(player: ActivePlayer, row: number): boolean {
		const stats = this.stats.get(player.getPlayer());
		if (!stats) return false;

		const textColor = GetLocalPlayer() == player.getPlayer() ? HexColors.TANGERINE : HexColors.WHITE;
		const nameColor = NameManager.getInstance().getColorCode(player.getPlayer());

		this.setItemValue(`${nameColor}${NameManager.getInstance().getBtag(player.getPlayer())}`, row, this.PLAYER_COL);
		this.setItemValue(`${HexColors.GREEN}${stats.wins}`, row, this.WINS_COL);
		this.setItemValue(`${HexColors.RED}${stats.losses}`, row, this.LOSSES_COL);
		this.setItemValue(`${textColor}${stats.kills}`, row, this.KILLS_COL);
		this.setItemValue(`${textColor}${stats.deaths}`, row, this.DEATHS_COL);

		return true;
	}
}
