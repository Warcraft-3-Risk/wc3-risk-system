import { NameManager } from '../managers/names/name-manager';
import { TrackedData } from '../player/data/tracked-data';
import { ActivePlayer } from '../player/types/active-player';
import { Team } from '../teams/team';
import { TeamManager } from '../teams/team-manager';
import { HexColors } from '../utils/hex-colors';
import { ShuffleArray } from '../utils/utils';
import { Scoreboard } from './scoreboard';
import { VictoryManager } from '../managers/victory-manager';

export class TeamBoard extends Scoreboard {
	private teams: Team[];
	private showTeamTotals: boolean;
	private readonly PLAYER_COL: number = 1;
	private readonly INCOME_COL: number = 2;
	private readonly CITIES_COL: number = 3;
	private readonly KILLS_COL: number = 4;
	private readonly DEATHS_COL: number = 5;
	private readonly STATUS_COL: number = 6;

	public constructor() {
		super();

		this.teams = [...TeamManager.getInstance().getTeams()];
		this.size = 3;
		this.teams.forEach((team) => {
			this.size += team.getMembers().length;
		});

		if (this.size + this.teams.length <= 26) {
			this.size += this.teams.length;
			this.showTeamTotals = true;
		} else {
			this.showTeamTotals = false;
		}

		ShuffleArray(this.teams);
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
		this.setItemWidth(20.0, this.size, this.PLAYER_COL);
		this.setItemWidth(0.0, this.size, this.INCOME_COL);
		this.setItemWidth(0.0, this.size, this.CITIES_COL);
		this.setItemWidth(0.0, this.size, this.KILLS_COL);
		this.setItemWidth(0.0, this.size, this.DEATHS_COL);
		this.setItemWidth(0.0, this.size, this.STATUS_COL);

		this.updateFull();

		MultiboardSetItemsStyle(this.board, true, false);
		MultiboardMinimize(this.board, true);
		MultiboardMinimize(this.board, false);
		this.setVisibility(true);
	}

	/**
	 * Updates every column on the scoreboard.
	 */
	public updateFull(): void {
		this.teams.forEach((team) => {
			team.sortPlayersByIncome();
		});

		this.teams.sort((teamA, teamB) => {
			if (teamA.getIncome() < teamB.getIncome()) return 1;
			if (teamA.getIncome() > teamB.getIncome()) return -1;
			return 0;
		});

		let row: number = 2;

		for (let i = 0; i < this.teams.length; i++) {
			const team = this.teams[i];

			if (this.showTeamTotals) {
				this.setItemValue(`${HexColors.ORANGE}${team.getIncome()}`, row, this.INCOME_COL);
				this.updateTeamData(team, row);
				row++;
			}

			for (let j = 0; j < team.getMembers().length; j++) {
				const player = team.getMembers()[j];
				const playerHandle: player = player.getPlayer();
				const incomeString: string = player.status.isAlive() || player.status.isNomad() ? `${player.trackedData.income.income}` : '-';

				this.setItemValue(`${this.getStringColor(playerHandle)}${incomeString}`, row, this.INCOME_COL);
				this.updatePlayerData(player, row, this.getStringColor(playerHandle), player.trackedData);

				row++;
			}
		}
	}

	/**
	 * Updates all columns except income on the scoreboard.
	 */
	public updatePartial(): void {
		let row: number = 2;

		for (let i = 0; i < this.teams.length; i++) {
			const team = this.teams[i];

			if (this.showTeamTotals) {
				this.updateTeamData(team, row);
				row++;
			}

			for (let j = 0; j < team.getMembers().length; j++) {
				const player = team.getMembers()[j];

				this.updatePlayerData(player, row, this.getStringColor(player.getPlayer()), player.trackedData);

				row++;
			}
		}
	}

	private getStringColor(player: player): string {
		if (GetLocalPlayer() == player) return HexColors.TANGERINE;
		if (IsPlayerAlly(GetLocalPlayer(), player)) return HexColors.GREEN;
		return HexColors.WHITE;
	}

	/**
	 * Sets an alert for a country on the scoreboard.
	 * @param {player} player - The player who claimed the country.
	 * @param {string} countryName - The name of the country.
	 */
	public setAlert(player: player, countryName: string): void {
		this.setItemValue(`${NameManager.getInstance().getDisplayName(player)} claimed ${HexColors.TANGERINE}${countryName}|r`, this.size, 1);
	}

	public destroy() {
		this.teams = null;
		DestroyMultiboard(this.board);
		this.board = null;
	}

	private updateTeamData(team: Team, row: number) {
		this.setItemValue(`${HexColors.WHITE}Team #${team.getNumber()}|r`, row, this.PLAYER_COL);
		this.setItemValue(`${HexColors.ORANGE}${team.getCities()}`, row, this.CITIES_COL);
		this.setItemValue(`${HexColors.ORANGE}${team.getKills()}`, row, this.KILLS_COL);
		this.setItemValue(`${HexColors.ORANGE}${team.getDeaths()}`, row, this.DEATHS_COL);
	}

	/**
	 * Sets the columns of the scoreboard for a specific player's row.
	 * @param {ActivePlayer} player - The player object.
	 * @param {number} row - The row index.
	 * @param {string} textColor - The text color code.
	 * @param {TrackedData} data - The tracked data for the player.
	 */
	private updatePlayerData(player: ActivePlayer, row: number, textColor: string, data: TrackedData) {
		const playerHandle: player = player.getPlayer();

		let teamPrefix: string = '';

		if (!this.showTeamTotals) {
			teamPrefix = `${HexColors.TANGERINE}[${TeamManager.getInstance().getTeamNumberFromPlayer(playerHandle)}]|r`;
		}

		// Name
		this.setItemValue(`${teamPrefix}${NameManager.getInstance().getDisplayName(playerHandle)}`, row, this.PLAYER_COL);

		// Cities
		const requiredCities = VictoryManager.getCityCountWin();
		const cities = data.cities.cities.length;
		const isCityCountHighlighted = cities >= requiredCities;
		const cityTextColor = isCityCountHighlighted ? HexColors.RED : textColor;
		this.setItemValue(`${cityTextColor}${cities}`, row, this.CITIES_COL);

		// Kills
		this.setItemValue(`${textColor}${data.killsDeaths.get(playerHandle).killValue}`, row, this.KILLS_COL);

		// Deaths
		this.setItemValue(`${textColor}${data.killsDeaths.get(playerHandle).deathValue}`, row, this.DEATHS_COL);

		// Status
		if (player.status.isNomad() || player.status.isSTFU()) {
			this.setItemValue(`${player.status.status} ${player.status.statusDuration}`, row, this.STATUS_COL);
		} else {
			this.setItemValue(`${player.status.status}`, row, this.STATUS_COL);
		}
	}
}
