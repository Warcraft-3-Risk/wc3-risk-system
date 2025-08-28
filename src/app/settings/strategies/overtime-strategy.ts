import { SettingsStrategy } from './settings-strategy';
import { HexColors } from 'src/app/utils/hex-colors';
import { OvertimeManager } from 'src/app/managers/overtime-manager';

export type OvertimeSetting = 30 | 60 | 120 | undefined;

export interface OvertimeOptions {
	option: number;
}

export const OvertimeStrings: Record<number, string> = {
	0: `Turbo (Turn 30)`,
	1: `Medium (Turn 60)`,
	2: `Extended (Turn 120)`,
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
	private readonly strategyMap: Map<number, () => void> = new Map([
		[0, this.handleTurboOption],
		[1, this.handleMediumOption],
		[2, this.handleExtendedOption],
		[3, this.handleOff],
	]);

	constructor(overtime: OvertimeOptions) {
		this.overtime = overtime;
	}

	public apply(): void {
		const handler = this.strategyMap.get(this.overtime.option);
		if (handler) {
			handler();
		}
	}

	private handleTurboOption(): void {
		OvertimeManager.getInstance().setOvertimeSetting(30);
	}

	private handleMediumOption(): void {
		OvertimeManager.getInstance().setOvertimeSetting(60);
	}

	private handleExtendedOption(): void {
		OvertimeManager.getInstance().setOvertimeSetting(120);
	}

	private handleOff(): void {
		OvertimeManager.getInstance().setOvertimeSetting(undefined);
	}
}
