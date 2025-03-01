import { GameState } from './game-state';
import { MetaGame } from './states/meta-game';
import { ModeSelection } from './states/mode-selection';
import { PostGame } from './states/post-game';
import { PreGame } from './states/pre-game';
import { Setup } from './states/setup';
import { TeamSelection } from './states/team-selection';

export class GameManager {
	private stateIndex: number;
	private states: GameState[];
	private static instance: GameManager;

	private constructor() {
		this.stateIndex = 0;
		this.states = [];
		this.states.push(new Setup(this));
		this.states.push(new ModeSelection(this));
		this.states.push(new TeamSelection(this));
		this.states.push(new PreGame(this));
		this.states.push(new MetaGame(this));
		this.states.push(new PostGame(this));
	}

	public static getInstance() {
		if (this.instance == null) {
			this.instance = new GameManager();
		}

		return this.instance;
	}

	public start() {
		this.states[this.stateIndex].start();
	}

	public updateState() {
		this.stateIndex = this.stateIndex + 1;
		this.states[this.stateIndex].start();
	}
}
