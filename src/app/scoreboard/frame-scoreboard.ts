import { HexColors } from '../utils/hex-colors';
import { NameManager } from '../managers/names/name-manager';
import type { ScoreboardDataModel, PlayerRow } from './scoreboard-data-model';
import { getFrameScoreboardCameraPosition } from './frame-scoreboard-camera';
import { PLAYER_STATUS } from '../player/status/status-enum';

type FrameScoreboardColumnAlignment = 'left' | 'right';

interface FrameScoreboardColumn {
	header: string;
	width: number;
	gap: number;
	alignment: FrameScoreboardColumnAlignment;
}

/**
 * Custom frame-based scoreboard that replicates the multiboard layout using UI frames.
 * Renders player rows with columns: Player, Inc, G, C, K, D, Status.
 *
 * This is intended as an observer-focused alternative to the native multiboard,
 * but for testing purposes it is shown to all players (with the multiboard hidden).
 *
 * Design: A single BACKDROP parent with a title TEXT and dynamically created
 * TEXT frames for each cell. All frames are pre-created at init time (sync-safe)
 * and updated by setting text values.
 */
export class FrameScoreboard {
	private static readonly MAX_ROWS = 24;
	private static readonly CREATE_CONTEXT = 900;

	// Column indices
	private static readonly COL_PLAYER = 0;
	private static readonly COL_INCOME = 1;
	private static readonly COL_DELTA = 2;
	private static readonly COL_GOLD = 3;
	private static readonly COL_CITIES = 4;
	private static readonly COL_KILLS = 5;
	private static readonly COL_DEATHS = 6;
	private static readonly COL_STATUS = 7;

	// Layout constants (screen coordinates)
	private static readonly BACKDROP_WIDTH = 0.23;
	private static readonly ROW_HEIGHT = 0.0105;
	private static readonly HEADER_HEIGHT = 0.0115;
	private static readonly TITLE_HEIGHT = 0.018;
	private static readonly ALERT_HEIGHT = 0.014;
	private static readonly TOP_PADDING = 0.005;
	private static readonly SIDE_PADDING = 0.008;
	private static readonly TOP_RIGHT_X = 0.8;
	private static readonly TOP_EDGE_Y = 0.56;
	private static readonly STATUS_ICON_SIZE = 0.0105;
	private static readonly CELL_SCALE = 0.82;
	private static readonly HEADER_SCALE = 0.82;
	private static readonly TITLE_SCALE = 0.82;

	private static readonly STATUS_TEXTURE_ALIVE = 'ReplaceableTextures\\CommandButtons\\BTNStop.blp';
	private static readonly STATUS_TEXTURE_COMBAT = 'ReplaceableTextures\\CommandButtons\\BTNAttack.blp';
	private static readonly STATUS_TEXTURE_NOMAD = 'ReplaceableTextures\\CommandButtons\\BTNShade.blp';
	private static readonly STATUS_TEXTURE_DEAD = 'ReplaceableTextures\\CommandButtons\\BTNAnimateDead.blp';
	private static readonly STATUS_TEXTURE_LEFT = 'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNAnimateDead.blp';

	private static readonly COLUMNS: FrameScoreboardColumn[] = [
		{ header: `${HexColors.TANGERINE}Player|r`, width: 0.06, gap: 0, alignment: 'left' },
		{ header: `${HexColors.TANGERINE}Inc|r`, width: 0.025, gap: 0, alignment: 'right' },
		{ header: '', width: 0.018, gap: 0, alignment: 'left' },
		{ header: `${HexColors.TANGERINE}G|r`, width: 0.025, gap: 0, alignment: 'right' },
		{ header: `${HexColors.TANGERINE}C|r`, width: 0.028, gap: 0.005, alignment: 'right' },
		{ header: `${HexColors.TANGERINE}K|r`, width: 0.025, gap: 0.005, alignment: 'right' },
		{ header: `${HexColors.TANGERINE}D|r`, width: 0.025, gap: 0.005, alignment: 'right' },
		{ header: `${HexColors.TANGERINE}Status|r`, width: 0.03, gap: 0.01, alignment: 'left' },
	];

	private backdrop: framehandle;
	private container: framehandle;
	private titleText: framehandle;
	private headerCells: framehandle[] = [];
	private cells: framehandle[][] = []; // [row][col]
	private statusIcons: framehandle[] = [];
	private alertText: framehandle;
	private hoverButtons: framehandle[] = [];
	private rowPlayerHandles: (player | undefined)[] = [];
	private trackingTimer: timer;
	private playerCount: number = 0;
	private isShowing: boolean = false;

	public static isRuntimeAvailable(): boolean {
		return (
			typeof BlzGetOriginFrame === 'function' &&
			typeof BlzCreateFrame === 'function' &&
			typeof BlzCreateFrameByType === 'function' &&
			typeof BlzFrameSetTextAlignment === 'function' &&
			typeof BlzFrameSetTexture === 'function' &&
			typeof BlzFrameSetLevel === 'function' &&
			typeof CreateTimer === 'function' &&
			typeof TimerStart === 'function' &&
			typeof ORIGIN_FRAME_GAME_UI !== 'undefined' &&
			typeof FRAMEPOINT_TOPRIGHT !== 'undefined' &&
			typeof TEXT_JUSTIFY_LEFT !== 'undefined'
		);
	}

	public constructor(playerCount: number) {
		this.playerCount = playerCount;
		const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0);
		const ctx = FrameScoreboard.CREATE_CONTEXT;

		// Calculate backdrop height based on player count
		const contentHeight =
			FrameScoreboard.TITLE_HEIGHT +
			FrameScoreboard.TOP_PADDING +
			FrameScoreboard.HEADER_HEIGHT +
			this.playerCount * FrameScoreboard.ROW_HEIGHT +
			FrameScoreboard.ALERT_HEIGHT +
			FrameScoreboard.TOP_PADDING * 2;

		// Create backdrop using FDF template with proper 9-slice bordered background
		this.backdrop = BlzCreateFrame('BackdropTemplate', gameUI, 0, ctx);
		BlzFrameSetSize(this.backdrop, FrameScoreboard.BACKDROP_WIDTH, contentHeight);
		BlzFrameSetAbsPoint(this.backdrop, FRAMEPOINT_TOPRIGHT, FrameScoreboard.TOP_RIGHT_X, FrameScoreboard.TOP_EDGE_Y);
		BlzFrameSetAlpha(this.backdrop, 180);

		// Transparent container for text so backdrop alpha doesn't affect readability
		this.container = BlzCreateFrameByType('FRAME', 'FSContainer', gameUI, '', ctx + 2000);
		BlzFrameSetAllPoints(this.container, this.backdrop);

		// Title text
		this.titleText = BlzCreateFrameByType('TEXT', 'FrameScoreboardTitle', this.container, '', ctx);
		BlzFrameSetPoint(
			this.titleText,
			FRAMEPOINT_TOP,
			this.backdrop,
			FRAMEPOINT_TOP,
			0,
			-FrameScoreboard.TOP_PADDING
		);
		BlzFrameSetSize(
			this.titleText,
			FrameScoreboard.BACKDROP_WIDTH - FrameScoreboard.SIDE_PADDING * 2,
			FrameScoreboard.TITLE_HEIGHT
		);
		BlzFrameSetTextAlignment(this.titleText, TEXT_JUSTIFY_MIDDLE, TEXT_JUSTIFY_CENTER);
		BlzFrameSetScale(this.titleText, FrameScoreboard.TITLE_SCALE);
		BlzFrameSetText(this.titleText, `${HexColors.TANGERINE}Scoreboard|r`);

		// Header row
		const headerY = -(FrameScoreboard.TOP_PADDING + FrameScoreboard.TITLE_HEIGHT);
		let xOffset = FrameScoreboard.SIDE_PADDING;
		for (let col = 0; col < FrameScoreboard.COLUMNS.length; col++) {
			const column = FrameScoreboard.COLUMNS[col];
			xOffset += column.gap;
			const cell = BlzCreateFrameByType('TEXT', `FSHeader${col}`, this.container, '', ctx + col);
			BlzFrameSetPoint(cell, FRAMEPOINT_TOPLEFT, this.backdrop, FRAMEPOINT_TOPLEFT, xOffset, headerY);
			BlzFrameSetSize(cell, column.width, FrameScoreboard.HEADER_HEIGHT);
			BlzFrameSetText(cell, column.header);
			BlzFrameSetTextAlignment(cell, TEXT_JUSTIFY_MIDDLE, this.getColumnAlignment(column));
			BlzFrameSetScale(cell, FrameScoreboard.HEADER_SCALE);
			this.headerCells.push(cell);
			xOffset += column.width;
		}

		// Data rows
		const dataStartY = headerY - FrameScoreboard.HEADER_HEIGHT;
		for (let row = 0; row < FrameScoreboard.MAX_ROWS; row++) {
			this.cells[row] = [];
			const rowY = dataStartY - row * FrameScoreboard.ROW_HEIGHT;
			let cellX = FrameScoreboard.SIDE_PADDING;

			for (let col = 0; col < FrameScoreboard.COLUMNS.length; col++) {
				const column = FrameScoreboard.COLUMNS[col];
				cellX += column.gap;
				const cellCtx = ctx + 100 + row * FrameScoreboard.COLUMNS.length + col;
				const cell = BlzCreateFrameByType('TEXT', `FSCell${row}_${col}`, this.container, '', cellCtx);
				BlzFrameSetPoint(cell, FRAMEPOINT_TOPLEFT, this.backdrop, FRAMEPOINT_TOPLEFT, cellX, rowY);
				BlzFrameSetSize(cell, column.width, FrameScoreboard.ROW_HEIGHT);
				BlzFrameSetText(cell, '');
				BlzFrameSetTextAlignment(cell, TEXT_JUSTIFY_MIDDLE, this.getColumnAlignment(column));
				BlzFrameSetScale(cell, FrameScoreboard.CELL_SCALE);
				this.cells[row].push(cell);
				cellX += column.width;
			}

			this.statusIcons[row] = this.createStatusIcon(row, ctx);

			// Hide rows beyond playerCount
			if (row >= this.playerCount) {
				for (let col = 0; col < FrameScoreboard.COLUMNS.length; col++) {
					BlzFrameSetVisible(this.cells[row][col], false);
				}
				BlzFrameSetVisible(this.statusIcons[row], false);
			}
		}

		// Alert row at bottom
		this.alertText = BlzCreateFrameByType('TEXT', 'FSAlert', this.container, '', ctx + 1000);
		const alertY = dataStartY - this.playerCount * FrameScoreboard.ROW_HEIGHT;
		BlzFrameSetPoint(this.alertText, FRAMEPOINT_TOPLEFT, this.backdrop, FRAMEPOINT_TOPLEFT, FrameScoreboard.SIDE_PADDING, alertY);
		BlzFrameSetSize(
			this.alertText,
			FrameScoreboard.BACKDROP_WIDTH - FrameScoreboard.SIDE_PADDING * 2,
			FrameScoreboard.ALERT_HEIGHT
		);
		BlzFrameSetTextAlignment(this.alertText, TEXT_JUSTIFY_MIDDLE, TEXT_JUSTIFY_LEFT);
		BlzFrameSetText(this.alertText, '');

		// Hover buttons overlaying player name cells for camera tracking.
		// Uses GLUETEXTBUTTON + ScriptDialogButton so hover detection works for
		// both playing players and observers (child[5] highlight visibility polling).
		for (let row = 0; row < FrameScoreboard.MAX_ROWS; row++) {
			this.rowPlayerHandles[row] = undefined;
			const btnCtx = ctx + 500 + row;
			const btn = BlzCreateFrameByType('GLUETEXTBUTTON', `FSHoverBtn${row}`, this.container, 'ScriptDialogButton', btnCtx);
			const rowY = dataStartY - row * FrameScoreboard.ROW_HEIGHT;
			BlzFrameSetPoint(btn, FRAMEPOINT_TOPLEFT, this.backdrop, FRAMEPOINT_TOPLEFT, FrameScoreboard.SIDE_PADDING, rowY);
			BlzFrameSetSize(btn, FrameScoreboard.COLUMNS[FrameScoreboard.COL_PLAYER].width, FrameScoreboard.ROW_HEIGHT);
			BlzFrameSetText(btn, '');
			BlzFrameSetAlpha(btn, 0);
			BlzFrameSetVisible(btn, row < this.playerCount);
			this.hoverButtons.push(btn);
		}

		// Camera tracking timer — polls hover state via child[5] visibility
		// (works for both players and observers) and pans to that player's camera.
		this.trackingTimer = CreateTimer();
		TimerStart(this.trackingTimer, 0.25, true, () => {
			for (let i = 0; i < this.playerCount; i++) {
				if (BlzFrameIsVisible(BlzFrameGetChild(this.hoverButtons[i], 5))) {
					const target = this.rowPlayerHandles[i];
					if (target) {
						const pos = getFrameScoreboardCameraPosition(target);
						if (pos) {
							PanCameraToTimed(pos.x, pos.y, 0.25);
						}
					}
					return;
				}
			}
		});

		// Start hidden
		this.setVisibility(false);
	}

	public setTitle(str: string): void {
		BlzFrameSetText(this.titleText, str);
	}

	public setVisibility(visible: boolean): void {
		BlzFrameSetVisible(this.backdrop, visible);
		BlzFrameSetVisible(this.container, visible);
		this.isShowing = visible;
	}

	public isVisible(): boolean {
		return this.isShowing;
	}

	public renderFull(data: ScoreboardDataModel): void {
		let row = 0;
		for (const p of data.players) {
			if (row >= this.playerCount) break;
			this.rowPlayerHandles[row] = p.handle;
			this.renderPlayerRow(p, row);
			row++;
		}
		// Clear any unused rows
		for (let r = row; r < this.playerCount; r++) {
			this.rowPlayerHandles[r] = undefined;
			this.clearRow(r);
		}
	}

	public renderPartial(data: ScoreboardDataModel): void {
		this.renderFull(data);
	}

	public renderAlert(player: player, countryName: string): void {
		BlzFrameSetText(
			this.alertText,
			`${NameManager.getInstance().getDisplayName(player)} claimed ${HexColors.TANGERINE}${countryName}|r`
		);
	}

	public destroy(): void {
		this.setVisibility(false);
	}

	private renderPlayerRow(p: PlayerRow, row: number): void {
		if (p.isEliminated) {
			this.renderEliminatedRow(p, row);
		} else {
			this.renderActiveRow(p, row);
		}
	}

	private renderActiveRow(p: PlayerRow, row: number): void {
		const teamPrefix = this.getTeamPrefix(p);
		const textColor = HexColors.WHITE;

		// Player name (colored)
		this.setCellText(row, FrameScoreboard.COL_PLAYER, `${teamPrefix}${p.displayName}`);

		// Income: base right-aligned, delta left-aligned in separate column
		const delta = p.incomeDelta;
		const baseIncome = p.income - delta;
		this.setCellText(row, FrameScoreboard.COL_INCOME, `${textColor}${baseIncome}`);
		this.setCellText(row, FrameScoreboard.COL_DELTA, `${textColor}(${this.formatIncomeDelta(delta)}${textColor})`);

		// Gold
		const goldColor = p.gold === 0 ? HexColors.RED : textColor;
		this.setCellText(row, FrameScoreboard.COL_GOLD, `${goldColor}${p.gold}`);

		// Cities
		const cityColor = p.cityCountHighlighted ? HexColors.RED : textColor;
		this.setCellText(row, FrameScoreboard.COL_CITIES, `${cityColor}${p.cities}`);

		// Kills & Deaths — combat highlight
		const combatColor = p.isInCombat ? HexColors.LIGHT_BLUE : textColor;
		this.setCellText(row, FrameScoreboard.COL_KILLS, `${combatColor}${p.kills}`);
		this.setCellText(row, FrameScoreboard.COL_DEATHS, `${combatColor}${p.deaths}`);

		// Status
		this.setStatusIcon(row, this.getActiveStatusTexture(p));
	}

	private renderEliminatedRow(p: PlayerRow, row: number): void {
		const grey = HexColors.LIGHT_GRAY;
		const teamPrefix = this.getTeamPrefix(p);

		// Player name
		this.setCellText(row, FrameScoreboard.COL_PLAYER, `${grey}${teamPrefix}${p.displayName}`);

		// Income — show rating change if ranked, else dash
		this.setCellText(row, FrameScoreboard.COL_INCOME, this.formatEliminatedIncome(p));
		this.setCellText(row, FrameScoreboard.COL_DELTA, '');

		// Gold
		this.setCellText(row, FrameScoreboard.COL_GOLD, `${grey}-`);

		// Cities
		this.setCellText(row, FrameScoreboard.COL_CITIES, `${grey}${p.cities}`);

		// Kills & Deaths
		this.setCellText(row, FrameScoreboard.COL_KILLS, `${grey}${p.kills}`);
		this.setCellText(row, FrameScoreboard.COL_DEATHS, `${grey}${p.deaths}`);

		// Status
		this.setStatusIcon(row, this.getEliminatedStatusTexture(p));
	}

	private formatEliminatedIncome(p: PlayerRow): string {
		if (p.ratingChange) {
			const { effectiveChange, wasFloorProtected } = p.ratingChange;
			const color = effectiveChange > 0 || (effectiveChange === 0 && !wasFloorProtected)
				? HexColors.GREEN
				: HexColors.RED;
			const sign = wasFloorProtected ? '-' : effectiveChange >= 0 ? '+' : '';
			return `${color}${sign}${effectiveChange}|r`;
		}
		return `${HexColors.LIGHT_GRAY}-`;
	}

	private formatIncomeDelta(delta: number): string {
		if (delta === 0) return `${HexColors.LIGHT_GRAY}${delta}|r`;
		if (delta >= 1) return `${HexColors.GREEN}${delta}|r`;
		return `${HexColors.RED}${delta}|r`;
	}

	private getTeamPrefix(row: PlayerRow): string {
		if (row.teamNumber > 0) {
			return `${HexColors.TANGERINE}[${row.teamNumber}]|r`;
		}
		return '';
	}

	private getColumnAlignment(column: FrameScoreboardColumn): textaligntype {
		if (column.alignment === 'left') {
			return TEXT_JUSTIFY_LEFT;
		}

		return TEXT_JUSTIFY_RIGHT;
	}

	private getActiveStatusTexture(row: PlayerRow): string {
		if (row.isNomad) {
			return FrameScoreboard.STATUS_TEXTURE_NOMAD;
		}

		if (row.isInCombat) {
			return FrameScoreboard.STATUS_TEXTURE_COMBAT;
		}

		return FrameScoreboard.STATUS_TEXTURE_ALIVE;
	}

	private getEliminatedStatusTexture(row: PlayerRow): string {
		if (row.status === PLAYER_STATUS.LEFT) {
			return FrameScoreboard.STATUS_TEXTURE_LEFT;
		}

		return FrameScoreboard.STATUS_TEXTURE_DEAD;
	}

	private setStatusIcon(row: number, texture: string): void {
		this.setCellText(row, FrameScoreboard.COL_STATUS, '');
		BlzFrameSetTexture(this.statusIcons[row], texture, 0, true);
		BlzFrameSetVisible(this.statusIcons[row], true);
	}

	private createStatusIcon(row: number, ctx: number): framehandle {
		const statusCell = this.cells[row][FrameScoreboard.COL_STATUS];
		const statusColumn = FrameScoreboard.COLUMNS[FrameScoreboard.COL_STATUS];
		const iconOffsetX = (statusColumn.width - FrameScoreboard.STATUS_ICON_SIZE) / 2;
		const statusIcon = BlzCreateFrameByType('BACKDROP', `FSStatusIcon${row}`, statusCell, '', ctx + 1500 + row);

		BlzFrameSetSize(statusIcon, FrameScoreboard.STATUS_ICON_SIZE, FrameScoreboard.STATUS_ICON_SIZE);
		BlzFrameSetPoint(statusIcon, FRAMEPOINT_TOPLEFT, statusCell, FRAMEPOINT_TOPLEFT, iconOffsetX, 0);
		BlzFrameSetLevel(statusIcon, 10);
		BlzFrameSetVisible(statusIcon, row < this.playerCount);

		return statusIcon;
	}

	private setCellText(row: number, col: number, text: string): void {
		BlzFrameSetText(this.cells[row][col], text);
	}

	private clearRow(row: number): void {
		for (let col = 0; col < FrameScoreboard.COLUMNS.length; col++) {
			BlzFrameSetText(this.cells[row][col], '');
		}
		BlzFrameSetVisible(this.statusIcons[row], false);
	}

}
