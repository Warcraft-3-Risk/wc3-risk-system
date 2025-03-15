import { Overtime } from '../settings';
import { SettingsController } from '../settings-controller';
import { SettingsStrategy } from './settings-strategies.interface';

export class OvertimeStrategy implements SettingsStrategy {
	private readonly handlers: Map<Overtime, () => void>;

	constructor() {
		this.handlers = new Map([
			[Overtime.Turn30, this.handleTurn30],
			[Overtime.Turn60, this.handleTurn60],
			[Overtime.Turn120, this.handleTurn120],
			[Overtime.Off, this.handleOff],
		]);
	}

	public apply(settingsController: SettingsController): void {
		const handler = this.handlers.get(settingsController.getOvertime());

		if (handler) {
			handler();
		}
	}

	private handleTurn30(): void {
		// VictoryManager.OVERTIME_ACTIVE_AT_TURN = 30;
		// VictoryManager.OVERTIME_MODE = true;
	}

	private handleTurn60(): void {
		// VictoryManager.OVERTIME_ACTIVE_AT_TURN = 60;
		// VictoryManager.OVERTIME_MODE = true;
	}

	private handleTurn120(): void {
		// VictoryManager.OVERTIME_ACTIVE_AT_TURN = 120;
		// VictoryManager.OVERTIME_MODE = true;
	}

	private handleOff(): void {
		// VictoryManager.OVERTIME_ACTIVE_AT_TURN = undefined;
	}
}
