import { File } from 'w3ts';
import { CUSTOM_MAP_DATA_MATCH_DIRECTORY, CUSTOM_MAP_DATA_MINE_TYPE_TXT } from '../utils';
import { GlobalGameData } from 'src/app/game/state/global-game-state';

export interface EndGameScoreData {
	Player: string;
	Rank: string;
	Rating: string;
	RatingChange: string;
	BiggestRival: string;
	LastTurn: string;
	CitiesMax: string;
	CitiesEnd: string;
	IncomeMax: string;
	IncomeEnd: string;
	GoldEarned: string;
	GoldMax: string;
	GoldEnd: string;
	Kills: string;
	Deaths: string;
	KD: string;
	BountyEarned: string;
	BonusEarned: string;
	SSKills: string;
	SSDeaths: string;
	SSKD: string;
	TankKills: string;
	TankDeaths: string;
	TankKD: string;
	Denies: string;
	RoarCasts: string;
	DispelCasts: string;
}

export class ExportEndGameScore {
	private static getFileName = (fileName: string) => `${CUSTOM_MAP_DATA_MATCH_DIRECTORY}/${fileName}.${CUSTOM_MAP_DATA_MINE_TYPE_TXT}`;

	private constructor() {}

	public static write(data: EndGameScoreData[]): void {
		const content = this.formatData(data);
		File.writeRaw(this.getFileName(`${GlobalGameData.matchCount}_EndGameScore`), content, false);
	}

	private static formatData(data: EndGameScoreData[]): string {
		const headers = [
			'Player',
			'Rank',
			'Rating',
			'Rating Change',
			'Biggest Rival',
			'Last Turn',
			'Cities Max',
			'Cities End',
			'Income Max',
			'Income End',
			'Gold Earned',
			'Gold Max',
			'Gold End',
			'Kills',
			'Deaths',
			'KD',
			'Bounty Earned',
			'Bonus Earned',
			'SS Kills',
			'SS Deaths',
			'SS KD',
			'Tank Kills',
			'Tank Deaths',
			'Tank KD',
			'Denies',
			'Roar Casts',
			'Dispel Casts',
		];
		const formattedEntries = data.map(
			(entry) =>
				`${entry.Player},${entry.Rank},${entry.Rating},${entry.RatingChange},${entry.BiggestRival},${entry.LastTurn},${entry.CitiesMax},${entry.CitiesEnd},${entry.IncomeMax},${entry.IncomeEnd},${entry.GoldEarned},${entry.GoldMax},${entry.GoldEnd},${entry.Kills},${entry.Deaths},${entry.KD},${entry.BountyEarned},${entry.BonusEarned},${entry.SSKills},${entry.SSDeaths},${entry.SSKD},${entry.TankKills},${entry.TankDeaths},${entry.TankKD},${entry.Denies},${entry.RoarCasts},${entry.DispelCasts}`
		);
		return [headers.join(','), formattedEntries.join('\n')].join('\n');
	}
}
