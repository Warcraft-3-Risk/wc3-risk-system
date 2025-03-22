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

	public overtimeEnabled(): boolean {
		return this.setting !== undefined;
	}

	public static getOvertimeSettingValue(): OvertimeSetting {
		return OvertimeManager.getInstance().setting;
	}
}
