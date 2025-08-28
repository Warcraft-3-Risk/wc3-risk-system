import { NameManager } from '../managers/names/name-manager';
import { TrackedData } from '../player/data/tracked-data';
import { ActivePlayer } from '../player/types/active-player';
import { HexColors } from '../utils/hex-colors';
import { ShuffleArray } from '../utils/utils';
import { Scoreboard } from './scoreboard';
import { VictoryManager } from '../managers/victory-manager';

export class ObserverBoard extends Scoreboard {
	private players: ActivePlayer[];
	private readonly PLAYER_COL: number = 1;
	private readonly INCOME_COL: number = 2;
	private readonly GOLD_COL: number = 3;
	private readonly CITIES_COL: number = 4;
	private readonly KILLS_COL: number = 5;
	private readonly DEATHS_COL: number = 6;
	private readonly STATUS_COL: number = 7;

	public constructor(players: ActivePlayer[]) {
		super();

		this.players = players;
		this.size = this.players.length + 3;
		ShuffleArray(this.players);

		MultiboardSetColumnCount(this.board, 7);

		for (let i = 1; i <= this.size; i++) {
			MultiboardSetRowCount(this.board, MultiboardGetRowCount(this.board) + 1);
			this.setItemWidth(6.2, i, this.PLAYER_COL);
			this.setItemWidth(3.9, i, this.INCOME_COL);
			this.setItemWidth(3.0, i, this.GOLD_COL);
			this.setItemWidth(2.6, i, this.CITIES_COL);
			this.setItemWidth(3.9, i, this.KILLS_COL);
			this.setItemWidth(3.9, i, this.DEATHS_COL);
			this.setItemWidth(3.8, i, this.STATUS_COL);
		}

		this.setItemValue(`${HexColors.TANGERINE}Player|r`, 1, this.PLAYER_COL);
		this.setItemValue(`${HexColors.TANGERINE}Inc|r`, 1, this.INCOME_COL);
		this.setItemValue(`${HexColors.TANGERINE}G|r`, 1, this.GOLD_COL);
		this.setItemValue(`${HexColors.TANGERINE}C|r`, 1, this.CITIES_COL);
		this.setItemValue(`${HexColors.TANGERINE}K|r`, 1, this.KILLS_COL);
		this.setItemValue(`${HexColors.TANGERINE}D|r`, 1, this.DEATHS_COL);
		this.setItemValue(`${HexColors.TANGERINE}Status|r`, 1, this.STATUS_COL);

		this.setItemWidth(20.0, this.size, this.PLAYER_COL);
		this.setItemWidth(0.0, this.size, this.INCOME_COL);
		this.setItemWidth(0.0, this.size, this.GOLD_COL);
		this.setItemWidth(0.0, this.size, this.CITIES_COL);
		this.setItemWidth(0.0, this.size, this.KILLS_COL);
		this.setItemWidth(0.0, this.size, this.DEATHS_COL);
		this.setItemWidth(0.0, this.size, this.STATUS_COL);

		this.updateFull();

		MultiboardSetItemsStyle(this.board, true, false);
		MultiboardMinimize(this.board, true);
		MultiboardMinimize(this.board, false);
		this.setVisibility(false);

	}

	public updateFull(): void {
		this.players.sort((pA, pB) => {
			const playerAIncome: number = pA.trackedData.income.income;
			const playerBIncome: number = pB.trackedData.income.income;

			if (playerAIncome < playerBIncome) return 1;
			if (playerAIncome > playerBIncome) return -1;

			return 0;
		});

		let row: number = 2;

		this.players.forEach((player) => {
			player.trackedData.income.delta = 0;
			const data: TrackedData = player.trackedData;
			const textColor: string = HexColors.WHITE;

			this.setColumns(player, row, textColor, data);
			row++;
		});
	}

	public updatePartial(): void {
		let row: number = 2;

		this.players.forEach((player) => {
			const data: TrackedData = player.trackedData;
			let textColor: string = HexColors.WHITE;
			this.setColumns(player, row, textColor, data);
			row++;
		});
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
		this.players = null;
		DestroyMultiboard(this.board);
		this.board = null;
	}

	private setColumns(player: ActivePlayer, row: number, textColor: string, data: TrackedData) {
		// Name
		this.setItemValue(`${NameManager.getInstance().getDisplayName(player.getPlayer())}`, row, this.PLAYER_COL);

		// Income
		if (player.status.isAlive() || player.status.isNomad()) {
			this.setItemValue(
				`${textColor}${player.trackedData.income.income - player.trackedData.income.delta}(${this.getIncomeDelta(
					player.trackedData.income.delta
				)})`,
				row,
				this.INCOME_COL
			);
		} else {
			this.setItemValue(`${textColor}-`, row, this.INCOME_COL);
		}

		// Gold
		const playerGold = GetPlayerState(player.getPlayer(), PLAYER_STATE_RESOURCE_GOLD);
		this.setItemValue(`${textColor}${playerGold}`, row, this.GOLD_COL);

		// Cities
		const requiredCities = VictoryManager.getCityCountWin();
		const cities = data.cities.cities.length;
		const isCityCountHighlighted = cities >= requiredCities;
		const cityTextColor = isCityCountHighlighted ? HexColors.RED : textColor;
		this.setItemValue(`${cityTextColor}${cities}`, row, this.CITIES_COL);

		// Kills
		this.setItemValue(`${textColor}${data.killsDeaths.get(player.getPlayer()).killValue}`, row, this.KILLS_COL);

		// Deaths
		this.setItemValue(`${textColor}${data.killsDeaths.get(player.getPlayer()).deathValue}`, row, this.DEATHS_COL);

		// Status
		if (player.status.isNomad() || player.status.isSTFU()) {
			this.setItemValue(`${player.status.status} ${player.status.statusDuration}`, row, this.STATUS_COL);
		} else {
			this.setItemValue(`${player.status.status}`, row, this.STATUS_COL);
		}
	}

	private getIncomeDelta(delta: number): string {
		if (delta == 0) return `${HexColors.LIGHT_GRAY}${delta}|r`;
		if (delta >= 1) return `${HexColors.GREEN}${delta}|r`;
		if (delta < 0) return `${HexColors.RED}${delta}|r`;
	}
}