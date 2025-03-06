import { File } from 'w3ts';
import { CUSTOM_MAP_DATA_MATCH_DIRECTORY, CUSTOM_MAP_DATA_MINE_TYPE_TXT } from '../utils';
import { MatchData } from 'src/app/game/state/game-state';

export class ExportEndGameScore {
	private static getFileName = (fileName: string) => `${CUSTOM_MAP_DATA_MATCH_DIRECTORY}/${fileName}.${CUSTOM_MAP_DATA_MINE_TYPE_TXT}`;

	private constructor() {}

	public static async write(
		data: {
			Player: string;
			Rank: string;
			LastTurn: string;
			CitiesEnd: string;
			CitiesMax: string;
			BountyEarned: string;
			BonusEarned: string;
			GoldEarned: string;
			GoldMax: string;
			GoldEnd: string;
			Kills: string;
			Deaths: string;
			KD: string;
			BiggestRival: string;
		}[]
	): Promise<void> {
		const content = this.formatData(data);
		File.writeRaw(this.getFileName(`${MatchData.matchCount}_EndGameScore`), content, false);
	}

	private static formatData(
		data: {
			Player: string;
			Rank: string;
			LastTurn: string;
			CitiesEnd: string;
			CitiesMax: string;
			BountyEarned: string;
			BonusEarned: string;
			GoldEarned: string;
			GoldMax: string;
			GoldEnd: string;
			Kills: string;
			Deaths: string;
			KD: string;
			BiggestRival: string;
		}[]
	): string {
		const headers = [
			'Player',
			'Rank',
			'Last Turn',
			'Cities End',
			'Cities Max',
			'Bounty Earned',
			'Bonus Earned',
			'Gold Earned',
			'Gold Max',
			'Gold End',
			'Kills',
			'Deaths',
			'KD',
			'Biggest Rival',
		];
		const formattedEntries = data.map(
			(entry) =>
				`${entry.Player},${entry.Rank},${entry.LastTurn},${entry.CitiesEnd},${entry.CitiesMax},${entry.BountyEarned},${entry.BonusEarned},${entry.GoldEarned},${entry.GoldMax},${entry.GoldEnd},${entry.Kills},${entry.Deaths},${entry.KD},${entry.BiggestRival}`
		);
		return [headers.join(','), formattedEntries.join('\n')].join('\n');
	}
}
