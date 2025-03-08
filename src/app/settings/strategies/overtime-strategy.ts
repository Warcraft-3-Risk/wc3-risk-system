import { VictoryManager } from 'src/app/managers/victory-manager';
import { SettingsStrategy } from './settings-strategy';
import { HexColors } from 'src/app/utils/hex-colors';

export interface OvertimeOptions {
	option: number;
}

export const OvertimeStrings: Record<number, string> = {
	0: `Turbo (Turn 30)`,
	1: `Medium (Turn 60)`,
	2: `Extended (Turn 120)`,
	3: `Off`,
};

export const OvertimeStringsColorFormatted: Record<number, string> = {
	0: `${HexColors.GREEN}${OvertimeStrings[0]}|r`,
	1: `${HexColors.RED}${OvertimeStrings[1]}|r`,
	2: `${HexColors.RED}${OvertimeStrings[2]}|r`,
	3: `${HexColors.RED}${OvertimeStrings[3]}|r`,
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
		VictoryManager.OVERTIME_ACTIVE_AT_TURN = 30;
		VictoryManager.OVERTIME_MODE = true;
	}

	private handleMediumOption(): void {
		VictoryManager.OVERTIME_ACTIVE_AT_TURN = 60;
		VictoryManager.OVERTIME_MODE = true;
	}

	private handleExtendedOption(): void {
		VictoryManager.OVERTIME_ACTIVE_AT_TURN = 120;
		VictoryManager.OVERTIME_MODE = true;
	}

	private handleOff(): void {
		VictoryManager.OVERTIME_ACTIVE_AT_TURN = undefined;
	}
}
