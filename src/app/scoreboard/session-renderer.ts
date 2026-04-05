import { NameManager } from '../managers/names/name-manager';
import { ActivePlayer } from '../player/types/active-player';
import { HexColors } from '../utils/hex-colors';
import { ScoreboardRenderer } from './scoreboard-renderer';
import { ScoreboardDataModel } from './scoreboard-data-model';
import { isReplay, getReplayObservedPlayer } from '../utils/game-status';

export interface SessionStats {
	wins: number;
	losses: number;
	kills: number;
	deaths: number;
}

export class SessionRenderer extends ScoreboardRenderer {
	private players: ActivePlayer[];
	private stats: Map<player, SessionStats> = new Map();
	private readonly PLAYER_COL = 1;
	private readonly WINS_COL = 2;
	private readonly LOSSES_COL = 3;
	private readonly KILLS_COL = 4;
	private readonly DEATHS_COL = 5;

	constructor(players: ActivePlayer[]) {
		super(5);
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

		this.renderFullInternal();

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

	public renderFull(_data: ScoreboardDataModel): void {
		this.renderFullInternal();
	}

	public renderPartial(_data: ScoreboardDataModel): void {
		this.renderFullInternal();
	}

	/**
	 * Standalone update for session board (used outside normal scoreboard update cycle).
	 */
	public updateFull(): void {
		this.renderFullInternal();
	}

	public renderAlert(_player: player, _alert: string): void {
		// Not used for session board
	}

	// Hides instead of destroying — see ScoreboardRenderer.destroy()
	public destroy(): void {
		this.setVisibility(false);
	}

	private renderFullInternal(): void {
		// Sort by wins descending, then K/D ratio descending
		this.players.sort((a, b) => {
			const sa = this.stats.get(a.getPlayer());
			const sb = this.stats.get(b.getPlayer());
			if (!sa || !sb) return 0;

			if (sb.wins !== sa.wins) return sb.wins - sa.wins;

			const kdA = sa.deaths > 0 ? sa.kills / sa.deaths : sa.kills;
			const kdB = sb.deaths > 0 ? sb.kills / sb.deaths : sb.kills;
			if (kdB !== kdA) return kdB - kdA;

			return GetPlayerId(a.getPlayer()) - GetPlayerId(b.getPlayer());
		});

		const effectiveLocal = isReplay() ? getReplayObservedPlayer() : GetLocalPlayer();
		let row = 2;
		this.players.forEach((player) => {
			const stats = this.stats.get(player.getPlayer());
			if (!stats) return;

			const textColor = effectiveLocal == player.getPlayer() ? HexColors.TANGERINE : HexColors.WHITE;
			const nameColor = NameManager.getInstance().getOriginalColorCode(player.getPlayer());

			this.setItemValue(`${nameColor}${NameManager.getInstance().getBtag(player.getPlayer())}`, row, this.PLAYER_COL);
			this.setItemValue(`${HexColors.GREEN}${stats.wins}`, row, this.WINS_COL);
			this.setItemValue(`${HexColors.RED}${stats.losses}`, row, this.LOSSES_COL);
			this.setItemValue(`${textColor}${stats.kills}`, row, this.KILLS_COL);
			this.setItemValue(`${textColor}${stats.deaths}`, row, this.DEATHS_COL);

			row++;
		});
	}
}
