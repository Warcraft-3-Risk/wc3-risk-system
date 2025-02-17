import { GamePlayer } from './game-player';

export class PlayerManager {
	private gamePlayers: Map<player, GamePlayer>;
	private observers: Set<player>;
	private static instance: PlayerManager;

	private constructor() {
		this.gamePlayers = new Map<player, GamePlayer>();
		this.observers = new Set<player>();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player = Player(i);

			if (GetPlayerSlotState(player) == PLAYER_SLOT_STATE_LEFT) continue;
			if (GetPlayerSlotState(player) == PLAYER_SLOT_STATE_EMPTY) continue;

			this.gamePlayers.set(player, new GamePlayer(player));

			//TODO add obs to obs set
		}
	}

	public static getInstance(): PlayerManager {
		if (this.instance == null) {
			this.instance = new PlayerManager();
		}

		return this.instance;
	}

	public getPlayers(): Map<player, GamePlayer> {
		return this.gamePlayers;
	}

	public getObservers(): Set<player> {
		return this.observers;
	}
}
