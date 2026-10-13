import { HexColors } from 'src/app/utils/hex-colors';
import { SettingsStrategy } from './settings-strategy';

export type GameType = 'Standard' | 'Capitals' | 'Reserves';

export const GameTypeOptions: Record<number, GameType> = {
	0: `Standard`,
	1: `Capitals`,
	2: `Reserves`,
};

export const GameTypeOptionsColorFormatted: Record<number, string> = {
	0: `${HexColors.GREEN}${GameTypeOptions[0]}|r`,
	1: `${HexColors.RED}${GameTypeOptions[1]}|r`,
	2: `${HexColors.ORANGE}${GameTypeOptions[2]}|r`,
};

export class GameTypeStrategy implements SettingsStrategy {
	private readonly gameType: number;
	private readonly strategyMap: Map<number, () => void> = new Map([
		[0, this.handleStandard],
		[1, this.handleCapitals],
		[2, this.handleReserves],
	]);

	constructor(gameType: number) {
		this.gameType = gameType;
	}

	public apply(): void {
		const handler = this.strategyMap.get(this.gameType);
		if (handler) {
			handler();
		}
	}

	private handleStandard(): void {}

	private handleCapitals(): void {}

	// The reserves are switched on by EnableReservesState once the match starts
	private handleReserves(): void {}
}
