import { NameManager } from '../managers/names/name-manager';
import { HexColors } from '../utils/hex-colors';
import { ScoreboardRenderer } from './scoreboard-renderer';
import { ScoreboardDataModel, PlayerRow } from './scoreboard-data-model';
import { SettingsContext } from '../settings/settings-context';
import { TeamManager } from '../teams/team-manager';
import { RatingManager } from '../rating/rating-manager';

export class ObserverRenderer extends ScoreboardRenderer {
	private readonly PLAYER_COL = 1;
	private readonly INCOME_COL = 2;
	private readonly GOLD_COL = 3;
	private readonly CITIES_COL = 4;
	private readonly KILLS_COL = 5;
	private readonly DEATHS_COL = 6;
	private readonly STATUS_COL = 7;

	public constructor(playerCount: number) {
		super(7);
		this.size = playerCount + 3;

		MultiboardSetColumnCount(this.board, 7);

		for (let i = 1; i <= this.size; i++) {
			MultiboardSetRowCount(this.board, MultiboardGetRowCount(this.board) + 1);
			this.setItemWidth(8.3, i, this.PLAYER_COL);
			this.setItemWidth(3.9, i, this.INCOME_COL);
			this.setItemWidth(3.3, i, this.GOLD_COL);
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

		// Alert row — full width in first column, hide rest
		this.setItemWidth(20.0, this.size, this.PLAYER_COL);
		this.setItemWidth(0.0, this.size, this.INCOME_COL);
		this.setItemWidth(0.0, this.size, this.GOLD_COL);
		this.setItemWidth(0.0, this.size, this.CITIES_COL);
		this.setItemWidth(0.0, this.size, this.KILLS_COL);
		this.setItemWidth(0.0, this.size, this.DEATHS_COL);
		this.setItemWidth(0.0, this.size, this.STATUS_COL);

		this.finalizeSetup();
		this.setVisibility(false);
	}

	public renderFull(data: ScoreboardDataModel): void {
		let row = 2;

		data.players.forEach((p) => {
			// Reset income delta on full update
			p.player.trackedData.income.delta = 0;

			const textColor = HexColors.WHITE;

			if (p.isEliminated) {
				this.renderEliminatedIncome(p, row);
			}

			this.renderColumns(p, row, textColor);
			row++;
		});
	}

	public renderPartial(data: ScoreboardDataModel): void {
		let row = 2;

		data.players.forEach((p) => {
			const textColor = HexColors.WHITE;
			this.renderColumns(p, row, textColor);
			row++;
		});
	}

	public renderAlert(player: player, countryName: string): void {
		this.setItemValue(`${NameManager.getInstance().getDisplayName(player)} claimed ${HexColors.TANGERINE}${countryName}|r`, this.size, 1);
	}

	// Hides instead of destroying — see ScoreboardRenderer.destroy()
	public destroy(): void {
		this.setVisibility(false);
	}

	private renderColumns(p: PlayerRow, row: number, textColor: string): void {
		if (p.isEliminated) {
			this.renderEliminatedColumns(p, row);
		} else {
			this.renderActiveColumns(p, row, textColor);
		}
	}

	private renderEliminatedIncome(p: PlayerRow, row: number): void {
		const ratingManager = RatingManager.getInstance();

		if (p.ratingChange && ratingManager.isRankedGame() && ratingManager.isRatingSystemEnabled()) {
			const { effectiveChange, wasFloorProtected } = p.ratingChange;
			const color = effectiveChange > 0 || (effectiveChange === 0 && !wasFloorProtected) ? HexColors.GREEN : HexColors.RED;
			const sign = wasFloorProtected ? '-' : effectiveChange >= 0 ? '+' : '';
			this.setItemValue(`${color}${sign}${effectiveChange}|r`, row, this.INCOME_COL);
		} else {
			this.setItemValue(`${HexColors.LIGHT_GRAY}-`, row, this.INCOME_COL);
		}
	}

	private renderEliminatedColumns(p: PlayerRow, row: number): void {
		const grey = HexColors.LIGHT_GRAY;
		const teamPrefix = this.getTeamPrefix(p.handle);

		this.setItemValue(`${grey}${teamPrefix}${p.displayName}`, row, this.PLAYER_COL);
		this.setItemValue(`${grey}-`, row, this.GOLD_COL);
		this.setItemValue(`${grey}${p.cities}`, row, this.CITIES_COL);
		this.setItemValue(`${grey}${p.kills}`, row, this.KILLS_COL);
		this.setItemValue(`${grey}${p.deaths}`, row, this.DEATHS_COL);

		if (p.isSTFU) {
			this.setItemValue(`${grey}${p.status} ${p.statusDuration}`, row, this.STATUS_COL);
		} else {
			this.setItemValue(`${p.status}`, row, this.STATUS_COL);
		}
	}

	private renderActiveColumns(p: PlayerRow, row: number, textColor: string): void {
		const teamPrefix = this.getTeamPrefix(p.handle);

		// Name
		this.setItemValue(`${teamPrefix}${p.displayName}`, row, this.PLAYER_COL);

		// Income with delta
		this.setItemValue(
			`${textColor}${p.income - p.player.trackedData.income.delta}(${this.getIncomeDelta(p.player.trackedData.income.delta)})`,
			row,
			this.INCOME_COL
		);

		// Gold
		const playerGoldTextColor = p.gold === 0 ? HexColors.RED : textColor;
		this.setItemValue(`${playerGoldTextColor}${p.gold}`, row, this.GOLD_COL);

		// Cities
		const cityTextColor = p.cityCountHighlighted ? HexColors.RED : textColor;
		this.setItemValue(`${cityTextColor}${p.cities}`, row, this.CITIES_COL);

		// Kills & Deaths — combat highlight
		const combatColor = p.isInCombat ? HexColors.LIGHT_BLUE : textColor;
		this.setItemValue(`${combatColor}${p.kills}`, row, this.KILLS_COL);
		this.setItemValue(`${combatColor}${p.deaths}`, row, this.DEATHS_COL);

		// Status
		if (p.isNomad) {
			this.setItemValue(`${HexColors.ORANGE}${p.statusDuration}`, row, this.STATUS_COL);
		} else {
			this.setItemValue(`${p.status}`, row, this.STATUS_COL);
		}
	}

	private getIncomeDelta(delta: number): string {
		if (delta === 0) return `${HexColors.LIGHT_GRAY}${delta}|r`;
		if (delta >= 1) return `${HexColors.GREEN}${delta}|r`;
		if (delta < 0) return `${HexColors.RED}${delta}|r`;
	}

	private getTeamPrefix(handle: player): string {
		if (!SettingsContext.getInstance().isFFA()) {
			return `${HexColors.TANGERINE}[${TeamManager.getInstance().getTeamNumberFromPlayer(handle)}]|r`;
		}
		return '';
	}
}
