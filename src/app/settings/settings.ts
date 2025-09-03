import { DiplomacyOptions } from './strategies/diplomacy-strategy';
import { OvertimeOptions } from './strategies/overtime-strategy';

export interface Settings {
	GameType: number;
	Diplomacy: DiplomacyOptions;
	Fog: number;
	Promode: number;
	Overtime: OvertimeOptions;
}
