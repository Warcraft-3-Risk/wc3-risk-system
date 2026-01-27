import { ActivePlayer } from './types/active-player';
import { HumanPlayer } from './types/human-player';
import {
	buildGuardHealthButton,
	buildGuardValueButton,
	buildLabelToggleButton,
	buildRatingStatsButton,
} from '../ui/player-preference-buttons';
import { File } from 'w3ts';
import { PLAYER_STATUS } from './status/status-enum';
import { Status } from './status/status';
import { debugPrint } from '../utils/debug-print';
import { NameManager } from '../managers/names/name-manager';
import { W3C_MODE_ENABLED } from '../utils/map-info';
import { BAN_LIST_ACTIVE, RATING_SYSTEM_ENABLED } from 'src/configs/game-settings';
import { RatingStatsUI } from '../ui/rating-stats-ui';

const banList: string[] = ['inbreeder#2416', 'remy#22303', 'overthrow#21522', 'vixen#22381'];

export class PlayerManager {
	public static readonly PLAYING: string = '|cFF00FFF0Playing|r';
	public static readonly OBSERVING: string = '|cFFFFFFFFObserving|r';

	private static _instance: PlayerManager;

	private _playerFromHandle: Map<player, ActivePlayer>;
	private _playerControllerHandle: Map<player, mapcontrol>;
	//TODO observers can just be "player" type. HOWEVER, this may come in handy later if i ever decide to implement obs that are actual players
	private _observerFromHandle: Map<player, HumanPlayer>;
	private _initialHumanPlayerCount: number = 0;

	private constructor() {
		this._playerFromHandle = new Map<player, ActivePlayer>();
		this._playerControllerHandle = new Map<player, mapcontrol>();
		this._observerFromHandle = new Map<player, HumanPlayer>();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player = Player(i);

			if (BAN_LIST_ACTIVE && !W3C_MODE_ENABLED) {
				banList.forEach((name) => {
					if (NameManager.getInstance().getBtag(player).toLowerCase() == name) {
						CustomDefeatBJ(player, 'You are map banned! Appeal: discord.gg/wc3risk');
						ClearTextMessages();
					}
				});
			}

			if (IsPlayerObserver(player)) {
				const humanPlayer = new HumanPlayer(player);
				this._observerFromHandle.set(player, humanPlayer);

				if (RATING_SYSTEM_ENABLED) {
					humanPlayer.ratingStatsUI = new RatingStatsUI(humanPlayer);
				}
				continue;
			}

			if (GetPlayerSlotState(player) == PLAYER_SLOT_STATE_EMPTY || GetPlayerSlotState(player) == PLAYER_SLOT_STATE_LEFT) {
				continue;
			}

			if (GetPlayerController(player) == MAP_CONTROL_USER || GetPlayerController(player) == MAP_CONTROL_COMPUTER) {
				const humanPlayer = new HumanPlayer(player);
				this._playerFromHandle.set(player, humanPlayer);
				this._playerControllerHandle.set(player, MAP_CONTROL_USER);

				// Create and inject RatingStatsUI after player creation (only if rating system is enabled)
				if (RATING_SYSTEM_ENABLED) {
					humanPlayer.ratingStatsUI = new RatingStatsUI(humanPlayer);
				}

				const healthButton = buildGuardHealthButton(this._playerFromHandle.get(player));
				const valueButton = buildGuardValueButton(this._playerFromHandle.get(player));
				const labelButton = buildLabelToggleButton(this._playerFromHandle.get(player));
				// Only create rating stats button if rating system is enabled
				const ratingButton = RATING_SYSTEM_ENABLED ? buildRatingStatsButton(this._playerFromHandle.get(player)) : null;
				let contents: string = '';

				if (player == GetLocalPlayer()) {
					contents = File.read('risk/ui.pld');

					if (contents == 'false') {
						BlzFrameSetVisible(healthButton, false);
						BlzFrameSetVisible(valueButton, false);
						BlzFrameSetVisible(labelButton, false);
						if (ratingButton) {
							BlzFrameSetVisible(ratingButton, false);
						}
					}

					// Note: Rating preference is now stored in the rating file itself
					// and loaded via RatingManager.getShowRatingPreference()
					// The old 'risk/rating.pld' file is no longer used
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

	public getEmptyPlayerSlots(): player[] {
		let players: player[] = [];
		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player = Player(i);

			if (IsPlayerObserver(player)) {
				this._observerFromHandle.set(player, new HumanPlayer(player));
				continue;
			}

			if (GetPlayerSlotState(player) == PLAYER_SLOT_STATE_EMPTY) {
				players.push(player);
			}
		}
		return players;
	}

	public getPlayersThatLeftWithNoUnitsOrCities(): player[] {
		let players: player[] = [];
		// Find all slots that are eliminated players with no units
		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player = Player(i);

			// Ignore observers
			if (IsPlayerObserver(player)) {
				this._observerFromHandle.set(player, new HumanPlayer(player));
				continue;
			}

			// Only consider players that have left
			if (GetPlayerSlotState(player) != PLAYER_SLOT_STATE_LEFT) {
				continue;
			}

			// Ensure the player is tracked and has no units or cities
			const activePlayer = PlayerManager.getInstance().players.get(player);
			if (!activePlayer) {
				continue;
			}

			// If the player has no units and no cities, consider them for client allocation
			debugPrint(
				`Player ${GetPlayerId(player)} has left. Units: ${activePlayer.trackedData.units.size}, Cities: ${activePlayer.trackedData.cities.cities.length}`
			);

			if (activePlayer.trackedData.units.size === 0 && activePlayer.trackedData.cities.cities.length === 0) {
				debugPrint(`Player ${GetPlayerId(player)} added to left players list for potential client allocation.`);
				players.push(player);
			} else {
				debugPrint(`Player ${GetPlayerId(player)} not added to left players list (has units or cities).`);
			}
		}
		return players;
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

	/**
	 * Get only human players (excludes AI/Computer players)
	 * Used for P2P rating synchronization to exclude Computer players
	 * @returns Array of human ActivePlayer objects
	 */
	public getHumanPlayersOnly(): ActivePlayer[] {
		return Array.from(this._playerFromHandle.values()).filter((p: ActivePlayer) => {
			const controller = GetPlayerController(p.getPlayer());
			return controller === MAP_CONTROL_USER;
		});
	}

	public getHumanPlayersCount(): number {
		return this.getHumanPlayers().length;
	}

	/**
	 * Captures the current human player count as the initial lobby count.
	 * Must be called before any player cleanup/removal occurs.
	 */
	public captureInitialHumanPlayerCount(): void {
		this._initialHumanPlayerCount = this.getHumanPlayersCount();
	}

	/**
	 * Returns the initial human player count captured before cleanup.
	 * Falls back to current count if not yet captured.
	 */
	public getInitialHumanPlayerCount(): number {
		return this._initialHumanPlayerCount > 0 ? this._initialHumanPlayerCount : this.getHumanPlayersCount();
	}

	public isObserver(player: player) {
		return this._observerFromHandle.has(player);
	}

	public get players(): Map<player, ActivePlayer> {
		return this._playerFromHandle;
	}

	public get playerControllers(): Map<player, mapcontrol> {
		return this._playerControllerHandle;
	}

	public setObserver(player: player) {
		this._observerFromHandle.set(player, new HumanPlayer(player));
	}

	public get activePlayers(): Map<player, ActivePlayer> {
		return new Map(Array.from(this._playerFromHandle));
	}

	public get activePlayersThatAreAlive(): Map<player, ActivePlayer> {
		return new Map(Array.from(this._playerFromHandle).filter(([key, value]) => value.status.isActive()));
	}

	public get activePlayersThatHaveNotLeft(): Map<player, ActivePlayer> {
		return new Map(Array.from(this._playerFromHandle).filter(([key, value]) => !value.status.isLeft()));
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

	public getHost(): ActivePlayer | undefined {
		for (const [, value] of this._playerFromHandle) {
			if (value.getPlayer() === Player(0)) {
				return value;
			}
		}

		return undefined;
	}
}
