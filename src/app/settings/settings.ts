import { DiplomacyOptions } from './strategies/diplomacy-strategy';
import { OvertimeOptions } from './strategies/overtime-strategy';
import { ActivePlayer } from '../player/types/active-player';

export interface Settings {
	GameType: number;
	Diplomacy: DiplomacyOptions;
	Fog: number;
	Promode: number;
	Overtime: OvertimeOptions;

	Host: ActivePlayer;
	// The player that configured the settings. This is not necessarily the host
	Configurator: ActivePlayer;
}
