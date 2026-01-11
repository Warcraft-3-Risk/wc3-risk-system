import { NameManager } from '../managers/names/name-manager';
import { ActivePlayer } from '../player/types/active-player';
import { ParticipantEntityManager } from '../utils/participant-entity';
import { ComputeRatio } from '../utils/utils';
import { StatisticsModel } from './statistics-model';
import { UNIT_ID } from 'src/configs/unit-id';
import { RatingManager } from '../rating/rating-manager';
import { getRankIcon } from '../rating/rating-calculator';
import { PlayerManager } from '../player/player-manager';
import { HexColors } from '../utils/hex-colors';
import { debugPrint } from '../utils/debug-print';

type TextFunction = (player: ActivePlayer) => string;
type IconFunction = (player: ActivePlayer) => string;

export interface ColumnConfig {
	size: number;
	header: string;
	textFunction: TextFunction;
	iconFunction?: IconFunction;
	iconSize?: number;
}

export function GetStatisticsColumns(model: StatisticsModel): ColumnConfig[] {
	const localPlayer = PlayerManager.getInstance().players.get(GetLocalPlayer());
	const ratingManager = RatingManager.getInstance();

	const columns: ColumnConfig[] = [
		{
			size: 0.09,
			header: 'Player Name',
			textFunction: (player) => {
				let name = ParticipantEntityManager.getParticipantNamePrefixedWithOptionalTeamNumber(player.getPlayer());

				if(name && name.length > 20) {
					name = name.slice(0, 20) + '...';
				}

				return name;
			},
		},
	];

	columns.push({
		size: 0.09,
		header: 'Rating',
		iconSize: 0.015,
		iconFunction: (player) => {
			const btag = NameManager.getInstance().getBtag(player.getPlayer());
			const result = ratingManager.getRatingResults().get(btag);

			// Use new rating if available (just finished game), otherwise use current rating
			const rating = result ? result.newRating : ratingManager.getPlayerRating(btag);

			return getRankIcon(rating);
		},
		textFunction: (player) => {
			const btag = NameManager.getInstance().getBtag(player.getPlayer());
			const result = ratingManager.getRatingResults().get(btag);

			if (result) {
				const change = result.totalChange;
				const color = change >= 0 ? HexColors.GREEN : HexColors.RED;
				const sign = change >= 0 ? '+' : '';
				return `${result.newRating} (${color}${sign}${change}|r)`;
			}

			return `${ratingManager.getPlayerRating(btag)}`;
		},
	});

	columns.push(
		{
			size: 0.09,
			header: 'Biggest Rival',
			textFunction: (player) => {
				const rival = model.getRival(player);
				let rivalName = '';

				if(rival) {
					rivalName = NameManager.getInstance().getDisplayName(rival.getPlayer());
				}

				if (rivalName && rivalName.length > 20) {
					rivalName = rivalName.slice(0, 20) + '...';
				}

				return rival ? rivalName : 'N/A';
			},
		},
		{
			size: 0.06,
			header: 'Last Turn',
			textFunction: (player) => `${player.trackedData.turnDied}`,
		},
		{
			size: 0.06,
			header: 'Cities\nMax/End',
			textFunction: (player) => `${player.trackedData.cities.max}/${player.trackedData.cities.end}`,
		},
		{
			size: 0.06,
			header: 'Income\nMax/End',
			textFunction: (player) => `${player.trackedData.income.max}/${player.trackedData.income.end}`,
		},
		{
			size: 0.07,
			header: 'Bounty\nBonus',
			textFunction: (player) => `${player.trackedData.bounty.earned}/${player.trackedData.bonus.earned}`,
		},
		{
			size: 0.10,
			header: 'Gold Earned/\nMax/End',
			textFunction: (player) => `${player.trackedData.gold.earned}/${player.trackedData.gold.max}/${player.trackedData.gold.end}`,
		},
		{
			size: 0.06,
			header: 'Kills\n(Value)',
			textFunction: (player) => `${player.trackedData.killsDeaths.get(player.getPlayer()).killValue}`,
		},
		{
			size: 0.06,
			header: 'Deaths\n(Value)',
			textFunction: (player) => `${player.trackedData.killsDeaths.get(player.getPlayer()).deathValue}`,
		},
		{
			size: 0.08,
			header: 'KD Ratio\n(Value)',
			textFunction: (player) =>
				ComputeRatio(
					player.trackedData.killsDeaths.get(player.getPlayer()).killValue,
					player.trackedData.killsDeaths.get(player.getPlayer()).deathValue
				),
		},
		{
			size: 0.07,
			header: 'SS Kills\n(Raw)',
			textFunction: (player) => `${player.trackedData.killsDeaths.get(`${UNIT_ID.BATTLESHIP_SS}`).kills}`,
		},
		{
			size: 0.07,
			header: 'SS Kills\n(Raw)',
			textFunction: (player) => `${player.trackedData.killsDeaths.get(`${UNIT_ID.BATTLESHIP_SS}`).kills}`,
		},
		{
			size: 0.07,
			header: 'SS Deaths\n(Raw)',
			textFunction: (player) => `${player.trackedData.killsDeaths.get(`${UNIT_ID.BATTLESHIP_SS}`).deaths}`,
		},
		{
			size: 0.07,
			header: 'SS KD Ratio\n(Raw)',
			textFunction: (player) =>
				ComputeRatio(
					player.trackedData.killsDeaths.get(`${UNIT_ID.BATTLESHIP_SS}`).kills,
					player.trackedData.killsDeaths.get(`${UNIT_ID.BATTLESHIP_SS}`).deaths
				),
		},
		{
			size: 0.07,
			header: 'Tank Kills\n(Raw)',
			textFunction: (player) => `${player.trackedData.killsDeaths.get(`${UNIT_ID.TANK}`).kills}`,
		},
		{
			size: 0.07,
			header: 'Tank Deaths\n(Raw)',
			textFunction: (player) => `${player.trackedData.killsDeaths.get(`${UNIT_ID.TANK}`).deaths}`,
		},
		{
			size: 0.09,
			header: 'Tank KD Ratio\n(Raw)',
			textFunction: (player) =>
				ComputeRatio(
					player.trackedData.killsDeaths.get(`${UNIT_ID.TANK}`).kills,
					player.trackedData.killsDeaths.get(`${UNIT_ID.TANK}`).deaths
				),
		},
		{
			size: 0.07,
			header: 'Denies\n(Raw)',
			textFunction: (player) => `${player.trackedData.denies}`,
		},
		{
			size: 0.07,
			header: 'Roar\n(Ability)',
			textFunction: (player) => `${player.trackedData.roarCasts}`,
		},
		{
			size: 0.07,
			header: 'Dispel\n(Ability)',
			textFunction: (player) => `${player.trackedData.dispelCasts}`,
		}
	);

	return columns;
}
