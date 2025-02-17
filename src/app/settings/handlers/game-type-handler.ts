import { HexColors } from 'src/app/utils/hex-colors';
import { Settings } from '../settings';

export const GameTypeOptions: Record<number, string> = {
	0: `${HexColors.GREEN}Standard`,
	1: `${HexColors.GREEN}Tournament`,
	2: `${HexColors.GREEN}Promode`,
	3: `${HexColors.GREEN}Capitals`,
};

export interface GameTypeHandler {
	applySettings(settings: Settings): void;
}
