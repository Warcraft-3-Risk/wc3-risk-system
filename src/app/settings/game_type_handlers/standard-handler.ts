import { Settings } from '../settings';
import { GameTypeHandler } from './game-type-handler.interface';

export class StandardHandler implements GameTypeHandler {
	applySettings(settings: Settings): void {}
}
