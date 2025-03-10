import { GameTypeHandlerFactory } from './handler-factory';
import { Settings } from './settings';

export class SettingsController {
	private static instance: SettingsController;
	private settings: Settings;
	private handlerFactory: GameTypeHandlerFactory;

	constructor(settings: Settings) {
		this.settings = settings;
		this.handlerFactory = new GameTypeHandlerFactory();
	}

	public static getInstance(): SettingsController {
		if (!this.instance) {
			this.instance = new SettingsController(<Settings>{
				GameType: 0,
				Diplomacy: 0,
				PlayersPerTeam: 2,
				Fog: 0,
				Overtime: 0,
			});
		}

		return this.instance;
	}

	public applySettings(): void {
		const handler = this.handlerFactory.getHandler(this.settings.GameType);

		if (handler) {
			handler.applySettings(this.settings);
		} else {
			throw new Error('Invalid GameType handler');
		}
	}

	public setGameType(num: number) {
		this.settings.GameType = num;
	}

	public setDiplomacy(num: number) {
		this.settings.Diplomacy = num;
	}

	public setTeamSize(num: number) {
		this.settings.PlayersPerTeam = num;
	}

	public setFog(num: number) {
		this.settings.Fog = num;
	}

	public setOvertime(num: number) {
		this.settings.Overtime = num;
	}

	public getGameType(): number {
		return this.settings.GameType;
	}

	public getDiplomacy(): number {
		return this.settings.Diplomacy;
	}

	public getTeamSize(): number {
		return this.settings.PlayersPerTeam;
	}

	public getFog(): number {
		return this.settings.Fog;
	}

	public getOvertime(): number {
		return this.settings.Overtime;
	}
}
