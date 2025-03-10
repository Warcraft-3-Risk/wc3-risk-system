import { GamePlayer } from '../entity/player/game-player';
import { PlayerData } from '../entity/player/player-data';
import { NameManager } from '../names/name-manager';
import { HexColors } from '../utils/hex-colors';
import { ShuffleArray } from '../utils/utils';
import { Scoreboard } from './scoreboard';

export class ObserverBoard extends Scoreboard {
	private players: GamePlayer[];
	private readonly PLAYER_COL: number = 1;
	private readonly INCOME_COL: number = 2;
	private readonly GOLD_COL: number = 3;
	private readonly CITIES_COL: number = 4;
	private readonly KILLS_COL: number = 5;
	private readonly DEATHS_COL: number = 6;
	private readonly STATUS_COL: number = 7;

	public constructor(players: GamePlayer[]) {
		super();

		this.players = players;
		this.size = this.players.length + 3;
		ShuffleArray(this.players);
		MultiboardSetColumnCount(this.board, 7);

		for (let i = 1; i <= this.size; i++) {
			MultiboardSetRowCount(this.board, MultiboardGetRowCount(this.board) + 1);
			this.setItemWidth(6.2, i, this.PLAYER_COL);
			this.setItemWidth(4.5, i, this.INCOME_COL);
			this.setItemWidth(3.3, i, this.GOLD_COL);
			this.setItemWidth(3.0, i, this.CITIES_COL);
			this.setItemWidth(3.9, i, this.KILLS_COL);
			this.setItemWidth(3.9, i, this.DEATHS_COL);
			this.setItemWidth(3.0, i, this.STATUS_COL);
		}

		this.setItemValue(`${HexColors.TANGERINE}Player|r`, 1, this.PLAYER_COL);
		this.setItemValue(`${HexColors.TANGERINE}Income|r`, 1, this.INCOME_COL);
		this.setItemValue(`${HexColors.TANGERINE}Gold|r`, 1, this.GOLD_COL);
		this.setItemValue(`${HexColors.TANGERINE}Cities|r`, 1, this.CITIES_COL);
		this.setItemValue(`${HexColors.TANGERINE}Kills|r`, 1, this.KILLS_COL);
		this.setItemValue(`${HexColors.TANGERINE}Deaths|r`, 1, this.DEATHS_COL);
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
			const playerAIncome: number = pA.getData().getIncome().income;
			const playerBIncome: number = pB.getData().getIncome().income;

			if (playerAIncome < playerBIncome) return 1;
			if (playerAIncome > playerBIncome) return -1;

			return 0;
		});

		let row: number = 2;

		this.players.forEach((player) => {
			player.getData().getIncome().delta = 0;
			const data: PlayerData = player.getData();
			const textColor: string = HexColors.WHITE;

			if (player.getStatus().isAlive() || player.getStatus().isNomad()) {
				this.setItemValue(
					`${textColor}${player.getData().getIncome().income - player.getData().getIncome().delta}(${player.getData().getIncome().delta})`,
					row,
					this.INCOME_COL
				);
			} else {
				this.setItemValue(`${textColor}-`, row, 2);
			}

			this.setColumns(player, row, textColor, data);
			row++;
		});
	}

	public updatePartial(): void {
		let row: number = 2;

		this.players.forEach((player) => {
			const data: PlayerData = player.getData();
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

	private setColumns(player: GamePlayer, row: number, textColor: string, data: PlayerData) {
		this.setItemValue(`${NameManager.getInstance().getDisplayName(player.getPlayer())}`, row, this.PLAYER_COL);

		if (player.getStatus().isAlive() || player.getStatus().isNomad()) {
			this.setItemValue(
				`${textColor}${player.getData().getIncome().income - player.getData().getIncome().delta}(${this.getIncomeDelta(
					player.getData().getIncome().delta
				)})`,
				row,
				this.INCOME_COL
			);
		} else {
			this.setItemValue(`${textColor}-`, row, 2);
		}

		this.setItemValue(`${textColor}${GetPlayerState(player.getPlayer(), PLAYER_STATE_RESOURCE_GOLD)}`, row, this.GOLD_COL);
		this.setItemValue(`${textColor}${data.getCities().cities.length}`, row, this.CITIES_COL);
		this.setItemValue(`${textColor}${data.getKillsDeaths().get(player.getPlayer()).killValue}`, row, this.KILLS_COL);
		this.setItemValue(`${textColor}${data.getKillsDeaths().get(player.getPlayer()).deathValue}`, row, this.DEATHS_COL);

		if (player.getStatus().isNomad() || player.getStatus().isSTFU()) {
			this.setItemValue(`${player.getStatus()} ${player.getStatus()}`, row, this.STATUS_COL);
		} else {
			this.setItemValue(`${player.getStatus()}`, row, this.STATUS_COL);
		}
	}

	private getIncomeDelta(delta: number): string {
		if (delta == 0) return `${HexColors.LIGHT_GRAY}${delta}|r`;
		if (delta >= 1) return `${HexColors.GREEN}${delta}|r`;
		if (delta < 0) return `${HexColors.RED}${delta}|r`;
	}
}
