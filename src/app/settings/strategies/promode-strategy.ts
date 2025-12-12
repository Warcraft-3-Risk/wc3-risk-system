import { NameManager } from 'src/app/managers/names/name-manager';
import { PlayerManager } from 'src/app/player/player-manager';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { PLAYER_COLORS } from 'src/app/utils/player-colors';
import { ShuffleArray } from 'src/app/utils/utils';
import { SettingsStrategy } from './settings-strategy';
import { HexColors } from 'src/app/utils/hex-colors';

export const PromodeOptions: Record<number, string> = {
	0: `Off`,
	1: `On`,
	2: `Equalized`,
};

export const PromodeOptionsColorFormatted: Record<number, string> = {
	0: `${HexColors.GREEN}${PromodeOptions[0]}|r`,
	1: `${HexColors.RED}${PromodeOptions[1]}|r`,
	2: `${HexColors.RED}${PromodeOptions[2]}|r`,
};

export class PromodeStrategy implements SettingsStrategy {
	private readonly promode: number;
	private readonly strategyMap: Map<number, () => void> = new Map([
		[0, this.handleOff],
		[1, this.handleOn],
		[2, this.handleOn], // Equalized ProMode uses same settings as regular ProMode
	]);

	constructor(promode: number) {
		this.promode = promode;
	}

	public apply(): void {
		const handler = this.strategyMap.get(this.promode);

		if (handler) {
			handler();
		}
	}

	private handleOff(): void {
		const activePlayers: Map<player, ActivePlayer> = PlayerManager.getInstance().players;
		const nameManager: NameManager = NameManager.getInstance();
		const colors: playercolor[] = PLAYER_COLORS.slice(0, activePlayers.size);

		ShuffleArray(colors);

		activePlayers.forEach((val, playerHandle) => {
			nameManager.setColor(playerHandle, colors.pop());
			nameManager.setName(playerHandle, 'color');
		});
	}

	private handleOn(): void {
		const playerManager: PlayerManager = PlayerManager.getInstance();
		const nameManager: NameManager = NameManager.getInstance();

		playerManager.players.forEach((val, playerHandle) => {
			nameManager.setColor(playerHandle, GetPlayerColor(playerHandle));
			nameManager.setName(playerHandle, 'acct');
			val.trackedData.bonus.disable();
		});

		SetMapFlag(MAP_LOCK_ALLIANCE_CHANGES, true);

		//TODO Handle teams
	}
}
