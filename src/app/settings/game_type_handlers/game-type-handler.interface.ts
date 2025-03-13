import { Settings } from '../settings';

export interface GameTypeHandler {
	applySettings(settings: Settings): void;
}
