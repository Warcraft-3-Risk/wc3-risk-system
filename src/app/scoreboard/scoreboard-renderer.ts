import { MAP_NAME } from 'src/app/utils/map-info';
import { ScoreboardDataModel } from './scoreboard-data-model';

export abstract class ScoreboardRenderer {
	protected board: multiboard;
	protected size: number;
	protected columnCount: number;

	public constructor(columnCount: number) {
		this.columnCount = columnCount;
		this.board = CreateMultiboard();
		MultiboardSetTitleText(this.board, `${MAP_NAME}`);
	}

	abstract renderFull(data: ScoreboardDataModel): void;
	abstract renderPartial(data: ScoreboardDataModel): void;
	abstract renderAlert(player: player, countryName: string): void;

	/**
	 * Destroying multiboard handles causes WC3 handle ID shuffling, which
	 * corrupts replays. Instead of destroying, just hide the board.
	 */
	abstract destroy(): void;

	public setTitle(str: string): void {
		MultiboardSetTitleText(this.board, str);
	}

	public setVisibility(bool: boolean): void {
		MultiboardDisplay(this.board, bool);
	}

	protected setItemWidth(width: number, row: number, col: number): void {
		let mbI: multiboarditem = MultiboardGetItem(this.board, row - 1, col - 1);
		MultiboardSetItemWidth(mbI, width / 100);
		MultiboardReleaseItem(mbI);
		mbI = undefined;
	}

	protected setItemValue(value: string, row: number, col: number): void {
		let mbI: multiboarditem = MultiboardGetItem(this.board, row - 1, col - 1);
		MultiboardSetItemValue(mbI, value);
		MultiboardReleaseItem(mbI);
		mbI = undefined;
	}

	protected finalizeSetup(): void {
		MultiboardSetItemsStyle(this.board, true, false);
		MultiboardMinimize(this.board, true);
		MultiboardMinimize(this.board, false);
	}
}
