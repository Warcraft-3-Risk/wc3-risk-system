import { ActivePlayer } from 'src/app/player/types/active-player';
import { GameType } from 'src/app/settings/strategies/game-type-strategy';
import { TURN_DURATION_IN_SECONDS } from 'src/configs/game-settings';
import { StateData } from '../game-mode/state/state-data';
import { ParticipantEntity } from 'src/app/utils/participant-entity';

export type MatchState = 'modeSelection' | 'preMatch' | 'inProgress' | 'postMatch';

export interface GameData {
	turn: number;
	ticks: number;
	leader: ParticipantEntity;
	matchState: MatchState;
	gameType?: GameType;
	matchCount: number;
	matchPlayers: ActivePlayer[];
	stateData?: StateData;
}

export class GlobalGameData {
	private static instance: GlobalGameData;
	private data: GameData;

	private constructor() {
		this.data = GlobalGameData.initialGameData();
	}

	public static getInstance() {
		if (this.instance == null) {
			this.instance = new GlobalGameData();
		}

		return this.instance;
	}

	public static prepareMatchData(players: ActivePlayer[]) {
		this.getInstance().data = {
			...GlobalGameData.initialGameData(),
			matchState: 'preMatch',
			matchCount: this.getInstance().data.matchCount + 1,
			matchPlayers: players,
			leader: players[0],
			stateData: { ...this.getInstance().data?.stateData },
			gameType: this.getInstance().data.gameType,
		} as GameData;
	}

	private static initialGameData(): GameData {
		return {
			turn: 0,
			ticks: TURN_DURATION_IN_SECONDS,
			leader: null,
			matchState: 'modeSelection',
			gameType: null,
			matchCount: 0,
			matchPlayers: [],
		} as GameData;
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

	public static get leader(): ParticipantEntity {
		return this.getInstance().data.leader;
	}
	public static set leader(v: ParticipantEntity) {
		this.getInstance().data.leader = v;
	}

	public static get matchPlayers(): ActivePlayer[] {
		return this.getInstance().data.matchPlayers;
	}

	public static get matchState(): MatchState {
		return this.getInstance().data.matchState;
	}
	public static set matchState(v: MatchState) {
		this.getInstance().data.matchState = v;
	}

	public static get gameMode(): GameType {
		return this.getInstance().data.gameType;
	}
	public static set gameMode(v: GameType) {
		this.getInstance().data.gameType = v;
	}

	public static get stateData(): StateData {
		return this.getInstance().data.stateData;
	}
	public static set stateData(v: StateData) {
		this.getInstance().data.stateData = v;
	}

	public static get matchCount(): number {
		return this.getInstance().data.matchCount;
	}
}
