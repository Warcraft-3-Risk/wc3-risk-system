import { PLAYER_COLORS } from 'src/app/utils/player-colors';
import { GiveFullVision, IsObserver, ShuffleArray } from 'src/app/utils/utils';
import { GamePlayer } from './game-player';
import { AdminList } from 'src/app/configs/admin-list';
import { NameManager } from 'src/app/names/name-manager';
import { PlayerList } from './player-list';

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

		PlayerList.getInstance()
			.getPlayers()
			.forEach((player) => {
				if (IsObserver(player)) {
					GiveFullVision(player);
					this.observer = player;
					//23 is Snow
					nameManager.setColor(player, PLAYER_COLORS[23]);
					nameManager.setName(player, 'btag');

					const playerName = nameManager.getBtag(player);

					if (!AdminList.includes(playerName)) {
						SetPlayerState(this.observer, PLAYER_STATE_OBSERVER, 1);
					}
				} else {
					this.gamePlayers.set(player, new GamePlayer(player));
				}
			});

		//Set up player colors and names
		const colors: playercolor[] = PLAYER_COLORS.slice(0, this.gamePlayers.size);

		ShuffleArray(colors);

		this.gamePlayers.forEach((val, playerHandle) => {
			nameManager.setColor(playerHandle, colors.pop());
			nameManager.setName(playerHandle, 'color');
		});
	}
}
