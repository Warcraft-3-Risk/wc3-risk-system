import { HexColors } from 'src/app/utils/hex-colors';
import { SettingsStrategy } from './settings-strategy';
import { EventEmitter } from 'src/app/utils/events/event-emitter';
import { EVENT_SET_GAME_MODE } from 'src/app/utils/events/event-constants';
import { StandardGameMode } from 'src/app/game/game-mode/modes/standard-game-mode';
import { CapitalsGameMode } from 'src/app/game/game-mode/modes/capitals-game-mode';

export type GameType = 'Standard' | 'Capitals';

export const GameTypeOptions: Record<number, GameType> = {
	0: `Standard`,
	1: `Capitals`,
};

export const GameTypeOptionsColorFormatted: Record<number, string> = {
	0: `${HexColors.GREEN}${GameTypeOptions[0]}|r`,
	1: `${HexColors.RED}${GameTypeOptions[1]}|r`,
};

export class GameTypeStrategy implements SettingsStrategy {
	private readonly gameType: number;
	private readonly strategyMap: Map<number, () => void> = new Map([
		[0, this.handleConquest],
		[1, this.handleCapitals],
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

	private handleConquest(): void {
		EventEmitter.getInstance().emit(EVENT_SET_GAME_MODE, 'Standard');
	}

	private handleCapitals(): void {
		EventEmitter.getInstance().emit(EVENT_SET_GAME_MODE, 'Capitals');
	}
}
