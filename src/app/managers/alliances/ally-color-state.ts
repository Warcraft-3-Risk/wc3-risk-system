import { isReplay } from '../../utils/game-status';

export interface PlayerSettings {
	loadMode(): number;
	saveMode(mode: number): void;
}

export class AllyColorState {
	private static instance: AllyColorState;
	private mode: number = 0;
	private settings: PlayerSettings;

	constructor(settings: PlayerSettings) {
		this.settings = settings;
		const loadedMode = this.settings.loadMode();
		this.mode = loadedMode !== undefined ? loadedMode : 0;
	}

	public static getInstance(): AllyColorState {
		if (!AllyColorState.instance) {
			AllyColorState.instance = new AllyColorState({
				loadMode: () => 0, // TODO: Implement FileIO
				saveMode: (mode: number) => {}, // TODO: Implement FileIO
			});
		}
		return AllyColorState.instance;
	}

	getMode(): number {
		if (isReplay() || IsPlayerObserver(GetLocalPlayer())) return 0;
		return this.mode;
	}

	toggle(): void {
		this.mode = (this.mode + 1) % 3;
		this.settings.saveMode(this.mode);
	}

	isAlly(player: any, localPlayer: any): boolean {
		return IsPlayerAlly(player, localPlayer);
	}

	getDefaultColor(player: any): any {
		return GetPlayerColor(player);
	}

	getBlue(): any {
		return ConvertPlayerColor(1); // Blue
	}

	getTeal(): any {
		return ConvertPlayerColor(2); // Teal
	}

	getYellow(): any {
		return ConvertPlayerColor(4); // Yellow
	}

	getRed(): any {
		return ConvertPlayerColor(0); // Red
	}

	private resolveTeamColor(player: any, localPlayer: any, isColorBlind?: boolean): any {
		if (player === localPlayer) {
			return this.getBlue();
		}
		if (this.isAlly(player, localPlayer)) {
			return isColorBlind ? this.getYellow() : this.getTeal();
		}
		return this.getRed();
	}

	getMinimapColor(player: any, localPlayer: any, isColorBlind?: boolean): any {
		if (this.mode === 1 || this.mode === 2) {
			return this.resolveTeamColor(player, localPlayer, isColorBlind);
		}
		return this.getDefaultColor(player);
	}

	getUnitModelColor(player: any, localPlayer: any, isColorBlind?: boolean): any {
		if (this.mode === 2) {
			return this.resolveTeamColor(player, localPlayer, isColorBlind);
		}
		return this.getDefaultColor(player);
	}
}
