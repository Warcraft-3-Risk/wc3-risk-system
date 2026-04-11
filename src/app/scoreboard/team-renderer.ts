import { NameManager } from '../managers/names/name-manager';
import { HexColors } from '../utils/hex-colors';
import { ScoreboardRenderer } from './scoreboard-renderer';
import { ScoreboardDataModel, PlayerRow, TeamRow } from './scoreboard-data-model';
import { TeamManager } from '../teams/team-manager';

export class TeamRenderer extends ScoreboardRenderer {
	private readonly PLAYER_COL = 1;
	private readonly INCOME_COL = 2;
	private readonly CITIES_COL = 3;
	private readonly KILLS_COL = 4;
	private readonly DEATHS_COL = 5;
	private readonly STATUS_COL = 6;
	private showTeamTotals: boolean;

	public constructor(teamRows: TeamRow[]) {
		super(6);

		this.size = 3;
		teamRows.forEach((t) => {
			this.size += t.members.length;
		});

		if (this.size + teamRows.length <= 26) {
			this.size += teamRows.length;
			this.showTeamTotals = true;
		} else {
			this.showTeamTotals = false;
		}

		MultiboardSetColumnCount(this.board, 6);

		for (let i = 1; i <= this.size; i++) {
			MultiboardSetRowCount(this.board, MultiboardGetRowCount(this.board) + 1);
			this.setItemWidth(8.0, i, this.PLAYER_COL);
			this.setItemWidth(2.5, i, this.INCOME_COL);
			this.setItemWidth(2.5, i, this.CITIES_COL);
			this.setItemWidth(4.0, i, this.KILLS_COL);
			this.setItemWidth(4.0, i, this.DEATHS_COL);
			this.setItemWidth(4.5, i, this.STATUS_COL);
		}

		this.setItemValue(`${HexColors.TANGERINE}Player|r`, 1, this.PLAYER_COL);
		this.setItemValue(`${HexColors.TANGERINE}Inc|r`, 1, this.INCOME_COL);
		this.setItemValue(`${HexColors.TANGERINE}C|r`, 1, this.CITIES_COL);
		this.setItemValue(`${HexColors.TANGERINE}K|r`, 1, this.KILLS_COL);
		this.setItemValue(`${HexColors.TANGERINE}D|r`, 1, this.DEATHS_COL);
		this.setItemValue(`${HexColors.TANGERINE}Status|r`, 1, this.STATUS_COL);

		// Alert row — full width in first column, hide rest
		this.setItemWidth(20.0, this.size, this.PLAYER_COL);
		this.setItemWidth(0.0, this.size, this.INCOME_COL);
		this.setItemWidth(0.0, this.size, this.CITIES_COL);
		this.setItemWidth(0.0, this.size, this.KILLS_COL);
		this.setItemWidth(0.0, this.size, this.DEATHS_COL);
		this.setItemWidth(0.0, this.size, this.STATUS_COL);

		this.finalizeSetup();
		this.setVisibility(true);
	}

	public renderFull(data: ScoreboardDataModel): void {
		const effectiveLocal = data.effectiveLocal;
		let row = 2;

		for (let i = 0; i < data.teams.length; i++) {
			const teamRow = data.teams[i];

			if (this.showTeamTotals) {
				this.setItemValue(`${HexColors.WHITE}Team #${teamRow.number}|r`, row, this.PLAYER_COL);
				this.setItemValue(`${HexColors.LIGHT_BLUE}${teamRow.totalIncome}`, row, this.INCOME_COL);
				this.setItemValue(`${HexColors.LIGHT_BLUE}${teamRow.totalCities}`, row, this.CITIES_COL);
				this.setItemValue(`${HexColors.LIGHT_BLUE}${teamRow.totalKills}`, row, this.KILLS_COL);
				this.setItemValue(`${HexColors.LIGHT_BLUE}${teamRow.totalDeaths}`, row, this.DEATHS_COL);
				row++;
			}

			for (let j = 0; j < teamRow.members.length; j++) {
				const p = teamRow.members[j];
				const textColor = this.getStringColor(p.handle, effectiveLocal);
				const incomeString = p.isAlive || p.isNomad ? `${p.income}` : '-';

				this.setItemValue(`${textColor}${incomeString}`, row, this.INCOME_COL);
				this.renderPlayerData(p, row, textColor, effectiveLocal, teamRow);
				row++;
			}
		}
	}

	public renderPartial(data: ScoreboardDataModel): void {
		const effectiveLocal = data.effectiveLocal;
		let row = 2;

		for (let i = 0; i < data.teams.length; i++) {
			const teamRow = data.teams[i];

			if (this.showTeamTotals) {
				this.setItemValue(`${HexColors.WHITE}Team #${teamRow.number}|r`, row, this.PLAYER_COL);
				this.setItemValue(`${HexColors.LIGHT_BLUE}${teamRow.totalIncome}`, row, this.INCOME_COL);
				this.setItemValue(`${HexColors.LIGHT_BLUE}${teamRow.totalCities}`, row, this.CITIES_COL);
				this.setItemValue(`${HexColors.LIGHT_BLUE}${teamRow.totalKills}`, row, this.KILLS_COL);
				this.setItemValue(`${HexColors.LIGHT_BLUE}${teamRow.totalDeaths}`, row, this.DEATHS_COL);
				row++;
			}

			for (let j = 0; j < teamRow.members.length; j++) {
				const p = teamRow.members[j];
				const textColor = this.getStringColor(p.handle, effectiveLocal);
				const incomeString = p.isAlive || p.isNomad ? `${p.income}` : '-';

				this.setItemValue(`${textColor}${incomeString}`, row, this.INCOME_COL);
				this.renderPlayerData(p, row, textColor, effectiveLocal, teamRow);
				row++;
			}
		}
	}

	public renderAlert(player: player, countryName: string): void {
		this.setItemValue(`${NameManager.getInstance().getDisplayName(player)} claimed ${HexColors.TANGERINE}${countryName}|r`, this.size, 1);
	}

	// Hides instead of destroying — see ScoreboardRenderer.destroy()
	public destroy(): void {
		this.setVisibility(false);
	}

	private getStringColor(handle: player, effectiveLocal: player): string {
		if (effectiveLocal === handle) return HexColors.TANGERINE;
		if (IsPlayerAlly(effectiveLocal, handle)) return HexColors.GREEN;
		return HexColors.WHITE;
	}

	private renderPlayerData(p: PlayerRow, row: number, textColor: string, effectiveLocal: player, teamRow: TeamRow): void {
		const handle = p.handle;

		let teamPrefix = '';
		if (!this.showTeamTotals) {
			teamPrefix = `${HexColors.TANGERINE}[${TeamManager.getInstance().getTeamNumberFromPlayer(handle)}]|r`;
		}

		// Only show eliminated formatting when the entire team is out
		const teamEliminated = p.isEliminated && teamRow.isEliminated;

		if (teamEliminated) {
			const grey = HexColors.LIGHT_GRAY;
			const elimColor = effectiveLocal === handle ? textColor : grey;

			const nameColor = p.originalColorCode;
			this.setItemValue(`${teamPrefix}${nameColor}${p.acctName}`, row, this.PLAYER_COL);
			this.setItemValue(`${elimColor}${p.cities}`, row, this.CITIES_COL);
			this.setItemValue(`${elimColor}${p.kills}`, row, this.KILLS_COL);
			this.setItemValue(`${elimColor}${p.deaths}`, row, this.DEATHS_COL);

			if (p.isSTFU) {
				this.setItemValue(`${grey}${p.status} ${p.statusDuration}`, row, this.STATUS_COL);
			} else {
				this.setItemValue(`${p.status}`, row, this.STATUS_COL);
			}
		} else {
			this.setItemValue(`${teamPrefix}${p.displayName}`, row, this.PLAYER_COL);

			const cityTextColor = p.cityCountHighlighted ? HexColors.RED : textColor;
			this.setItemValue(`${cityTextColor}${p.cities}`, row, this.CITIES_COL);

			this.setItemValue(`${textColor}${p.kills}`, row, this.KILLS_COL);
			this.setItemValue(`${textColor}${p.deaths}`, row, this.DEATHS_COL);

			if (p.isNomad || p.isSTFU) {
				this.setItemValue(`${p.status} ${p.statusDuration}`, row, this.STATUS_COL);
			} else {
				this.setItemValue(`${p.status}`, row, this.STATUS_COL);
			}
		}
	}
}
