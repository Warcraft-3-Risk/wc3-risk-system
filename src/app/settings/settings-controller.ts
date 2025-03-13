import { GameTypeHandlerFactory } from './game_type_handlers/game-type-handler-factory';
import { GameType, Fog, Overtime, Diplomacy, TeamSize, Settings } from './settings';

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
				GameType: GameType.Standard,
				Fog: Fog.Off,
				Overtime: Overtime.Turn30,
				Diplomacy: Diplomacy.FFA,
				PlayersPerTeam: TeamSize.Two,
			});
		}

		return this.instance;
	}

	public applySettings(): void {
		const handler = this.handlerFactory.getHandler(this.settings.GameType);

		if (handler) {
			handler.applySettings(this.settings);
		} else {
			print('Invalid GameType handler');
		}
	}

	public setGameType(num: GameType) {
		this.settings.GameType = num;
	}

	public setDiplomacy(num: Diplomacy) {
		this.settings.Diplomacy = num;
	}

	public setTeamSize(num: TeamSize) {
		this.settings.PlayersPerTeam = num;
	}

	public setFog(num: Fog) {
		this.settings.Fog = num;
	}

	public setOvertime(num: Overtime) {
		this.settings.Overtime = num;
	}

	public getGameType(): GameType {
		return this.settings.GameType;
	}

	public getDiplomacy(): Diplomacy {
		return this.settings.Diplomacy;
	}

	public getTeamSize(): TeamSize {
		return this.settings.PlayersPerTeam;
	}

	public getFog(): Fog {
		return this.settings.Fog;
	}

	public getOvertime(): number {
		return this.settings.Overtime;
	}
}
