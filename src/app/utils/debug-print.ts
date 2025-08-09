import { SHOW_DEBUG_PRINTS } from 'src/configs/game-settings';
import { HexColors } from './hex-colors';

export function debugPrint(message: string, ...args: any[]): void {
	if (SHOW_DEBUG_PRINTS) {
		print(`${HexColors.RED}DEBUG:|r ${message}`, args);
	}
}
