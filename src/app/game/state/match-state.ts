import { ActivePlayer } from 'src/app/player/types/active-player';
import { TURN_DURATION_IN_SECONDS } from 'src/configs/game-settings';

export type GameModeType = 'ffa' | 'capital';

export type MatchState = 'modeSelection' | 'preMatch' | 'inProgress' | 'postMatch';

export interface GameData {
	turn: number;
	ticks: number;
	leader: ActivePlayer;
	matchState: MatchState;
	gameModeType?: GameModeType;
	matchCount: number;
}

export class MatchData {
	private static instance: MatchData;
	private data: GameData;

	private constructor() {
		this.data = MatchData.initialGameData();
	}

	public static getInstance() {
		if (this.instance == null) {
			this.instance = new MatchData();
		}

		return this.instance;
	}

	public static prepareMatchData() {
		this.getInstance().data = {
			...MatchData.initialGameData(),
			matchState: 'preMatch',
			matchCount: this.getInstance().data.matchCount + 1,
		};
	}

	private static initialGameData(): GameData {
		return {
			turn: 1,
			ticks: TURN_DURATION_IN_SECONDS,
			leader: null,
			matchState: 'modeSelection',
			gameModeType: null,
			matchCount: 0,
		};
	}

	public static get turnCount(): number {
		return this.getInstance().data.turn;
	}
	public static set turnCount(v: number) {
		this.getInstance().data.turn = v;
	}

	public static get tickCounter(): number {
		return this.getInstance().data.ticks;
	}
	public static set tickCounter(v: number) {
		this.getInstance().data.ticks = v;
	}

	public static get leader(): ActivePlayer {
		return this.getInstance().data.leader;
	}
	public static set leader(v: ActivePlayer) {
		this.getInstance().data.leader = v;
	}

	public static get matchState(): MatchState {
		return this.getInstance().data.matchState;
	}
	public static set matchState(v: MatchState) {
		this.getInstance().data.matchState = v;
	}

	public static get gameMode(): GameModeType {
		return this.getInstance().data.gameModeType;
	}
	public static set gameMode(v: GameModeType) {
		this.getInstance().data.gameModeType = v;
	}

	public static get matchCount(): number {
		return this.getInstance().data.matchCount;
	}
}
