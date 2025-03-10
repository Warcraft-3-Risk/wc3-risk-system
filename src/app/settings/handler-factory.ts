import { CapitalsHandler } from './handlers/capitals';
import { GameTypeHandler } from './handlers/game-type-handler';
import { PromodeHandler } from './handlers/promode';
import { StandardHandler } from './handlers/standard';
import { TournamentHandler } from './handlers/tournament';
import { GameType } from './settings';

export class GameTypeHandlerFactory {
	private handlers: Map<GameType, GameTypeHandler>;

	constructor() {
		this.handlers = new Map<GameType, GameTypeHandler>();
		this.handlers.set(GameType.Standard, new StandardHandler());
		this.handlers.set(GameType.Promode, new PromodeHandler());
		this.handlers.set(GameType.Capitals, new CapitalsHandler());
		this.handlers.set(GameType.Tournament, new TournamentHandler());
	}

	public getHandler(gameType: GameType): GameTypeHandler {
		return this.handlers.get(gameType);
	}
}
