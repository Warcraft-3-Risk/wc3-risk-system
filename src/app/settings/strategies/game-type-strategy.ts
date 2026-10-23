import { HexColors } from 'src/app/utils/hex-colors';

export type GameType = 'Standard' | 'Capitals';

export const GameTypeOptions: Record<number, GameType> = {
	0: `Standard`,
	1: `Capitals`,
};

export const GameTypeOptionsColorFormatted: Record<number, string> = {
	0: `${HexColors.GREEN}${GameTypeOptions[0]}|r`,
	1: `${HexColors.RED}${GameTypeOptions[1]}|r`,
};
