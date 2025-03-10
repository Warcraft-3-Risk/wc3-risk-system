import { HexColors } from 'src/app/utils/hex-colors';
import { GameType, Settings } from '../settings';

export const GameTypeOptions: Record<GameType, string> = {
	[GameType.Standard]: `${HexColors.GREEN}Standard`,
	[GameType.Promode]: `${HexColors.RED}Promode`,
	[GameType.Capitals]: `${HexColors.RED}Capitals`,
	[GameType.Tournament]: `${HexColors.RED}Tournament`,
};

export interface GameTypeHandler {
	applySettings(settings: Settings): void;
}
