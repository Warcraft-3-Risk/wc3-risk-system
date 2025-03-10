import { HexColors } from 'src/app/utils/hex-colors';
import { Settings } from '../settings';

export const GameTypeOptions: Record<number, string> = {
	0: `${HexColors.GREEN}Standard`,
	1: `${HexColors.GREEN}Promode`,
	2: `${HexColors.GREEN}Capitals`,
	3: `${HexColors.GREEN}Tournament`,
};

export interface GameTypeHandler {
	applySettings(settings: Settings): void;
}
