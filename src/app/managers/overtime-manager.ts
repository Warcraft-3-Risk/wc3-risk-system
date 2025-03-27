import { GlobalGameData } from '../game/state/global-game-state';
import { OvertimeSetting } from '../settings/strategies/overtime-strategy';

export class OvertimeManager {
	private static instance: OvertimeManager;
	private setting: OvertimeSetting = undefined;

	private constructor() {}

	public static getInstance(): OvertimeManager {
		if (this.instance == null) {
			this.instance = new OvertimeManager();
		}

		return this.instance;
	}

	public setOvertimeSetting(setting: OvertimeSetting) {
		this.setting = setting;
	}

	public static isOvertimeEnabled(): boolean {
		return OvertimeManager.getInstance().overtimeEnabled();
	}

	public static isOvertimeActive(): boolean {
		return OvertimeManager.isOvertimeEnabled() && GlobalGameData.turnCount >= OvertimeManager.getOvertimeSettingValue();
	}

	public overtimeEnabled(): boolean {
		return this.setting !== undefined;
	}

	public static getOvertimeSettingValue(): OvertimeSetting {
		return OvertimeManager.getInstance().setting;
	}

	public static getTurnCountPostOvertime(): number {
		return GlobalGameData.turnCount - OvertimeManager.getOvertimeSettingValue();
	}

	public static getTurnsUntilOvertimeIsActivated(): number {
		return OvertimeManager.getOvertimeSettingValue() - GlobalGameData.turnCount;
	}
}
