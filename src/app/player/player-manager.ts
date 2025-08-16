import { ActivePlayer } from './types/active-player';
import { HumanPlayer } from './types/human-player';
import { buildGuardHealthButton, buildGuardValueButton } from '../ui/player-preference-buttons';
import { File } from 'w3ts';
import { PLAYER_STATUS } from './status/status-enum';
import { Status } from './status/status';

// const banList: string[] = [
// ];

export class PlayerManager {
	public static readonly PLAYING: string = '|cFF00FFF0Playing|r';
	public static readonly OBSERVING: string = '|cFFFFFFFFObserving|r';

	private static _instance: PlayerManager;

	private _playerFromHandle: Map<player, ActivePlayer>;
	//TODO observers can just be "player" type. HOWEVER, this may come in handy later if i ever decide to implement obs that are actual players
	private _observerFromHandle: Map<player, HumanPlayer>;

	private constructor() {
		this._playerFromHandle = new Map<player, ActivePlayer>();
		this._observerFromHandle = new Map<player, HumanPlayer>();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player = Player(i);

			// banList.forEach((name) => {
			// 	if (NameManager.getInstance().getBtag(player).toLowerCase() == name) {
			// 		CustomVictoryBJ(player, false, false);
			// 		ClearTextMessages();
			// 	}
			// });

			if (IsPlayerObserver(player)) {
				this._observerFromHandle.set(player, new HumanPlayer(player));
				continue;
			}

			if (GetPlayerSlotState(player) == PLAYER_SLOT_STATE_EMPTY || GetPlayerSlotState(player) == PLAYER_SLOT_STATE_LEFT) {
				continue;
			}

			if (GetPlayerController(player) == MAP_CONTROL_USER || GetPlayerController(player) == MAP_CONTROL_COMPUTER) {
				this._playerFromHandle.set(player, new HumanPlayer(player));

				const healthButton = buildGuardHealthButton(this._playerFromHandle.get(player));
				const valueButton = buildGuardValueButton(this._playerFromHandle.get(player));
				let contents: string = '';

				if (player == GetLocalPlayer()) {
					contents = File.read('risk/ui.pld');

					if (contents == 'false') {
						BlzFrameSetVisible(healthButton, false);
						BlzFrameSetVisible(valueButton, false);
					}
				}
			}
		}
	}

	public static getInstance(): PlayerManager {
		if (this._instance == null) {
			this._instance = new PlayerManager();
		}

		return this._instance;
	}

	public getCurrentActiveHumanPlayers(): ActivePlayer[] {
		let activePlayers: ActivePlayer[] = [];

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player = Player(i);

			if (IsPlayerObserver(player)) {
				this._observerFromHandle.set(player, new HumanPlayer(player));
				continue;
			}

			if (GetPlayerSlotState(player) == PLAYER_SLOT_STATE_EMPTY || GetPlayerSlotState(player) == PLAYER_SLOT_STATE_LEFT) {
				continue;
			}

			if (GetPlayerController(player) == MAP_CONTROL_USER) {
				activePlayers.push(new HumanPlayer(player));
			}
		}

		return activePlayers;
	}

	public activeToObs(player: player) {
		this._observerFromHandle.set(player, this._playerFromHandle.get(player) as HumanPlayer);
		this._playerFromHandle.delete(player);
		SetPlayerState(player, PLAYER_STATE_OBSERVER, 1);
	}

	public obsToActive(player: player) {
		this._playerFromHandle.set(player, this._observerFromHandle.get(player));
		this._observerFromHandle.delete(player);
		SetPlayerState(player, PLAYER_STATE_OBSERVER, 0);
	}

	public isActive(player: player) {
		return this._playerFromHandle.has(player);
	}

	public getHumanPlayers(): ActivePlayer[] {
		return Array.from(this._playerFromHandle.values()).filter((p: ActivePlayer) => GetPlayerController(p.getPlayer()) === MAP_CONTROL_USER);
	}

	public getHumanPlayersCount(): number {
		return this.getHumanPlayers().length;
	}

	public isObserver(player: player) {
		return this._observerFromHandle.has(player);
	}

	public get players(): Map<player, ActivePlayer> {
		return this._playerFromHandle;
	}

	public setObserver(player: player) {
		this._observerFromHandle.set(player, new HumanPlayer(player));
	}

	public get playersAliveOrNomad(): Map<player, ActivePlayer> {
		const filteredMap = new Map(
			Array.from(this._playerFromHandle).filter(([key, value]) => value.status.isAlive() || value.status.isNomad())
		);
		return filteredMap;
	}

	public get observers(): Map<player, HumanPlayer> {
		return this._observerFromHandle;
	}

	public get playersAndObservers(): Map<player, ActivePlayer> {
		const combinedMap = new Map<player, ActivePlayer>();
		this._playerFromHandle.forEach((value, key) => combinedMap.set(key, value));
		this._observerFromHandle.forEach((value, key) => combinedMap.set(key, value));
		return combinedMap;
	}
	public setPlayerStatus(v: player, status: PLAYER_STATUS) {
		this.players.get(v).status.set(status);
	}

	public getPlayerStatus(v: player): Status {
		return this.players.get(v).status;
	}
}
