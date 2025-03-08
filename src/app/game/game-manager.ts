import { GameState } from './state/game-state';
import { MetaGame } from './state/meta-game';
import { ModeSelection } from './state/mode-selection';
import { PostGame } from './state/post-game';
import { PreGame } from './state/pre-game';

export class GameManager {
	private _state: GameState;
	private _round: number;
	private modeSelectionState: ModeSelection;
	private preGameState: PreGame;
	private metaGameState: MetaGame;
	private postGameState: PostGame;
	private restartEnabled: boolean;

	private static instance: GameManager;

	private constructor() {
		this._round = 1;

		this.postGameState = new PostGame();
		this.metaGameState = new MetaGame(this.postGameState);
		this.preGameState = new PreGame(this.metaGameState);
		this.modeSelectionState = new ModeSelection(this.preGameState);

		this.updateState(this.modeSelectionState);
	}

	public static getInstance() {
		if (this.instance == null) {
			this.instance = new GameManager();
		}

		return this.instance;
	}

	public updateState(state: GameState) {
		this._state = state;
		this._state.setObserver(this);
		this._state.start();
	}

	public isStatePreGame() {
		return this._state instanceof PreGame;
	}

	public isStateMetaGame() {
		return this._state instanceof MetaGame;
	}

	public isStatePostGame() {
		return this._state instanceof PostGame;
	}

	public isRestartEnabled() {
		return this.restartEnabled;
	}

	public setRestartEnabled(bool: boolean) {
		this.restartEnabled = bool;
	}

	public fastRestart() {
		this.updateState(this.preGameState);
	}

	public fullRestart() {
		this.updateState(this.modeSelectionState);
	}

	public get state(): GameState {
		return this._state;
	}

	public get round(): number {
		return this._round;
	}
}
