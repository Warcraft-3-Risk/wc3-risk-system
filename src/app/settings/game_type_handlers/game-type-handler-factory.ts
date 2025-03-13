import { GameType } from '../settings';
import { CapitalsHandler } from './capitals-handler';
import { GameTypeHandler } from './game-type-handler.interface';
import { PromodeHandler } from './promode-handler';
import { StandardHandler } from './standard-handler';
import { TournamentHandler } from './tournament-handler';

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
