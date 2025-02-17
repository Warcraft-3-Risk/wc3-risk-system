import { GamePlayer } from '../../game-player';

export interface StatusStrategy {
	run: (gamePlayer: GamePlayer) => void;
}
