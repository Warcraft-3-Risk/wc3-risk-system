import { PlayerManager } from 'src/app/entity/player/player-manager';
import { GameManager } from '../game-manager';
import { GameState } from '../game-state';
import { NameManager } from 'src/app/managers/names/name-manager';
import { GamePlayer } from 'src/app/entity/player/game-player';
import { PLAYER_COLORS } from 'src/app/utils/player-colors';
import { ShuffleArray } from 'src/app/utils/utils';

export class PreGame implements GameState {
	private manager: GameManager;

	public constructor(manager: GameManager) {
		this.manager = manager;
	}

	public start(): void {}

	public end(): void {}
}
