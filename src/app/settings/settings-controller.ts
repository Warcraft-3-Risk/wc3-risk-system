import { GameType, Fog, Overtime, Diplomacy, TeamSize, Settings } from './settings';
import { DiplomacyStrategy } from './strategies/diplomacy-strategy';
import { FogStrategy } from './strategies/fog-strategy';
import { GameTypeStrategy } from './strategies/game-type-strategy';
import { OvertimeStrategy } from './strategies/overtime-strategy';
import { SettingsStrategy } from './strategies/settings-strategies.interface';

export class SettingsController {
	private static instance: SettingsController;
	private settings: Settings;
	private strategies: Set<SettingsStrategy>;

	constructor(settings: Settings) {
		this.settings = settings;

		this.strategies = new Set<SettingsStrategy>([
			new GameTypeStrategy(),
			new FogStrategy(),
			new OvertimeStrategy(),
			new DiplomacyStrategy(),
		]);
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
		this.strategies.forEach((strategy) => strategy.apply(this));
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
