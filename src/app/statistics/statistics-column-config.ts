import { NameManager } from '../managers/names/name-manager';
import { ActivePlayer } from '../player/types/active-player';
import { ComputeRatio } from '../utils/utils';
import { StatisticsModel } from './statistics-model';
import { UNIT_ID } from 'src/configs/unit-id';

type TextFunction = (player: ActivePlayer) => string;

export interface ColumnConfig {
	size: number;
	header: string;
	textFunction: TextFunction;
}

export function GetStatisticsColumns(model: StatisticsModel): ColumnConfig[] {
	return [
		{
			size: 0.11,
			header: 'Player Names',
			textFunction: (player) => NameManager.getInstance().getDisplayName(player.getPlayer()),
		},
		{
			size: 0.04,
			header: 'Rank',
			textFunction: (player) => `${model.getRanks().indexOf(player) + 1}`,
		},
		{
			size: 0.09,
			header: 'Biggest Rival',
			textFunction: (player) => {
				const rival = model.getRival(player);
				return rival ? NameManager.getInstance().getDisplayName(rival.getPlayer()) : 'N/A';
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
			size: 0.05,
			header: 'Bounty',
			textFunction: (player) => `${player.trackedData.bounty.earned}`,
		},
		{
			size: 0.05,
			header: 'Bonus',
			textFunction: (player) => `${player.trackedData.bonus.earned}`,
		},
		{
			size: 0.09,
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
			size: 0.06,
			header: 'KD Ratio\n(Value)',
			textFunction: (player) =>
				ComputeRatio(
					player.trackedData.killsDeaths.get(player.getPlayer()).killValue,
					player.trackedData.killsDeaths.get(player.getPlayer()).deathValue
				),
		},
		{
			size: 0.06,
			header: 'SS kills\n(Raw)',
			textFunction: (player) => `${player.trackedData.killsDeaths.get(player.getPlayer()).kills}`,
		},
		{
			size: 0.06,
			header: 'SS Deaths\n(Raw)',
			textFunction: (player) =>
				ComputeRatio(
					player.trackedData.killsDeaths.get(player.getPlayer()).killValue,
					player.trackedData.killsDeaths.get(player.getPlayer()).deathValue
				),
		},
		{
			size: 0.06,
			header: 'SS KD Ratio\n(Raw)',
			textFunction: (player) =>
				ComputeRatio(
					player.trackedData.killsDeaths.get(`${UNIT_ID.BATTLESHIP_SS}`).kills,
					player.trackedData.killsDeaths.get(`${UNIT_ID.BATTLESHIP_SS}`).deaths
				),
		},
		{
			size: 0.06,
			header: 'Tank Kills\n(Raw)',
			textFunction: (player) => `${player.trackedData.killsDeaths.get(`${UNIT_ID.TANK}`).kills}`,
		},
		{
			size: 0.07,
			header: 'Tank Deaths\n(Raw)',
			textFunction: (player) => `${player.trackedData.killsDeaths.get(`${UNIT_ID.TANK}`).deaths}`,
		},
		{
			size: 0.08,
			header: 'Tank KD Ratio\n(Raw)',
			textFunction: (player) =>
				ComputeRatio(
					player.trackedData.killsDeaths.get(`${UNIT_ID.TANK}`).kills,
					player.trackedData.killsDeaths.get(`${UNIT_ID.TANK}`).deaths
				),
		},
		{
			size: 0.05,
			header: 'Denies\n(Raw)',
			textFunction: (player) => `${player.trackedData.denies}`,
		},
	];
}
