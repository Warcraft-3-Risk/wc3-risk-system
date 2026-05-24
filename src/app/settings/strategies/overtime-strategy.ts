import { SettingsStrategy } from './settings-strategy';
import { HexColors } from 'src/app/utils/hex-colors';
import { OvertimeSetting } from 'src/app/managers/overtime-logic';

export interface OvertimeOptions {
	option: number;
}

export const OvertimeStrings: Record<number, string> = {
	0: `Turbo (Turn 0)`,
	1: `Medium (Turn 30)`,
	2: `Extended (Turn 60)`,
	3: `Off`,
};

export const OvertimeColors: Record<number, string> = {
	0: `${HexColors.GREEN}`,
	1: `${HexColors.RED}`,
	2: `${HexColors.RED}`,
	3: `${HexColors.RED}`,
};

export const OvertimeStringsColorFormatted: Record<number, string> = {
	0: `${OvertimeColors[0]}${OvertimeStrings[0]}|r`,
	1: `${OvertimeColors[1]}${OvertimeStrings[1]}|r`,
	2: `${OvertimeColors[2]}${OvertimeStrings[2]}|r`,
	3: `${OvertimeColors[3]}${OvertimeStrings[3]}|r`,
};

export class OvertimeStrategy implements SettingsStrategy {
	private readonly overtime: OvertimeOptions;

	constructor(overtime: OvertimeOptions) {
		this.overtime = overtime;
	}

	public apply(): void {
		// Overtime is now passively resolved via SettingsContext.getOvertimeSetting()
		// No active assignment required.
	}
}
