import { HexColors } from 'src/app/utils/hex-colors';
import { StatisticsModel } from './statistics-model';
import { StatisticsPage } from './statistics-page';

export class StatisticsView {
	private backdrop: framehandle;
	private header: framehandle;
	private footerBackdrop: framehandle;
	private minimizeButton: framehandle;
	private columns: framehandle[];
	private rows: Map<string, framehandle>;
	private leftButton: framehandle;
	private rightButton: framehandle;
	private pageIndicator: framehandle;
	private page: StatisticsPage;
	private model: StatisticsModel;

	private static readonly ROW_HEIGHT: number = 0.02;
	private static readonly COLUMN_HEIGHT: number = 0.3;
	private static readonly COLUMNS_PER_PAGE: number = 11;
	private static readonly PINNED_COLUMNS: number = 1;

	constructor(model: StatisticsModel) {
		this.model = model;
		this.backdrop = BlzCreateFrame('StatisticsBoard', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
		BlzFrameSetAbsPoint(this.backdrop, FRAMEPOINT_CENTER, 0.4, 0.26);
		BlzFrameSetSize(this.backdrop, 1, 0.64);

		if (IsPlayerObserver(GetLocalPlayer())) {
			BlzFrameSetAlpha(this.backdrop, 254);
		}

		this.footerBackdrop = BlzCreateFrameByType('BACKDROP', 'FooterBackdrop', this.backdrop, '', 0);
		this.header = BlzFrameGetChild(this.backdrop, 0);
		this.minimizeButton = BlzFrameGetChild(this.header, 3);
		this.columns = [];
		this.rows = new Map<string, framehandle>();

		this.setupPaginationUI();
		this.buildColumns();
		this.page = new StatisticsPage(this.model, this.pageIndicator, StatisticsView.COLUMNS_PER_PAGE, StatisticsView.PINNED_COLUMNS, () =>
			this.updateColumnVisibility()
		);

		this.updateColumnVisibility();

		this.setVisibility(false);
		this.updatePaginationButtons();
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

	public refreshRows() {
		this.rows.forEach((frame, key) => {
			const parts = key.split('_');
			const columnIndex = parseInt(parts[0], 10);
			const rowIndex = parseInt(parts[1], 10);

			if (this.page.isPinnedColumn(columnIndex) || this.page.isColumnOnCurrentPage(columnIndex)) {
				const columnData = this.model.getColumnData()[columnIndex];
				const player = this.model.getRanks()[rowIndex];
				const newText = columnData.textFunction(player);
				BlzFrameSetText(frame, newText);
			}
		});
	}

	public setMinimizeButtonClickEvent(callback: () => void): void {
		const t: trigger = CreateTrigger();
		BlzTriggerRegisterFrameEvent(t, this.minimizeButton, FRAMEEVENT_CONTROL_CLICK);
		TriggerAddCondition(t, Condition(callback));
	}

	public showStats(player: player): void {
		if (GetLocalPlayer() == player) {
			BlzFrameSetAbsPoint(this.backdrop, FRAMEPOINT_CENTER, 0.4, 0.26);
			BlzFrameSetSize(this.backdrop, 1, 0.64);
			BlzFrameSetText(this.minimizeButton, 'Hide Stats');

			this.updateColumnVisibility();
			BlzFrameSetVisible(this.footerBackdrop, true);
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

			BlzFrameSetVisible(this.footerBackdrop, false);
		}
	}

	private CreateFooterButton(parent: framehandle, name: string, text: string, xOffset: number, onClick: () => void): framehandle {
		const button: framehandle = BlzCreateFrameByType('GLUETEXTBUTTON', name, parent, 'ScriptDialogButton', 0);
		BlzFrameSetSize(button, 0.13, 0.03);
		BlzFrameSetPoint(button, FRAMEPOINT_CENTER, parent, FRAMEPOINT_CENTER, xOffset, 0);
		BlzFrameSetText(button, text);
		BlzFrameSetVisible(button, true);

		const buttonTrigger: trigger = CreateTrigger();
		BlzTriggerRegisterFrameEvent(buttonTrigger, button, FRAMEEVENT_CONTROL_CLICK);
		TriggerAddAction(buttonTrigger, () => {
			if (GetLocalPlayer() == GetTriggerPlayer()) {
				onClick();
			}
		});

		return button;
	}

	private updateColumnVisibility(): void {
		let headerX = BlzFrameGetWidth(this.columns[0]) + 0.002;

		this.columns.forEach((column, index) => {
			let visible = this.page.isPinnedColumn(index) || this.page.isColumnOnCurrentPage(index);
			BlzFrameSetVisible(column, visible);

			if (!this.page.isPinnedColumn(index) && visible) {
				BlzFrameSetPoint(column, FRAMEPOINT_TOPLEFT, this.backdrop, FRAMEPOINT_TOPLEFT, headerX, -0.05);
				headerX += BlzFrameGetWidth(column);
			}
		});

		this.refreshRows();
		this.updatePaginationButtons();
	}

	private updatePaginationButtons(): void {
		if (GetLocalPlayer() == GetLocalPlayer()) {
			this.setButtonEnabled(this.leftButton, this.page.getCurrentPage() > 0);
			this.setButtonEnabled(this.rightButton, this.page.getCurrentPage() < this.page.getTotalPages() - 1);
		}
	}

	private setButtonEnabled(button: framehandle, enabled: boolean): void {
		BlzFrameSetEnable(button, enabled);
		if (enabled) {
			BlzFrameSetTextColor(button, BlzConvertColor(255, 255, 255, 255));
		} else {
			BlzFrameSetTextColor(button, BlzConvertColor(255, 128, 128, 128));
		}
	}

	private setupPaginationUI(): void {
		this.footerBackdrop = BlzCreateFrameByType('FRAME', 'FooterFrame', this.backdrop, '', 0);
		BlzFrameSetSize(this.footerBackdrop, 0.8, StatisticsView.ROW_HEIGHT);
		BlzFrameSetPoint(this.footerBackdrop, FRAMEPOINT_TOP, this.backdrop, FRAMEPOINT_BOTTOM, 0, 0.03);
		BlzFrameSetVisible(this.footerBackdrop, true);

		this.pageIndicator = BlzCreateFrameByType('TEXT', 'PageIndicator', this.footerBackdrop, '', 0);
		BlzFrameSetPoint(this.pageIndicator, FRAMEPOINT_CENTER, this.footerBackdrop, FRAMEPOINT_CENTER, 0, 0);

		this.leftButton = this.CreateFooterButton(this.footerBackdrop, 'LeftFooterButton', 'Previous', -0.1, () => {
			if (GetLocalPlayer() == GetLocalPlayer()) {
				this.page.previousPage();
				this.updatePaginationButtons();
			}
		});

		this.rightButton = this.CreateFooterButton(this.footerBackdrop, 'RightFooterButton', 'Next', 0.1, () => {
			if (GetLocalPlayer() == GetLocalPlayer()) {
				this.page.nextPage();
				this.updatePaginationButtons();
			}
		});
	}

	private buildColumns() {
		const headerY: number = -0.05;
		const rowHeight: number = StatisticsView.ROW_HEIGHT;
		let headerX: number = 0.008;

		this.model.getColumnData().forEach((entry, columnIndex) => {
			const { size, header } = entry;

			const container: framehandle = BlzCreateFrameByType('FRAME', `Column`, this.backdrop, '', 0);
			BlzFrameSetPoint(container, FRAMEPOINT_TOPLEFT, this.backdrop, FRAMEPOINT_TOPLEFT, headerX, headerY);
			BlzFrameSetSize(container, size, StatisticsView.COLUMN_HEIGHT);

			this.columns.push(container);

			const headerFrame: framehandle = BlzCreateFrame(`ColumnHeaderText`, container, 0, 0);
			BlzFrameSetPoint(headerFrame, FRAMEPOINT_TOPLEFT, container, FRAMEPOINT_TOPLEFT, 0, 0);
			BlzFrameSetText(headerFrame, `${HexColors.TANGERINE}${header}|r`);
			BlzFrameSetSize(headerFrame, size, rowHeight);

			let yGap: number = -0.03;
			let rowIndex = 0;

			this.model.getRanks().forEach((player) => {
				const dataFrame = BlzCreateFrame('ColumnDataText', headerFrame, 0, 0);
				BlzFrameSetPoint(dataFrame, FRAMEPOINT_TOPLEFT, headerFrame, FRAMEPOINT_TOPLEFT, 0, yGap);

				const rowKey = `${columnIndex}_${rowIndex}`;
				this.rows.set(rowKey, dataFrame);

				const columnData = this.model.getColumnData()[columnIndex];
				const newText = columnData.textFunction(player);
				BlzFrameSetText(dataFrame, newText);

				rowIndex++;
				yGap -= rowHeight;
			});

			headerX += size;
		});
	}
}
