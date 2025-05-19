import { PlayerManager } from 'src/app/player/player-manager';
import { SettingsStrategy } from './settings-strategy';
import { HexColors } from 'src/app/utils/hex-colors';
import { FogManager } from 'src/app/managers/fog-manager';

export const FogOptions: Record<number, string> = {
	0: `Off`,
	1: `On`,
	2: `Night`,
};

export const FogOptionsColorFormatted: Record<number, string> = {
	0: `${HexColors.GREEN}${FogOptions[0]}|r`,
	1: `${HexColors.RED}${FogOptions[1]}|r`,
	2: `${HexColors.RED}${FogOptions[2]}|r`,
};

export class FogStrategy implements SettingsStrategy {
	private readonly fog: number;
	private readonly strategyMap: Map<number, () => void> = new Map([
		[0, this.handleOff],
		[1, this.handleOn],
		[2, this.handleNight],
	]);

	constructor(fog: number) {
		this.fog = fog;

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player: player = Player(i);

			if (IsPlayerObserver(player)) {
				FogModifierStart(CreateFogModifierRect(player, FOG_OF_WAR_VISIBLE, GetWorldBounds(), true, false));
			}
		}
	}

	public apply(): void {
		const handler = this.strategyMap.get(this.fog);

		// Setup fog tracking for players
		const players = [...PlayerManager.getInstance().players.values()];

		players.forEach((player) => {
			FogManager.getInstance().add(player.getPlayer());
		});

		// Initialize fog for all players
		SetTimeOfDayScale(0);
		SetTimeOfDay(12.0);

		if (handler) {
			handler();
		}
	}

	private handleOff(): void {
		FogManager.getInstance().turnFogOff();
	}

	private handleOn(): void {
		FogManager.getInstance().turnFogOn();
	}

	private handleNight(): void {
		FogManager.getInstance().turnFogOff();
	}
}
