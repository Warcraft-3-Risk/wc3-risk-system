import { NameManager } from '../managers/names/name-manager';
import { ActivePlayer } from '../player/types/active-player';
import { ParticipantEntityManager } from '../utils/participant-entity';
import { ComputeRatio, truncateWithColorCode } from '../utils/utils';
import { StatisticsModel } from './statistics-model';
import { UNIT_ID } from 'src/configs/unit-id';
import { RatingManager } from '../rating/rating-manager';
import { getRankIcon } from '../rating/rating-calculator';
import { PlayerManager } from '../player/player-manager';
import { HexColors } from '../utils/hex-colors';

type TextFunction = (player: ActivePlayer) => string;
type IconFunction = (player: ActivePlayer) => string;

export interface ColumnConfig {
	size: number;
	header: string;
	textFunction: TextFunction;
	iconFunction?: IconFunction;
	iconSize?: number;
}

/**
 * Get statistics columns for the end-game leaderboard
 * @param model The statistics model
 * @param includeRatingColumn Whether to include the Rating column (true for ranked view, false for unranked)
 * @returns Array of column configurations
 */
export function GetStatisticsColumns(model: StatisticsModel, includeRatingColumn: boolean = true): ColumnConfig[] {
	const highlightIfOwnPlayer = (p: ActivePlayer, value: string | number) => {
		if (p.getPlayer() === GetLocalPlayer()) {
			return `${HexColors.TANGERINE}${value}|r`;
		} else {
			return value + '';
		}
	};

	const ratingManager = RatingManager.getInstance();

	// Use larger column sizes for unranked view (no Rating column = more space)
	const nameSize = includeRatingColumn ? 0.1 : 0.11;
	const rivalSize = includeRatingColumn ? 0.1 : 0.11;
	const rankSize = includeRatingColumn ? 0.04 : 0.05;
	const lastTurnSize = includeRatingColumn ? 0.06 : 0.07;
	const citiesMaxEndSize = includeRatingColumn ? 0.06 : 0.07;
	const incomeSize = includeRatingColumn ? 0.06 : 0.07;
	const killsSize = includeRatingColumn ? 0.06 : 0.07;
	const deathSize = includeRatingColumn ? 0.06 : 0.07;

	const columns: ColumnConfig[] = [
		{
			size: nameSize,
			header: 'Player Name',
			textFunction: (player) => {
				if (!player || !player.getPlayer()) {
					return 'N/A';
				}

				let name = ParticipantEntityManager.getParticipantNamePrefixedWithOptionalTeamNumber(player.getPlayer());

				if (!name) {
					return 'N/A';
				}

				return truncateWithColorCode(name, 24);
			},
		},
		{
			size: rankSize,
			header: 'Rank',
			textFunction: (player) => {
				const ranks = model.getRanks();
				if (!ranks) {
					return highlightIfOwnPlayer(player, 'N/A');
				}

				const index = ranks.indexOf(player);
				return `${highlightIfOwnPlayer(player, index >= 0 ? index + 1 : 'N/A')}`;
			},
		},
	];

	// Only include Rating column for ranked view
	if (includeRatingColumn) {
		columns.push({
			size: 0.09,
			header: 'Rating',
			iconSize: 0.015,
			iconFunction: (player) => {
				if (!player || !player.getPlayer()) {
					return '';
				}

				const btag = NameManager.getInstance().getBtag(player.getPlayer());
				if (!btag) {
					return '';
				}

				const ratingResults = ratingManager.getRatingResults();
				const result = ratingResults ? ratingResults.get(btag) : undefined;

				// Use new rating if available (just finished game), otherwise use current rating
				const rating = result && result.newRating != undefined ? result.newRating : ratingManager.getPlayerRating(btag);

				return getRankIcon(rating);
			},
			textFunction: (player) => {
				if (!player || !player.getPlayer()) {
					return '0';
				}

				const btag = NameManager.getInstance().getBtag(player.getPlayer());
				if (!btag) {
					return highlightIfOwnPlayer(player, '0');
				}

				const ratingResults = ratingManager.getRatingResults();
				const result = ratingResults ? ratingResults.get(btag) : undefined;

				if (result && result.newRating != undefined && result.totalChange != undefined) {
					const change = result.totalChange;
					const color = change >= 0 ? HexColors.GREEN : HexColors.RED;
					const sign = change >= 0 ? '+' : '';
					return `${highlightIfOwnPlayer(player, result.newRating)} (${color}${sign}${change}|r)`;
				}

				return `${highlightIfOwnPlayer(player, ratingManager.getPlayerRating(btag))}`;
			},
		});
	}

	columns.push(
		{
			size: rivalSize,
			header: 'Biggest Rival',
			textFunction: (player) => {
				if (!player) {
					return 'N/A';
				}

				const rival = model.getRival(player);
				if (!rival || !rival.getPlayer()) {
					return highlightIfOwnPlayer(player, 'N/A');
				}

				let rivalName = NameManager.getInstance().getDisplayName(rival.getPlayer());
				if (!rivalName) {
					return highlightIfOwnPlayer(player, 'N/A');
				}

				return truncateWithColorCode(rivalName, 24);
			},
		},
		{
			size: lastTurnSize,
			header: 'Last Turn',
			textFunction: (player) => {
				if (!player) {
					return '-1';
				}

				if (!player.trackedData) {
					return highlightIfOwnPlayer(player, -1);
				}

				const turnDied = player.trackedData.turnDied;
				return highlightIfOwnPlayer(player, turnDied != undefined ? turnDied : -1);
			},
		},
		{
			size: citiesMaxEndSize,
			header: 'Cities\nMax/End',
			textFunction: (player) => {
				if (!player) {
					return '0/0';
				}

				if (!player.trackedData || !player.trackedData.cities) {
					return highlightIfOwnPlayer(player, '0/0');
				}

				const cities = player.trackedData.cities;
				const max = cities.max != undefined ? cities.max : 0;
				const end = cities.end != undefined ? cities.end : 0;
				return highlightIfOwnPlayer(player, max + '/' + end);
			},
		},
		{
			size: incomeSize,
			header: 'Income\nMax/End',
			textFunction: (player) => {
				if (!player) {
					return '0/0';
				}

				if (!player.trackedData || !player.trackedData.income) {
					return highlightIfOwnPlayer(player, '0/0');
				}

				const income = player.trackedData.income;
				const max = income.max != undefined ? income.max : 0;
				const end = income.end != undefined ? income.end : 0;
				return highlightIfOwnPlayer(player, max + '/' + end);
			},
		},
		{
			size: 0.1,
			header: 'Gold Earned/\nMax/End',
			textFunction: (player) => {
				if (!player) {
					return '0/0/0';
				}

				if (!player.trackedData || !player.trackedData.gold) {
					return highlightIfOwnPlayer(player, '0/0/0');
				}

				const gold = player.trackedData.gold;
				const earned = gold.earned != undefined ? gold.earned : 0;
				const max = gold.max != undefined ? gold.max : 0;
				const end = gold.end != undefined ? gold.end : 0;
				return highlightIfOwnPlayer(player, earned + '/' + max + '/' + end);
			}
		},
		{
			size: killsSize,
			header: 'Kills\n(Value)',
			textFunction: (player) => {
				if (!player) {
					return '0';
				}

				if (!player.trackedData || !player.trackedData.killsDeaths) {
					return highlightIfOwnPlayer(player, '0');
				}

				const killsDeaths = player.trackedData.killsDeaths.get(player.getPlayer());
				if (!killsDeaths || killsDeaths.killValue == undefined) {
					return highlightIfOwnPlayer(player, '0');
				}

				return highlightIfOwnPlayer(player, killsDeaths.killValue);
			}
		},
		{
			size: deathSize,
			header: 'Deaths\n(Value)',
			textFunction: (player) => {
				if (!player) {
					return '0';
				}

				if (!player.trackedData || !player.trackedData.killsDeaths) {
					return highlightIfOwnPlayer(player, '0');
				}

				const killsDeaths = player.trackedData.killsDeaths.get(player.getPlayer());
				if (!killsDeaths || killsDeaths.deathValue == undefined) {
					return highlightIfOwnPlayer(player, '0');
				}

				return highlightIfOwnPlayer(player, killsDeaths.deathValue);
			}
		},
		{
			size: 0.08,
			header: 'KD Ratio\n(Value)',
			textFunction: (player) => {
				if (!player) {
					return '0.00';
				}

				if (!player.trackedData || !player.trackedData.killsDeaths) {
					return highlightIfOwnPlayer(player, '0.00');
				}

				const killsDeaths = player.trackedData.killsDeaths.get(player.getPlayer());
				if (!killsDeaths) {
					return highlightIfOwnPlayer(player, '0.00');
				}

				const killValue = killsDeaths.killValue != undefined ? killsDeaths.killValue : 0;
				const deathValue = killsDeaths.deathValue != undefined ? killsDeaths.deathValue : 0;
				return highlightIfOwnPlayer(player, ComputeRatio(killValue, deathValue));
			},
		},
		{
			size: 0.07,
			header: '',
			textFunction: (_player) => ``,
		},
		{
			size: 0.07,
			header: 'Bounty\nBonus',
			textFunction: (player) => {
				if (!player) {
					return '0/0';
				}

				if (!player.trackedData) {
					return highlightIfOwnPlayer(player, '0/0');
				}

				const bounty = player.trackedData.bounty;
				const bonus = player.trackedData.bonus;
				const bountyEarned = bounty && bounty.earned != undefined ? bounty.earned : 0;
				const bonusEarned = bonus && bonus.earned != undefined ? bonus.earned : 0;
				return highlightIfOwnPlayer(player, bountyEarned + '/' + bonusEarned);
			},
		},
		{
			size: 0.06,
			header: 'SS Kills\n(Raw)',
			textFunction: (player) => {
				if (!player) {
					return '0';
				}

				if (!player.trackedData || !player.trackedData.killsDeaths) {
					return highlightIfOwnPlayer(player, '0');
				}

				const killsDeaths = player.trackedData.killsDeaths.get(`${UNIT_ID.BATTLESHIP_SS}`);
				if (!killsDeaths || killsDeaths.kills == undefined) {
					return highlightIfOwnPlayer(player, '0');
				}

				return highlightIfOwnPlayer(player, killsDeaths.kills);
			},
		},
		{
			size: 0.07,
			header: 'SS Deaths\n(Raw)',
			textFunction: (player) => {
				if (!player) {
					return '0';
				}

				if (!player.trackedData || !player.trackedData.killsDeaths) {
					return highlightIfOwnPlayer(player, '0');
				}

				const killsDeaths = player.trackedData.killsDeaths.get(`${UNIT_ID.BATTLESHIP_SS}`);
				if (!killsDeaths || killsDeaths.deaths == undefined) {
					return highlightIfOwnPlayer(player, '0');
				}

				return highlightIfOwnPlayer(player, killsDeaths.deaths);
			},
		},
		{
			size: 0.07,
			header: 'SS KD Ratio\n(Raw)',
			textFunction: (player) => {
				if (!player) {
					return '0.00';
				}

				if (!player.trackedData || !player.trackedData.killsDeaths) {
					return highlightIfOwnPlayer(player, '0.00');
				}

				const killsDeaths = player.trackedData.killsDeaths.get(`${UNIT_ID.BATTLESHIP_SS}`);
				if (!killsDeaths) {
					return highlightIfOwnPlayer(player, '0.00');
				}

				const kills = killsDeaths.kills != undefined ? killsDeaths.kills : 0;
				const deaths = killsDeaths.deaths != undefined ? killsDeaths.deaths : 0;
				return highlightIfOwnPlayer(player, ComputeRatio(kills, deaths));
			},
		},
		{
			size: 0.07,
			header: 'Tank Kills\n(Raw)',
			textFunction: (player) => {
				if (!player) {
					return '0';
				}

				if (!player.trackedData || !player.trackedData.killsDeaths) {
					return highlightIfOwnPlayer(player, '0');
				}

				const killsDeaths = player.trackedData.killsDeaths.get(`${UNIT_ID.TANK}`);
				if (!killsDeaths || killsDeaths.kills == undefined) {
					return highlightIfOwnPlayer(player, '0');
				}

				return highlightIfOwnPlayer(player, killsDeaths.kills);
			},
		},
		{
			size: 0.08,
			header: 'Tank Deaths\n(Raw)',
			textFunction: (player) => {
				if (!player) {
					return '0';
				}

				if (!player.trackedData || !player.trackedData.killsDeaths) {
					return highlightIfOwnPlayer(player, '0');
				}

				const killsDeaths = player.trackedData.killsDeaths.get(`${UNIT_ID.TANK}`);
				if (!killsDeaths || killsDeaths.deaths == undefined) {
					return highlightIfOwnPlayer(player, '0');
				}

				return highlightIfOwnPlayer(player, killsDeaths.deaths);
			},
		},
		{
			size: 0.09,
			header: 'Tank KD Ratio\n(Raw)',
			textFunction: (player) => {
				if (!player) {
					return '0.00';
				}

				if (!player.trackedData || !player.trackedData.killsDeaths) {
					return highlightIfOwnPlayer(player, '0.00');
				}

				const killsDeaths = player.trackedData.killsDeaths.get(`${UNIT_ID.TANK}`);
				if (!killsDeaths) {
					return highlightIfOwnPlayer(player, '0.00');
				}

				const kills = killsDeaths.kills != undefined ? killsDeaths.kills : 0;
				const deaths = killsDeaths.deaths != undefined ? killsDeaths.deaths : 0;
				return highlightIfOwnPlayer(player, ComputeRatio(kills, deaths));
			},
		},
		{
			size: 0.06,
			header: 'Denies\n(Raw)',
			textFunction: (player) => {
				if (!player) {
					return '0';
				}

				if (!player.trackedData) {
					return highlightIfOwnPlayer(player, '0');
				}

				const denies = player.trackedData.denies;
				return highlightIfOwnPlayer(player, denies != undefined ? denies : 0);
			},
		},
		{
			size: 0.06,
			header: 'Roar\n(Ability)',
			textFunction: (player) => {
				if (!player) {
					return '0';
				}

				if (!player.trackedData) {
					return highlightIfOwnPlayer(player, '0');
				}

				const roarCasts = player.trackedData.roarCasts;
				return highlightIfOwnPlayer(player, roarCasts != undefined ? roarCasts : 0);
			},
		},
		{
			size: 0.07,
			header: 'Dispel\n(Ability)',
			textFunction: (player) => {
				if (!player) {
					return '0';
				}

				if (!player.trackedData) {
					return highlightIfOwnPlayer(player, '0');
				}

				const dispelCasts = player.trackedData.dispelCasts;
				return highlightIfOwnPlayer(player, dispelCasts != undefined ? dispelCasts : 0);
			},
		}
	);

	return columns;
}
