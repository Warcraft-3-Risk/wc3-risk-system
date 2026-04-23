import { NameManager } from '../managers/names/name-manager';
import { HexColors } from '../utils/hex-colors';
import { ScoreboardRenderer } from './scoreboard-renderer';
import { ScoreboardDataModel, PlayerRow } from './scoreboard-data-model';
import { RatingManager } from '../rating/rating-manager';

import { PlayerManager } from '../player/player-manager';
import { SettingsContext } from '../settings/settings-context';
import { isReplay } from '../utils/game-status';
import { MatchFormat } from '../game/match-format-enum';

export class PlayerRenderer extends ScoreboardRenderer {
	private readonly PLAYER_COL = 1;
	private readonly INCOME_COL = 2;
	private readonly CITIES_COL = 3;
	private readonly KILLS_COL = 4;
	private readonly DEATHS_COL = 5;
	private readonly STATUS_COL = 6;

	public constructor(playerCount: number) {
		super(6);
		this.size = playerCount + 3;

		MultiboardSetColumnCount(this.board, 6);

		for (let i = 1; i <= this.size; i++) {
			MultiboardSetRowCount(this.board, MultiboardGetRowCount(this.board) + 1);
			this.setItemWidth(8.0, i, this.PLAYER_COL);
			this.setItemWidth(2.5, i, this.INCOME_COL);
			this.setItemWidth(2.5, i, this.CITIES_COL);
			this.setItemWidth(4.0, i, this.KILLS_COL);
			this.setItemWidth(4.0, i, this.DEATHS_COL);
			this.setItemWidth(4.5, i, this.STATUS_COL);
		}

		this.setItemValue(`${HexColors.TANGERINE}Player|r`, 1, this.PLAYER_COL);
		this.setItemValue(`${HexColors.TANGERINE}Inc|r`, 1, this.INCOME_COL);
		this.setItemValue(`${HexColors.TANGERINE}C|r`, 1, this.CITIES_COL);
		this.setItemValue(`${HexColors.TANGERINE}K|r`, 1, this.KILLS_COL);
		this.setItemValue(`${HexColors.TANGERINE}D|r`, 1, this.DEATHS_COL);
		this.setItemValue(`${HexColors.TANGERINE}Status|r`, 1, this.STATUS_COL);

		// Alert row — full width in first column, hide rest
		this.setItemWidth(20.0, this.size, this.PLAYER_COL);
		this.setItemWidth(0.0, this.size, this.INCOME_COL);
		this.setItemWidth(0.0, this.size, this.CITIES_COL);
		this.setItemWidth(0.0, this.size, this.KILLS_COL);
		this.setItemWidth(0.0, this.size, this.DEATHS_COL);
		this.setItemWidth(0.0, this.size, this.STATUS_COL);

		this.finalizeSetup();
		this.setVisibility(true);
	}

	public renderFull(data: ScoreboardDataModel): void {
		const effectiveLocal = data.effectiveLocal;
		let row = 2;

		data.players.forEach((p) => {
			const textColor = effectiveLocal === p.handle ? HexColors.TANGERINE : HexColors.WHITE;

			if (p.isEliminated) {
				this.renderEliminatedIncome(p, row, effectiveLocal);
			} else {
				this.setItemValue(`${textColor}${p.income}`, row, this.INCOME_COL);
			}

			this.renderPlayerData(p, row, textColor, effectiveLocal);
			row++;
		});
	}

	public renderPartial(data: ScoreboardDataModel): void {
		const effectiveLocal = data.effectiveLocal;
		let row = 2;

		data.players.forEach((p) => {
			const textColor = effectiveLocal === p.handle ? HexColors.TANGERINE : HexColors.WHITE;

			if (p.isEliminated) {
				this.renderEliminatedIncome(p, row, effectiveLocal);
			} else {
				this.setItemValue(`${textColor}${p.income}`, row, this.INCOME_COL);
			}

			this.renderPlayerData(p, row, textColor, effectiveLocal);
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

	private renderEliminatedIncome(p: PlayerRow, row: number, effectiveLocal: player): void {
		const ratingManager = RatingManager.getInstance();
		const localBtag = NameManager.getInstance().getBtag(effectiveLocal);
		const localShowRating = ratingManager.getShowRatingPreference(localBtag);

		if (p.ratingChange && ratingManager.isRankedGame() && ratingManager.isRatingSystemEnabled() && localShowRating) {
			const { effectiveChange, wasFloorProtected } = p.ratingChange;
			const color = effectiveChange > 0 || (effectiveChange === 0 && !wasFloorProtected) ? HexColors.GREEN : HexColors.RED;
			const sign = wasFloorProtected ? '-' : effectiveChange >= 0 ? '+' : '';
			this.setItemValue(`${color}${sign}${effectiveChange}|r`, row, this.INCOME_COL);
		} else {
			this.setItemValue(`${HexColors.LIGHT_GRAY}-`, row, this.INCOME_COL);
		}
	}

	private renderPlayerData(p: PlayerRow, row: number, textColor: string, effectiveLocal: player): void {
		let targetColorCode = p.originalColorCode;
		let allyColorMode = GetAllyColorFilterState();

		if (allyColorMode === 2 && SettingsContext.getInstance().getMatchFormat() !== MatchFormat.TEAMS) {
			allyColorMode = 0;
		}

		if (!isReplay() && allyColorMode === 2) {
			if (p.handle === effectiveLocal) {
				targetColorCode = HexColors.BLUE;
			} else if (IsPlayerAlly(p.handle, effectiveLocal)) {
				const localActivePlayer = PlayerManager.getInstance().players.get(effectiveLocal);
				const isDeadInFFA = localActivePlayer && localActivePlayer.status.isDead() && SettingsContext.getInstance().isFFA();
				const isColorBlind = localActivePlayer && localActivePlayer.options.colorblind;
				
				const allyColor = isColorBlind ? HexColors.YELLOW : HexColors.TEAL;

				targetColorCode = isDeadInFFA ? HexColors.RED : allyColor;
			} else if (IsPlayerEnemy(p.handle, effectiveLocal)) {
				targetColorCode = HexColors.RED;
			}
		}

		if (p.isEliminated) {
			const grey = HexColors.LIGHT_GRAY;
			const elimColor = effectiveLocal === p.handle ? textColor : grey;

			this.setItemValue(`${targetColorCode}${p.acctName}`, row, this.PLAYER_COL);
			this.setItemValue(`${elimColor}${p.cities}`, row, this.CITIES_COL);
			this.setItemValue(`${elimColor}${p.kills}`, row, this.KILLS_COL);
			this.setItemValue(`${elimColor}${p.deaths}`, row, this.DEATHS_COL);

			if (p.isSTFU) {
				this.setItemValue(`${grey}${p.status} ${p.statusDuration}`, row, this.STATUS_COL);
			} else {
				this.setItemValue(`${p.status}`, row, this.STATUS_COL);
			}
		} else {
			let displayName = p.displayName;
			if (targetColorCode !== p.originalColorCode && p.displayColorCode) {
				displayName = displayName.replace(p.displayColorCode, targetColorCode);
			}

			this.setItemValue(`${displayName}`, row, this.PLAYER_COL);

			const cityTextColor = p.cityCountHighlighted ? HexColors.RED : textColor;
			this.setItemValue(`${cityTextColor}${p.cities}`, row, this.CITIES_COL);

			this.setItemValue(`${textColor}${p.kills}`, row, this.KILLS_COL);
			this.setItemValue(`${textColor}${p.deaths}`, row, this.DEATHS_COL);

			if (p.isNomad) {
				this.setItemValue(`${HexColors.ORANGE}${p.statusDuration}`, row, this.STATUS_COL);
			} else {
				this.setItemValue(`${p.status}`, row, this.STATUS_COL);
			}
		}
	}
}
