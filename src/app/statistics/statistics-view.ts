import { HexColors } from '../utils/hex-colors';
import { StatisticsModel } from './statistics-model';

export class StatisticsView {
	private backdrop: framehandle;
	private header: framehandle;
	private minimizeButton: framehandle;
	private columns: framehandle[];
	private rows: Map<string, framehandle>;

	private static readonly ROW_HEIGHT: number = 0.02;
	private static readonly COLUMN_HEIGHT: number = 0.5;

	constructor(model: StatisticsModel) {
    		this.backdrop = BlzCreateFrame('StatisticsBoard', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
    		this.header = BlzFrameGetChild(this.backdrop,0);
    		this.minimizeButton = BlzFrameGetChild(this.header, 3);
    		this.columns = [];
	    	this.rows = new Map<string, framehandle>();
    		this.buildColumns(model);
	    	this.setVisibility(false);
	}

	public setVisibility(isVisible: boolean) {
		BlzFrameSetVisible(this.backdrop, isVisible);
	}

	public setPlayedTimeText(time: string) {
		const frame: framehandle = BlzFrameGetChild(this.header, 0);
		BlzFrameSetText(frame, time);
	}

	public setGameWinnerText(playerName: string) {
		const frame: framehandle = BlzFrameGetChild(this.header, 1);
		BlzFrameSetText(frame, playerName);
	}

	public getMinimizeButtonText(): string {
		let buttonText: string = '';

		if (GetLocalPlayer() == GetTriggerPlayer()) {
			buttonText = BlzFrameGetText(this.minimizeButton);
		}

		return buttonText;
	}

	public refreshRows(model: StatisticsModel) {
		this.rows.forEach((frame, key) => {
			const parts = key.split('_');
			const columnIndex = parseInt(parts[0], 10);
			const rowIndex = parseInt(parts[1], 10);
			const columnData = model.getColumnData()[columnIndex];
			const player = model.getRanks()[rowIndex];
			const newText = columnData.textFunction(player);
			BlzFrameSetText(frame, newText);
		});
	}

	public setMinimizeButtonClickEvent(callback: () => void): void {
		const t: trigger = CreateTrigger();
		BlzTriggerRegisterFrameEvent(t, this.minimizeButton, FRAMEEVENT_CONTROL_CLICK);
		TriggerAddCondition(t, Condition(callback));
	}

	public showStats(player: player): void {
		if (GetLocalPlayer() == player) {
			BlzFrameSetAbsPoint(this.backdrop, FRAMEPOINT_CENTER, 0.4, 0.3);
			BlzFrameSetSize(this.backdrop, 1, 0.56);
			BlzFrameSetText(this.minimizeButton, 'Hide Stats');
			this.columns.forEach((col) => {
				BlzFrameSetVisible(col, true);
			});
		}
	}

	public hideStats(player: player): void {
		if (GetLocalPlayer() == player) {
			BlzFrameSetSize(this.backdrop, 1, 0.05);
			BlzFrameSetAbsPoint(this.backdrop, FRAMEPOINT_CENTER, 0.4, 0.555);
			BlzFrameSetText(this.minimizeButton, 'Show Stats');
			this.columns.forEach((col) => {
				BlzFrameSetVisible(col, false);
			});
		}
	}

	private buildColumns(model: StatisticsModel) {
		const headerY: number = -0.05;
		const rowHeight: number = StatisticsView.ROW_HEIGHT;
		let headerX: number = 0.008;


		model.getColumnData().forEach((entry, columnIndex) => {
			const { size, header } = entry;

			const container: framehandle = BlzCreateFrameByType('FRAME', `Column`, this.backdrop, '', 0);
			BlzFrameSetPoint(container, FRAMEPOINT_TOPLEFT, this.backdrop, FRAMEPOINT_TOPLEFT, headerX, headerY);
			BlzFrameSetSize(container, size, StatisticsView.COLUMN_HEIGHT);

			this.columns.push(container);

			const headerFrame: framehandle = BlzCreateFrame(`ColumnHeaderText`, container, 0, 0);
			BlzFrameSetPoint(headerFrame, FRAMEPOINT_TOPLEFT, container, FRAMEPOINT_TOPLEFT, 0, 0);
			BlzFrameSetText(headerFrame, `${HexColors.TANGERINE}${header}|r`);
			BlzFrameSetSize(container, size, rowHeight);

			let yGap: number = -0.03;
			let rowIndex = 0;

			model.getRanks().forEach((player) => {
				const dataFrame = BlzCreateFrame('ColumnDataText', headerFrame, 0, 0);
				BlzFrameSetPoint(dataFrame, FRAMEPOINT_TOPLEFT, headerFrame, FRAMEPOINT_TOPLEFT, 0, yGap);

				const rowKey = `${columnIndex}_${rowIndex}`;
				this.rows.set(rowKey, dataFrame);

				rowIndex++;
				yGap -= rowHeight;
			});

			headerX += size;
		});
	}
}
