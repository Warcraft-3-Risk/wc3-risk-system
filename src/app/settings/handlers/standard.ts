import { Settings } from '../settings';
import { GameTypeHandler } from './game-type-handler';

export class StandardHandler implements GameTypeHandler {
	applySettings(settings: Settings): void {}
}
