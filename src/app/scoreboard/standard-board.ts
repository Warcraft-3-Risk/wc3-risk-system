import { NameManager } from '../managers/names/name-manager';
import { TrackedData } from '../player/data/tracked-data';
import { ActivePlayer } from '../player/types/active-player';
import { HexColors } from '../utils/hex-colors';
import { ShuffleArray } from '../utils/utils';
import { Scoreboard } from './scoreboard';
import { VictoryManager } from '../managers/victory-manager';
import { RatingManager } from '../rating/rating-manager';

export class StandardBoard extends Scoreboard {
	private players: ActivePlayer[];
	private readonly PLAYER_COL: number = 1;
	private readonly INCOME_COL: number = 2;
	private readonly CITIES_COL: number = 3;
	private readonly KILLS_COL: number = 4;
	private readonly DEATHS_COL: number = 5;
	private readonly STATUS_COL: number = 6;

	public constructor(players: ActivePlayer[]) {
		super();

		this.players = players;
		this.size = this.players.length + 3;

		ShuffleArray(this.players);
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
		this.setItemWidth(20.0, this.size, this.PLAYER_COL);
		this.setItemWidth(0.0, this.size, this.INCOME_COL);
		this.setItemWidth(0.0, this.size, this.CITIES_COL);
		this.setItemWidth(0.0, this.size, this.KILLS_COL);
		this.setItemWidth(0.0, this.size, this.DEATHS_COL);
		this.setItemWidth(0.0, this.size, this.STATUS_COL);

		this.updateFull();

		MultiboardSetItemsStyle(this.board, true, false);
		MultiboardMinimize(this.board, true);
		MultiboardMinimize(this.board, false);
		this.setVisibility(true);
	}

	/**
	 * Updates every column on the scoreboard.
	 */
	public updateFull(): void {
		this.players.sort((pA, pB) => {
			const playerAIncome: number = pA.trackedData.income.income;
			const playerBIncome: number = pB.trackedData.income.income;

			if (playerAIncome < playerBIncome) return 1;
			if (playerAIncome > playerBIncome) return -1;

			// Secondary sort by player ID for deterministic ordering across all clients
			return GetPlayerId(pA.getPlayer()) - GetPlayerId(pB.getPlayer());
		});

		let row: number = 2;

		this.players.forEach((player) => {
			const data: TrackedData = player.trackedData;

			let textColor: string = GetLocalPlayer() == player.getPlayer() ? HexColors.TANGERINE : HexColors.WHITE;

			// Income is now handled in updatePlayerData() to coordinate with column width changes
			this.updatePlayerData(player, row, textColor, data);
			row++;
		});
	}

	/**
	 * Updates all columns on the scoreboard (without re-sorting).
	 */
	public updatePartial(): void {
		let row: number = 2;

		this.players.forEach((player) => {
			let textColor: string = GetLocalPlayer() == player.getPlayer() ? HexColors.TANGERINE : HexColors.WHITE;

			this.updatePlayerData(player, row, textColor, player.trackedData);

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

	/**
	 * Sets the columns of the scoreboard for a specific player's row.
	 * @param {ActivePlayer} player - The player object.
	 * @param {number} row - The row index.
	 * @param {string} textColor - The text color code.
	 * @param {TrackedData} data - The tracked data for the player.
	 */
	private updatePlayerData(player: ActivePlayer, row: number, textColor: string, data: TrackedData) {
		const grey = HexColors.LIGHT_GRAY;

		// --- Eliminated Player Formatting ---
		if (player.status.isEliminated()) {
			// Show rating change after player name if available (ranked game + local player has rating display enabled)
			const ratingManager = RatingManager.getInstance();
			const btag = NameManager.getInstance().getBtag(player.getPlayer());
			const ratingResult = ratingManager.getRatingResults().get(btag);
			const playerName = NameManager.getInstance().getDisplayName(player.getPlayer());

			// Check if the LOCAL (viewing) player has rating display enabled
			const localBtag = NameManager.getInstance().getBtag(GetLocalPlayer());
			const localShowRating = ratingManager.getShowRatingPreference(localBtag);

			// Player name (no truncation needed since rating goes in income column)
			this.setItemValue(`${grey}${playerName}`, row, this.PLAYER_COL);

			// Show rating change in income column for eliminated players
			if (ratingResult && ratingManager.isRankedGame() && ratingManager.isRatingSystemEnabled() && localShowRating) {
				const effectiveChange = ratingResult.newRating - ratingResult.oldRating;
				const color = effectiveChange >= 0 ? HexColors.GREEN : HexColors.RED;
				const sign = effectiveChange >= 0 ? '+' : '';
				this.setItemValue(`${color}${sign}${effectiveChange}|r`, row, this.INCOME_COL);
			} else {
				this.setItemValue(`${grey}-`, row, this.INCOME_COL);
			}

			// Cities
			this.setItemValue(`${grey}${data.cities.cities.length}`, row, this.CITIES_COL);

			// Kills & Deaths
			const kd = data.killsDeaths.get(player.getPlayer());
			this.setItemValue(`${grey}${kd.killValue}`, row, this.KILLS_COL);
			this.setItemValue(`${grey}${kd.deathValue}`, row, this.DEATHS_COL);

			// Status
			if (player.status.isSTFU()) {
				this.setItemValue(`${grey}${player.status.status} ${player.status.statusDuration}`, row, this.STATUS_COL);
			} else {
				this.setItemValue(`${player.status.status}`, row, this.STATUS_COL);
			}
			// --- Alive / Active Player Formatting ---
		} else {
			// Name
			this.setItemValue(`${NameManager.getInstance().getDisplayName(player.getPlayer())}`, row, this.PLAYER_COL);

			// Income
			this.setItemValue(`${textColor}${data.income.income}`, row, this.INCOME_COL);

			// Cities
			const requiredCities = VictoryManager.getCityCountWin();
			const cities = data.cities.cities.length;
			const isCityCountHighlighted = cities >= requiredCities;
			const cityTextColor = isCityCountHighlighted ? HexColors.RED : textColor;
			this.setItemValue(`${cityTextColor}${cities}`, row, this.CITIES_COL);

			// Kills / Deaths (no combat highlight logic here, but you could add it if needed)
			this.setItemValue(`${textColor}${data.killsDeaths.get(player.getPlayer()).killValue}`, row, this.KILLS_COL);
			this.setItemValue(`${textColor}${data.killsDeaths.get(player.getPlayer()).deathValue}`, row, this.DEATHS_COL);

			// Status
			if (player.status.isNomad()) {
				this.setItemValue(`${HexColors.ORANGE}${player.status.statusDuration}`, row, this.STATUS_COL);
			} else {
				this.setItemValue(`${player.status.status}`, row, this.STATUS_COL);
			}
		}
	}
}
