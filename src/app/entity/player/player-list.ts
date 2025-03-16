import { IsObserver } from 'src/app/utils/utils';

/**
 * Used to keep a dynamic list of players in the game, excluding observers.
 * Players who leave the game will be removed from this list.
 * This is different from PlayerManager players, which includes left players.
 */
export class PlayerList {
	private players: Set<player>;

	private static instance: PlayerList;

	private constructor() {
		this.players = new Set<player>();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player = Player(i);

			if (GetPlayerSlotState(player) == PLAYER_SLOT_STATE_LEFT) continue;
			if (GetPlayerSlotState(player) == PLAYER_SLOT_STATE_EMPTY) continue;
			if (IsObserver(player)) continue;

			this.players.add(player);
		}
	}

	public static getInstance(): PlayerList {
		if (this.instance == null) {
			this.instance = new PlayerList();
		}

		return this.instance;
	}

	public getPlayers(): Set<player> {
		return this.players;
	}

	public removePlayer(player: player) {
		this.players.delete(player);
	}
}
