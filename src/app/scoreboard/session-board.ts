import { NameManager } from '../managers/names/name-manager';
import { ActivePlayer } from '../player/types/active-player';
import { HexColors } from '../utils/hex-colors';
import { Scoreboard } from './scoreboard';

/** Outcome of a player's previous match - Win, Loss or Draw. */
export type LastResult = 'W' | 'L' | 'D';

const LAST_RESULT_COLORS: Record<LastResult, string> = {
	W: HexColors.GREEN,
	L: HexColors.RED,
	D: HexColors.TANGERINE,
};

export interface SessionStats {
	wins: number;
	losses: number;
	kills: number;
	deaths: number;
}

/**
 * Between-matches scoreboard for modes that play a series (promode, equalized promode, arena).
 * Arena shows it permanently, as rounds follow each other without a break.
 * It is created once per session and survives resets, accumulating wins, losses
 * and kill/death values across every match played.
 */
export class SessionBoard extends Scoreboard {
	private players: ActivePlayer[];
	private stats: Map<player, SessionStats> = new Map();
	// Kills/deaths of the match in progress, shown on top of the banked totals (Arena keeps the board up during rounds)
	private liveKillsDeaths: Map<player, { kills: number; deaths: number }> = new Map();
	// Previous match result, shown in front of the name (Arena) - players without one show none
	private lastResults: Map<player, LastResult> = new Map();
	private readonly PLAYER_COL = 1;
	private readonly WINS_COL = 2;
	private readonly LOSSES_COL = 3;
	private readonly KILLS_COL = 4;
	private readonly DEATHS_COL = 5;

	constructor(players: ActivePlayer[]) {
		super();
		this.players = [...players];
		this.size = this.players.length + 2;

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

	public recordKillsDeaths(player: ActivePlayer, kills: number, deaths: number): void {
		const stats = this.stats.get(player.getPlayer());
		if (stats) {
			stats.kills += kills;
			stats.deaths += deaths;
		}
	}

	/** Sets the running kill/death values of the match in progress. They are shown but not banked - see recordKillsDeaths. */
	public setLiveKillsDeaths(player: ActivePlayer, kills: number, deaths: number): void {
		this.liveKillsDeaths.set(player.getPlayer(), { kills, deaths });
	}

	public clearLiveKillsDeaths(): void {
		this.liveKillsDeaths.clear();
	}

	public getWins(player: player): number {
		const stats = this.stats.get(player);
		return stats ? stats.wins : 0;
	}

	/** Replaces every player's previous-match marker - players missing from the map (e.g. who waited) show none. */
	public setLastResults(results: Map<player, LastResult>): void {
		this.lastResults = results;
	}

	public updateFull(): void {
		// Sort by wins descending, then K/D ratio descending
		this.players.sort((a, b) => {
			const sa = this.stats.get(a.getPlayer());
			const sb = this.stats.get(b.getPlayer());
			if (!sa || !sb) return 0;

			if (sb.wins != sa.wins) return sb.wins - sa.wins;

			const kdA = sa.deaths > 0 ? sa.kills / sa.deaths : sa.kills;
			const kdB = sb.deaths > 0 ? sb.kills / sb.deaths : sb.kills;
			if (kdB != kdA) return kdB - kdA;

			return GetPlayerId(a.getPlayer()) - GetPlayerId(b.getPlayer());
		});

		let row = 2;
		this.players.forEach((player) => {
			const stats = this.stats.get(player.getPlayer());
			if (!stats) return;

			const live = this.liveKillsDeaths.get(player.getPlayer());
			const kills = stats.kills + (live ? live.kills : 0);
			const deaths = stats.deaths + (live ? live.deaths : 0);
			const textColor = GetLocalPlayer() == player.getPlayer() ? HexColors.TANGERINE : HexColors.WHITE;
			const nameColor = NameManager.getInstance().getColorCode(player.getPlayer());

			const lastResult = this.lastResults.get(player.getPlayer());
			const resultPrefix = lastResult ? `${LAST_RESULT_COLORS[lastResult]}${lastResult}|r ` : '';

			this.setItemValue(`${resultPrefix}${nameColor}${NameManager.getInstance().getBtag(player.getPlayer())}`, row, this.PLAYER_COL);
			this.setItemValue(`${HexColors.GREEN}${stats.wins}`, row, this.WINS_COL);
			this.setItemValue(`${HexColors.RED}${stats.losses}`, row, this.LOSSES_COL);
			this.setItemValue(`${textColor}${kills}`, row, this.KILLS_COL);
			this.setItemValue(`${textColor}${deaths}`, row, this.DEATHS_COL);

			row++;
		});
	}

	public updatePartial(): void {
		this.updateFull();
	}

	public setAlert(_player: player, _alert: string): void {
		// Not used for session board
	}

	public destroy(): void {
		this.players = null;
		this.stats = null;
		this.liveKillsDeaths = null;
		this.lastResults = null;
		DestroyMultiboard(this.board);
		this.board = null;
	}
}
