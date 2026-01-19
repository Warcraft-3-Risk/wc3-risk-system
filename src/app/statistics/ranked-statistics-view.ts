import { HexColors } from 'src/app/utils/hex-colors';
import { StatisticsModel } from './statistics-model';
import { StatisticsPage } from './statistics-page';
import { PlayerManager } from '../player/player-manager';
import { IStatisticsView } from './base-statistics-view';
import { ColumnConfig, GetStatisticsColumns } from './statistics-column-config';
import { CreateObserverButton } from '../utils/observer-helper';

/**
 * Statistics view for ranked games
 * Includes the "Stats" button to access personal rating stats
 * Includes the Rating column in the statistics board
 */
export class RankedStatisticsView implements IStatisticsView {
	private backdrop: framehandle;
	private header: framehandle;
	private footerBackdrop: framehandle;
	private minimizeButton: framehandle;
	private personalStatsButton: framehandle;
	private leaderboardButton: framehandle;
	private columns: framehandle[];
	private rows: Map<string, framehandle>;
	private icons: Map<string, framehandle>;
	private leftButton: framehandle;
	private rightButton: framehandle;
	private pageIndicator: framehandle;
	private page: StatisticsPage;
	private model: StatisticsModel;
	private columnData: ColumnConfig[];

	private static readonly ROW_HEIGHT: number = 0.02;
	private static readonly COLUMN_HEIGHT: number = 0.3;
	private static readonly COLUMNS_PER_PAGE: number = 11;
	private static readonly PINNED_COLUMNS: number = 1;

	constructor(model: StatisticsModel) {
		this.model = model;
		// Ranked view includes the Rating column
		this.columnData = GetStatisticsColumns(model, true);

		this.backdrop = BlzCreateFrame('StatisticsBoard', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
		BlzFrameSetAbsPoint(this.backdrop, FRAMEPOINT_CENTER, 0.4, 0.26);
		BlzFrameSetSize(this.backdrop, 1, 0.64);

		if (IsPlayerObserver(GetLocalPlayer())) {
			BlzFrameSetAlpha(this.backdrop, 254);
		}

		this.footerBackdrop = BlzCreateFrameByType('BACKDROP', 'FooterBackdrop', this.backdrop, '', 0);
		this.header = BlzFrameGetChild(this.backdrop, 0);
		this.columns = [];
		this.rows = new Map<string, framehandle>();
		this.icons = new Map<string, framehandle>();

		this.setupMinimizeButton();
		this.setupLeaderboardButton();
		this.setupPersonalStatsButton();

		this.setupPaginationUI();
		this.buildColumns();
		this.page = new StatisticsPage(this.columnData.length, this.pageIndicator, RankedStatisticsView.COLUMNS_PER_PAGE, RankedStatisticsView.PINNED_COLUMNS, () =>
			this.updateColumnVisibility()
		);

		this.updateColumnVisibility();

		this.setVisibility(false);
		this.updatePaginationButtons();
	}

	public setVisibility(isVisible: boolean) {
		BlzFrameSetVisible(this.backdrop, isVisible);
	}

	public setVisibilityForPlayer(isVisible: boolean, player: player): void {
		if (GetLocalPlayer() == player) {
			BlzFrameSetVisible(this.backdrop, isVisible);
		}
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

		if (GetLocalPlayer() == GetLocalPlayer()) {
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
				const columnData = this.columnData[columnIndex];
				const player = this.model.getRanks()[rowIndex];
				const newText = columnData.textFunction(player);
				BlzFrameSetText(frame, newText);

				// Update icon visibility and texture if this column has an icon function
				if (columnData.iconFunction) {
					const iconFrame = this.icons.get(key);
					if (iconFrame) {
						const iconPath = columnData.iconFunction(player);
						const iconSize = columnData.iconSize || 0.015;
						const iconPadding = 0.002;
						const yGap = -0.03 - rowIndex * RankedStatisticsView.ROW_HEIGHT;

						if (iconPath) {
							BlzFrameSetTexture(iconFrame, iconPath, 0, true);
							BlzFrameSetVisible(iconFrame, true);
							// Reposition text to the right of icon
							BlzFrameClearAllPoints(frame);
							BlzFrameSetPoint(frame, FRAMEPOINT_TOPLEFT, BlzFrameGetParent(frame), FRAMEPOINT_TOPLEFT, iconSize + iconPadding, yGap);
						} else {
							// Hide icon and reposition text to start of column (like normal text column)
							BlzFrameSetVisible(iconFrame, false);
							BlzFrameClearAllPoints(frame);
							BlzFrameSetPoint(frame, FRAMEPOINT_TOPLEFT, BlzFrameGetParent(frame), FRAMEPOINT_TOPLEFT, 0, yGap);
						}
					}
				}
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
			BlzFrameSetSize(this.backdrop, 1, 0.64);
			BlzFrameSetAbsPoint(this.backdrop, FRAMEPOINT_CENTER, 0.4, 0.26);
			BlzFrameSetText(this.minimizeButton, 'Minimize');

			this.updateColumnVisibility();
			BlzFrameSetVisible(this.footerBackdrop, true);

			BlzFrameSetEnable(this.minimizeButton, false);
			BlzFrameSetEnable(this.minimizeButton, true);
		}
	}

	public hideStats(player: player): void {
		if (GetLocalPlayer() == player) {
			BlzFrameSetSize(this.backdrop, 1, 0.08);
			BlzFrameSetAbsPoint(this.backdrop, FRAMEPOINT_CENTER, 0.4, 0.26 + (0.64 - 0.08) / 2);
			BlzFrameSetText(this.minimizeButton, 'Maximize');
			this.columns.forEach((col) => {
				BlzFrameSetVisible(col, false);
			});

			BlzFrameSetVisible(this.footerBackdrop, false);
			BlzFrameSetEnable(this.minimizeButton, false);
			BlzFrameSetEnable(this.minimizeButton, true);
		}
	}

	private CreateFooterButton(parent: framehandle, name: string, text: string, xOffset: number, onClick: (executeAction: boolean) => void): framehandle {
		const button: framehandle = BlzCreateFrameByType('GLUETEXTBUTTON', name, parent, 'ScriptDialogButton', 0);
		BlzFrameSetSize(button, 0.13, 0.03);
		BlzFrameSetPoint(button, FRAMEPOINT_CENTER, parent, FRAMEPOINT_CENTER, xOffset, 0);
		BlzFrameSetText(button, text);
		BlzFrameSetVisible(button, true);

		const buttonTrigger: trigger = CreateTrigger();
		BlzTriggerRegisterFrameEvent(buttonTrigger, button, FRAMEEVENT_CONTROL_CLICK);
		TriggerAddAction(buttonTrigger, () => {
			if (GetLocalPlayer() == GetTriggerPlayer()) {
				onClick(true);
			}
		});

		// Hotfix for observers to be able to use buttons
		if (GetLocalPlayer() === GetLocalPlayer()) {
			const t = CreateTimer();
			TimerStart(t, 1, true, () => {
				if (BlzFrameIsVisible(BlzFrameGetChild(button, 5))) {
					onClick(IsPlayerObserver(GetLocalPlayer()));
				}
			});
		}

		return button;
	}

	private updateColumnVisibility(): void {
		let headerX = BlzFrameGetWidth(this.columns[0]) + 0.002;

		this.columns.forEach((column, index) => {
			let visible = this.page.isPinnedColumn(index) || this.page.isColumnOnCurrentPage(index);
			BlzFrameSetVisible(column, visible);

			if (!this.page.isPinnedColumn(index) && visible) {
				BlzFrameSetPoint(column, FRAMEPOINT_TOPLEFT, this.backdrop, FRAMEPOINT_TOPLEFT, headerX, -0.06);
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

	private setupMinimizeButton(): void {
		this.minimizeButton = BlzFrameGetChild(this.header, 3);

		// Hotfix for observers to be able to use buttons
		CreateObserverButton(this.minimizeButton, IsPlayerObserver(GetLocalPlayer()), () => {
			if (this.getMinimizeButtonText() === 'Minimize') {
				this.hideStats(GetLocalPlayer());
			} else if (this.getMinimizeButtonText() === 'Maximize') {
				this.showStats(GetLocalPlayer());
			}
		});
	}

	private setupPaginationUI(): void {
		this.footerBackdrop = BlzCreateFrameByType('FRAME', 'FooterFrame', this.backdrop, '', 0);
		BlzFrameSetSize(this.footerBackdrop, 0.8, RankedStatisticsView.ROW_HEIGHT);
		BlzFrameSetPoint(this.footerBackdrop, FRAMEPOINT_TOP, this.backdrop, FRAMEPOINT_BOTTOM, 0, 0.03);
		BlzFrameSetVisible(this.footerBackdrop, true);

		this.pageIndicator = BlzCreateFrameByType('TEXT', 'PageIndicator', this.footerBackdrop, '', 0);
		BlzFrameSetPoint(this.pageIndicator, FRAMEPOINT_CENTER, this.footerBackdrop, FRAMEPOINT_CENTER, 0, 0);

		this.leftButton = this.CreateFooterButton(this.footerBackdrop, 'LeftFooterButton', 'Previous', -0.1, (executeAction) => {
			if (GetLocalPlayer() == GetLocalPlayer() && executeAction) {
				this.page.previousPage();
				this.updatePaginationButtons();
			}
		});

		this.rightButton = this.CreateFooterButton(this.footerBackdrop, 'RightFooterButton', 'Next', 0.1, (executeAction) => {
			if (GetLocalPlayer() == GetLocalPlayer() && executeAction) {
				this.page.nextPage();
				this.updatePaginationButtons();
			}
		});
	}

	private setupLeaderboardButton(): void {
		// Create button to the left of the minimize button
		this.leaderboardButton = BlzCreateFrameByType('GLUETEXTBUTTON', 'LeaderboardButton', this.header, 'ScriptDialogButton', 0);
		BlzFrameSetSize(this.leaderboardButton, 0.1, 0.03);
		// Position to the left of minimize button (minimize button is at TOPRIGHT, width 0.08)
		BlzFrameSetPoint(this.leaderboardButton, FRAMEPOINT_TOPRIGHT, this.minimizeButton, FRAMEPOINT_TOPLEFT, -0.002, 0);
		BlzFrameSetText(this.leaderboardButton, 'Leaderboard');
		BlzFrameSetVisible(this.leaderboardButton, true);

		// Register click event - toggle the stats window (open if closed, close if open)
		const buttonTrigger = CreateTrigger();
		BlzTriggerRegisterFrameEvent(buttonTrigger, this.leaderboardButton, FRAMEEVENT_CONTROL_CLICK);
		TriggerAddCondition(
			buttonTrigger,
			Condition(() => {
				const triggerPlayer = GetTriggerPlayer();
				if (GetLocalPlayer() == triggerPlayer) {
					const player = PlayerManager.getInstance().players.get(triggerPlayer);
					if (player && player.ratingStatsUI) {
						player.ratingStatsUI.showLeaderboard();
					}

					// Shift focus back to global context, so key events work properly (ESC, F4 etc.)
					BlzFrameSetEnable(this.leaderboardButton, false);
					BlzFrameSetEnable(this.leaderboardButton, true);
				}
			})
		);

		CreateObserverButton(this.leaderboardButton, IsPlayerObserver(GetLocalPlayer()), () => {
			const player = PlayerManager.getInstance().observers.get(GetLocalPlayer());
			if (player && player.ratingStatsUI) {
				player.ratingStatsUI.showLeaderboard();
			}

			// Shift focus back to global context, so key events work properly (ESC, F4 etc.)
			BlzFrameSetEnable(this.leaderboardButton, false);
			BlzFrameSetEnable(this.leaderboardButton, true);
		});
	}

	private setupPersonalStatsButton(): void {
		// Create button to the left of the minimize button
		this.personalStatsButton = BlzCreateFrameByType('GLUETEXTBUTTON', 'PersonalStatsButton', this.header, 'ScriptDialogButton', 0);
		BlzFrameSetSize(this.personalStatsButton, 0.08, 0.03);
		// Position to the left of minimize button (minimize button is at TOPRIGHT, width 0.08)
		BlzFrameSetPoint(this.personalStatsButton, FRAMEPOINT_TOPRIGHT, this.leaderboardButton, FRAMEPOINT_TOPLEFT, -0.002, 0);
		BlzFrameSetText(this.personalStatsButton, 'Stats');
		BlzFrameSetVisible(this.personalStatsButton, true);

		// Register click event - toggle the stats window (open if closed, close if open)
		const buttonTrigger = CreateTrigger();
		BlzTriggerRegisterFrameEvent(buttonTrigger, this.personalStatsButton, FRAMEEVENT_CONTROL_CLICK);
		TriggerAddCondition(
			buttonTrigger,
			Condition(() => {
				const triggerPlayer = GetTriggerPlayer();
				if (GetLocalPlayer() == triggerPlayer) {
					const player = PlayerManager.getInstance().players.get(triggerPlayer);
					if (player && player.ratingStatsUI) {
						player.ratingStatsUI.toggle();
					}

					// Shift focus back to global context, so key events work properly (ESC, F4 etc.)
					BlzFrameSetEnable(this.personalStatsButton, false);
					BlzFrameSetEnable(this.personalStatsButton, true);
				}
			})
		);
	}

	private buildColumns() {
		const headerY: number = -0.06;
		const rowHeight: number = RankedStatisticsView.ROW_HEIGHT;
		let headerX: number = 0.01;

		this.columnData.forEach((entry, columnIndex) => {
			const { size, header } = entry;

			const container: framehandle = BlzCreateFrameByType('FRAME', `Column`, this.backdrop, '', 0);
			BlzFrameSetPoint(container, FRAMEPOINT_TOPLEFT, this.backdrop, FRAMEPOINT_TOPLEFT, headerX, headerY);
			BlzFrameSetSize(container, size, RankedStatisticsView.COLUMN_HEIGHT);

			this.columns.push(container);

			const headerFrame: framehandle = BlzCreateFrame(`ColumnHeaderText`, container, 0, 0);
			BlzFrameSetPoint(headerFrame, FRAMEPOINT_TOPLEFT, container, FRAMEPOINT_TOPLEFT, 0, 0);
			BlzFrameSetText(headerFrame, `${HexColors.TANGERINE}${header}|r`);
			BlzFrameSetSize(headerFrame, size, rowHeight);

			let yGap: number = -0.03;
			let rowIndex = 0;

			this.model.getRanks().forEach((player) => {
				const columnData = this.columnData[columnIndex];
				const rowKey = `${columnIndex}_${rowIndex}`;

				// Check if this column has an icon function (always create icon frame if function exists)
				if (columnData.iconFunction) {
					const iconSize = columnData.iconSize || 0.015;
					const iconPadding = 0.002;
					const iconVerticalOffset = -0.0025; // Offset to vertically center icon with text

					// Create icon frame
					const iconFrame = BlzCreateFrameByType('BACKDROP', `ColumnIcon_${rowKey}`, headerFrame, '', 0);
					BlzFrameSetSize(iconFrame, iconSize, iconSize);
					BlzFrameSetPoint(iconFrame, FRAMEPOINT_TOPLEFT, headerFrame, FRAMEPOINT_TOPLEFT, 0, yGap + iconVerticalOffset);

					// Get icon path - may be null if rating is disabled
					const iconPath = columnData.iconFunction(player);
					if (iconPath) {
						BlzFrameSetTexture(iconFrame, iconPath, 0, true);
						BlzFrameSetVisible(iconFrame, true);
					} else {
						// Hide icon when iconFunction returns null (e.g., rating disabled)
						BlzFrameSetVisible(iconFrame, false);
					}

					this.icons.set(rowKey, iconFrame);

					// Create text frame - position at x=0 when icon hidden, offset when icon shown
					const dataFrame = BlzCreateFrame('ColumnDataText', headerFrame, 0, 0);
					const textXOffset = iconPath ? iconSize + iconPadding : 0;
					BlzFrameSetPoint(dataFrame, FRAMEPOINT_TOPLEFT, headerFrame, FRAMEPOINT_TOPLEFT, textXOffset, yGap);

					const newText = columnData.textFunction(player);
					BlzFrameSetText(dataFrame, newText);

					this.rows.set(rowKey, dataFrame);
				} else {
					// No icon function, create text frame normally
					const dataFrame = BlzCreateFrame('ColumnDataText', headerFrame, 0, 0);
					BlzFrameSetPoint(dataFrame, FRAMEPOINT_TOPLEFT, headerFrame, FRAMEPOINT_TOPLEFT, 0, yGap);

					const newText = columnData.textFunction(player);
					BlzFrameSetText(dataFrame, newText);

					this.rows.set(rowKey, dataFrame);
				}

				rowIndex++;
				yGap -= rowHeight;
			});

			headerX += size;
		});
	}
}
