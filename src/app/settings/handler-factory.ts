import { GameTypeHandler } from './handlers/game-type-handler';
import { PromodeHandler } from './handlers/promode';
import { StandardHandler } from './handlers/standard';
import { TournamentHandler } from './handlers/tournament';

export class GameTypeHandlerFactory {
	private handlers: Map<number, GameTypeHandler>;

	constructor() {
		this.handlers = new Map<number, GameTypeHandler>();
		this.handlers.set(0, new StandardHandler());
		this.handlers.set(1, new TournamentHandler());
		this.handlers.set(2, new PromodeHandler());
	}

	public getHandler(gameType: number): GameTypeHandler {
		return this.handlers.get(gameType);
	}
}
