import { BaseGameState } from './base-game-state';
import { ModeSelectionState } from './states/mode-selection-state';
import { InitializationState } from './states/initialization-state';
import { TeamSelectionState } from './states/team-selection-state';
import { GameSetupState } from './states/game-setup-state';
import { ActiveGameState } from './states/active-game-state';
import { PostGameState } from './states/post-game-state';

export type StateName = 'initialization' | 'modeSelection' | 'teamSelection' | 'gameSetup' | 'activeGame' | 'postGame';

interface NamedState {
	name: StateName;
	instance: BaseGameState;
}

export class GameStateManager {
	private static instance: GameStateManager;
	private states: NamedState[];
	private currentIndex: number;

	private constructor() {
		//This is the order the states progress in.
		//It is possible to go to any state from any state for the purpose of resetting, but in general just calling nextState() will handle the states properly.
		this.states = [
			{ name: 'initialization', instance: new InitializationState(this) },
			{ name: 'modeSelection', instance: new ModeSelectionState(this) },
			{ name: 'teamSelection', instance: new TeamSelectionState(this) },
			{ name: 'gameSetup', instance: new GameSetupState(this) },
			{ name: 'activeGame', instance: new ActiveGameState(this) },
			{ name: 'postGame', instance: new PostGameState(this) },
		];
		this.currentIndex = 0;
		this.states[this.currentIndex].instance.enter();
	}

	public static getInstance(): GameStateManager {
		if (!GameStateManager.instance) {
			GameStateManager.instance = new GameStateManager();
		}

		return GameStateManager.instance;
	}

	public nextState(stateName?: StateName): void {
		if (stateName === undefined) {
			this.currentIndex++;
		} else {
			const targetIndex = this.states.findIndex((state) => state.name === stateName);

			if (targetIndex === -1) {
				//TODO make some kinda of error message functionality to make errors more readable and noticable, maybe even track them and print to file at the end of a game? idk, if single player testing the file print wouldnt work once they left anyways
				//I also don't think this error handling is really needed, but its nice while working on a big refactor. It will help with bug catching.
				print(`Invalid state targeted ${stateName}`);
			} else {
				this.currentIndex = targetIndex;
			}
		}

		if (this.currentIndex >= this.states.length) {
			this.currentIndex = this.states.findIndex((state) => state.name === 'gameSetup');
		}

		this.states[this.currentIndex].instance.enter();
	}

	public getCurrentState(): BaseGameState {
		return this.states[this.currentIndex].instance;
	}
}
