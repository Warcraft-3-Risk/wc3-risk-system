import { File } from 'w3ts';
import { SettingsContext } from 'src/app/settings/settings-context';
import { DiplomacyStrings } from 'src/app/settings/strategies/diplomacy-strategy';
import { FogOptions } from 'src/app/settings/strategies/fog-strategy';
import { GameTypeOptions } from 'src/app/settings/strategies/game-type-strategy';
import { OvertimeStrings } from 'src/app/settings/strategies/overtime-strategy';
import { PromodeOptions } from 'src/app/settings/strategies/promode-strategy';
import { CUSTOM_MAP_DATA_MATCH_DIRECTORY, CUSTOM_MAP_DATA_MINE_TYPE_TXT } from '../utils';

export class ExportGameSettings {
	private static getFileName = (fileName: string) => `${CUSTOM_MAP_DATA_MATCH_DIRECTORY}/${fileName}.${CUSTOM_MAP_DATA_MINE_TYPE_TXT}`;

	private constructor() {}

	public static write(settings: SettingsContext): void {
		let gameSettings = this.getGameSettings(settings);

		File.writeRaw(this.getFileName('0_GameSettings'), gameSettings, false);
	}

	private static getGameSettings(settings: SettingsContext): string {
		let headers = ['Diplomacy', 'Fog', 'Game Type', 'Overtime', 'Promode'];
		let rows = [
			DiplomacyStrings[settings.getSettings().Diplomacy.option],
			FogOptions[settings.getSettings().Fog],
			GameTypeOptions[settings.getSettings().GameType],
			OvertimeStrings[settings.getSettings().Overtime.option],
			PromodeOptions[settings.getSettings().Promode],
		];

		return [headers.join(','), rows.join(',')].join('\n');
	}
}
