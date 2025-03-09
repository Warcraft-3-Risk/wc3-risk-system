import { NameManager } from 'src/names/name-manager';
import { PLAYER_COLORS } from 'src/app/utils/player-colors';
import { ShuffleArray } from 'src/app/utils/utils';
import { GamePlayer } from './game-player';
import { AdminList } from 'src/configs/admin-list';

export class PlayerManager {
	private gamePlayers: Map<player, GamePlayer>;
	private observer: player;
	private static instance: PlayerManager;

	private constructor() {
		this.gamePlayers = new Map<player, GamePlayer>();
		this.observer = null;
		this.setup();
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

	public getObserver(): player {
		return this.observer;
	}

	private setup(): void {
		const nameManager: NameManager = NameManager.getInstance();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player = Player(i);

			if (GetPlayerSlotState(player) == PLAYER_SLOT_STATE_LEFT) continue;
			if (GetPlayerSlotState(player) == PLAYER_SLOT_STATE_EMPTY) continue;

			// Check for obs and set as real obs if the player is not an admin
			if (GetPlayerId(player) == 21) {
				this.observer = player;
				nameManager.setColor(player, PLAYER_COLORS[23]);
				nameManager.setName(player, 'btag');

				const playerName = nameManager.getBtag(player);

				if (!AdminList.includes(playerName)) {
					SetPlayerState(this.observer, PLAYER_STATE_OBSERVER, 1);
				}
			} else {
				this.gamePlayers.set(player, new GamePlayer(player));
			}
		}

		//Set up player colors and names
		const colors: playercolor[] = PLAYER_COLORS.slice(0, this.gamePlayers.size);

		ShuffleArray(colors);

		this.gamePlayers.forEach((val, playerHandle) => {
			nameManager.setColor(playerHandle, colors.pop());
			nameManager.setName(playerHandle, 'color');
		});
	}
}
