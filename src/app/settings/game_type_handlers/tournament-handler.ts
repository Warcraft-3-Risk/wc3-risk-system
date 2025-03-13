import { Settings } from '../settings';
import { GameTypeHandler } from './game-type-handler.interface';

export class TournamentHandler implements GameTypeHandler {
	applySettings(settings: Settings): void {}
}
