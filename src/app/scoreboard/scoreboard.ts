import { MAP_NAME } from 'src/app/utils/map-info';

export abstract class Scoreboard {
	protected board: multiboard;
	protected size: number;

	public constructor() {
		this.build();
	}

	abstract updateFull(): void;
	abstract updatePartial(): void;
	abstract setAlert(player: player, countryName: string): void;
	abstract destroy(): void;

	/**
	 * Builds the scoreboard.
	 * @param {ActivePlayer[]} aPlayers - An array of active players.
	 */
	public build() {
		this.board = CreateMultiboard();
		this.setTitle(`${MAP_NAME}`);
	}

	/**
	 * Sets the title of the scoreboard.
	 * @param {string} str - The title text.
	 */
	public setTitle(str: string) {
		MultiboardSetTitleText(this.board, str);
	}

	/**
	 * Sets the visibility of the scoreboard.
	 * @param {boolean} bool - Whether to display the scoreboard or not.
	 */
	public setVisibility(bool: boolean) {
		MultiboardDisplay(this.board, bool);
	}

	/**
	 * Sets the width of an item in the scoreboard.
	 * @param {number} width - The width of the item as a percentage.
	 * @param {number} row - The row index of the item.
	 * @param {number} col - The column index of the item.
	 */
	protected setItemWidth(width: number, row: number, col: number) {
		let mbI: multiboarditem = MultiboardGetItem(this.board, row - 1, col - 1);
		MultiboardSetItemWidth(mbI, width / 100);
		MultiboardReleaseItem(mbI);
		mbI = null;
	}

	/**
	 * Sets the value of an item in the scoreboard.
	 * @param {string} value - The value to set.
	 * @param {number} row - The row index of the item.
	 * @param {number} col - The column index of the item.
	 */
	protected setItemValue(value: string, row: number, col: number) {
		let mbI: multiboarditem = MultiboardGetItem(this.board, row - 1, col - 1);
		MultiboardSetItemValue(mbI, value);
		MultiboardReleaseItem(mbI);
		mbI = null;
	}
}
