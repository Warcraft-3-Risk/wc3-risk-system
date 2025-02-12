import { SHOW_DEBUG_PRINTS } from 'src/configs/game-settings';

export function debugPrint(message: string, ...args: any[]): void {
	if (SHOW_DEBUG_PRINTS) {
		print(message, args);
	}
}
