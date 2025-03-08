import { File } from 'w3ts';
import { PlayerManager } from 'src/app/player/player-manager';
import { NameManager } from 'src/app/managers/names/name-manager';
import { CUSTOM_MAP_DATA_MATCH_DIRECTORY, CUSTOM_MAP_DATA_MINE_TYPE_TXT, ShuffleArray } from '../utils';

export class ExportShuffledPlayerList {
	private static getFileName = (fileName: string) => `${CUSTOM_MAP_DATA_MATCH_DIRECTORY}/${fileName}.${CUSTOM_MAP_DATA_MINE_TYPE_TXT}`;

	private constructor() {}

	public static async write(): Promise<void> {
		let nameList: player[] = [];

		const playerManager = PlayerManager.getInstance();
		const nameManager = NameManager.getInstance();

		playerManager.players.forEach((player) => {
			nameList.push(player.getPlayer());
		});

		ShuffleArray(nameList);

		let bTags = nameList.map((x) => nameManager.getBtag(x));
		let data = bTags.join(',');

		File.writeRaw(this.getFileName('0_Players'), data, false);
	}
}
