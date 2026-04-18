import { HexColors } from '../utils/hex-colors';
import { NameManager } from '../managers/names/name-manager';
import { ScoreboardDataModel, PlayerRow } from './scoreboard-data-model';
import { SettingsContext } from '../settings/settings-context';
import { TeamManager } from '../teams/team-manager';
import { RatingManager } from '../rating/rating-manager';
import PlayerCameraPositionManager from '../managers/player-camera-position-manager';

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
	private static readonly COL_COUNT = 8;
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
	private static readonly CELL_SCALE = 0.82;
	private static readonly HEADER_SCALE = 0.85;
	private static readonly TITLE_SCALE = 0.95;

	// Column widths
	private static readonly COL_WIDTHS = [0.06, 0.025, 0.018, 0.025, 0.028, 0.025, 0.025, 0.03];

	// Gap before each column (extra spacing between columns)
	private static readonly COL_GAPS = [0, 0, 0, 0, 0.005, 0.005, 0.005, 0.01];

	// Per-column horizontal alignment: right for numbers, left for text
	private static readonly COL_ALIGN = [
		TEXT_JUSTIFY_LEFT,   // Player
		TEXT_JUSTIFY_RIGHT,  // Income (base)
		TEXT_JUSTIFY_LEFT,   // Delta
		TEXT_JUSTIFY_RIGHT,  // Gold
		TEXT_JUSTIFY_RIGHT,  // Cities
		TEXT_JUSTIFY_RIGHT,  // Kills
		TEXT_JUSTIFY_RIGHT,  // Deaths
		TEXT_JUSTIFY_LEFT,   // Status
	];

	private backdrop: framehandle;
	private titleText: framehandle;
	private headerCells: framehandle[] = [];
	private cells: framehandle[][] = []; // [row][col]
	private alertText: framehandle;
	private hoverButtons: framehandle[] = [];
	private rowPlayerHandles: (player | null)[] = [];
	private trackingTimer: timer;
	private playerCount: number = 0;
	private isShowing: boolean = false;

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
		BlzFrameSetAbsPoint(this.backdrop, FRAMEPOINT_TOPRIGHT, 0.8, 0.56);

		// Title text
		this.titleText = BlzCreateFrameByType('TEXT', 'FrameScoreboardTitle', this.backdrop, '', ctx);
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
		const headerLabels = [
			`${HexColors.TANGERINE}Player|r`,
			`${HexColors.TANGERINE}Inc|r`,
			``,
			`${HexColors.TANGERINE}G|r`,
			`${HexColors.TANGERINE}C|r`,
			`${HexColors.TANGERINE}K|r`,
			`${HexColors.TANGERINE}D|r`,
			`${HexColors.TANGERINE}Status|r`,
		];

		let xOffset = FrameScoreboard.SIDE_PADDING;
		// Per-column header nudge to align with scaled data cells
		const headerNudges = [0, -0.004, -0.004, -0.005, -0.007, -0.007, -0.0075, -0.008];
		for (let col = 0; col < FrameScoreboard.COL_COUNT; col++) {
			xOffset += FrameScoreboard.COL_GAPS[col];
			const cell = BlzCreateFrameByType('TEXT', `FSHeader${col}`, this.backdrop, '', ctx + col);
			BlzFrameSetPoint(cell, FRAMEPOINT_TOPLEFT, this.backdrop, FRAMEPOINT_TOPLEFT, xOffset + headerNudges[col], headerY);
			BlzFrameSetSize(cell, FrameScoreboard.COL_WIDTHS[col], FrameScoreboard.HEADER_HEIGHT);
			BlzFrameSetText(cell, headerLabels[col]);
			BlzFrameSetTextAlignment(cell, TEXT_JUSTIFY_MIDDLE, FrameScoreboard.COL_ALIGN[col]);
			BlzFrameSetScale(cell, FrameScoreboard.HEADER_SCALE);
			this.headerCells.push(cell);
			xOffset += FrameScoreboard.COL_WIDTHS[col];
		}

		// Data rows
		const dataStartY = headerY - FrameScoreboard.HEADER_HEIGHT;
		for (let row = 0; row < FrameScoreboard.MAX_ROWS; row++) {
			this.cells[row] = [];
			const rowY = dataStartY - row * FrameScoreboard.ROW_HEIGHT;
			let cellX = FrameScoreboard.SIDE_PADDING;

			for (let col = 0; col < FrameScoreboard.COL_COUNT; col++) {
				cellX += FrameScoreboard.COL_GAPS[col];
				const cellCtx = ctx + 100 + row * FrameScoreboard.COL_COUNT + col;
				const cell = BlzCreateFrameByType('TEXT', `FSCell${row}_${col}`, this.backdrop, '', cellCtx);
				BlzFrameSetPoint(cell, FRAMEPOINT_TOPLEFT, this.backdrop, FRAMEPOINT_TOPLEFT, cellX, rowY);
				BlzFrameSetSize(cell, FrameScoreboard.COL_WIDTHS[col], FrameScoreboard.ROW_HEIGHT);
				BlzFrameSetText(cell, '');
				BlzFrameSetTextAlignment(cell, TEXT_JUSTIFY_MIDDLE, FrameScoreboard.COL_ALIGN[col]);
				BlzFrameSetScale(cell, FrameScoreboard.CELL_SCALE);
				this.cells[row].push(cell);
				cellX += FrameScoreboard.COL_WIDTHS[col];
			}

			// Hide rows beyond playerCount
			if (row >= this.playerCount) {
				for (let col = 0; col < FrameScoreboard.COL_COUNT; col++) {
					BlzFrameSetVisible(this.cells[row][col], false);
				}
			}
		}

		// Alert row at bottom
		this.alertText = BlzCreateFrameByType('TEXT', 'FSAlert', this.backdrop, '', ctx + 1000);
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
			this.rowPlayerHandles[row] = null;
			const btnCtx = ctx + 500 + row;
			const btn = BlzCreateFrameByType('GLUETEXTBUTTON', `FSHoverBtn${row}`, this.backdrop, 'ScriptDialogButton', btnCtx);
			const rowY = dataStartY - row * FrameScoreboard.ROW_HEIGHT;
			BlzFrameSetPoint(btn, FRAMEPOINT_TOPLEFT, this.backdrop, FRAMEPOINT_TOPLEFT, FrameScoreboard.SIDE_PADDING, rowY);
			BlzFrameSetSize(btn, FrameScoreboard.COL_WIDTHS[FrameScoreboard.COL_PLAYER], FrameScoreboard.ROW_HEIGHT);
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
						const pos = PlayerCameraPositionManager.getInstance().getCameraPosition(target);
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
			this.rowPlayerHandles[r] = null;
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
		const teamPrefix = this.getTeamPrefix(p.handle);
		const textColor = HexColors.WHITE;

		// Player name (colored)
		this.setCellText(row, FrameScoreboard.COL_PLAYER, `${teamPrefix}${p.displayName}`);

		// Income: base right-aligned, delta left-aligned in separate column
		const delta = p.player.trackedData.income.delta;
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
		if (p.isNomad) {
			this.setCellText(row, FrameScoreboard.COL_STATUS, `${HexColors.ORANGE}${p.statusDuration}`);
		} else {
			this.setCellText(row, FrameScoreboard.COL_STATUS, `${p.status}`);
		}
	}

	private renderEliminatedRow(p: PlayerRow, row: number): void {
		const grey = HexColors.LIGHT_GRAY;
		const teamPrefix = this.getTeamPrefix(p.handle);

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
		if (p.isSTFU) {
			this.setCellText(row, FrameScoreboard.COL_STATUS, `${grey}${p.status} ${p.statusDuration}`);
		} else {
			this.setCellText(row, FrameScoreboard.COL_STATUS, `${p.status}`);
		}
	}

	private formatEliminatedIncome(p: PlayerRow): string {
		const ratingManager = RatingManager.getInstance();
		if (p.ratingChange && ratingManager.isRankedGame() && ratingManager.isRatingSystemEnabled()) {
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

	private getTeamPrefix(handle: player): string {
		if (!SettingsContext.getInstance().isFFA()) {
			return `${HexColors.TANGERINE}[${TeamManager.getInstance().getTeamNumberFromPlayer(handle)}]|r`;
		}
		return '';
	}

	private setCellText(row: number, col: number, text: string): void {
		BlzFrameSetText(this.cells[row][col], text);
	}

	private clearRow(row: number): void {
		for (let col = 0; col < FrameScoreboard.COL_COUNT; col++) {
			BlzFrameSetText(this.cells[row][col], '');
		}
	}

}
