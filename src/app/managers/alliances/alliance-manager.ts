import { GetRandomElements } from '../../utils/utils';
import { Alliance } from './alliance';

export class AllianceManager {
	private static _instance: AllianceManager;
	private _alliances: Map<player | number, Alliance>;

	private constructor() {
		this._alliances = new Map<player | number, Alliance>();

		SetMapFlag(MAP_LOCK_ALLIANCE_CHANGES, false);

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			//Remove all non playing players and observers.
			if (!this.isValidPlayer(Player(i))) continue;

			const player: player = Player(i);
			const teamNumber: number = GetPlayerTeam(player);

			//If the alliance number already exists, add the player. Otherwise, create a new Alliance and add the player
			if (this._alliances.has(teamNumber)) {
				this._alliances.set(player, this._alliances.get(teamNumber));
				this._alliances.get(player).add(player);
			} else {
				const alliance = new Alliance(teamNumber);

				this._alliances.set(teamNumber, alliance);
				this._alliances.set(player, alliance);
				this._alliances.get(player).add(player);
			}
		}

		if (this._alliances.size <= 1) {
			this.clearAlliances();
		}

		SetMapFlag(MAP_LOCK_ALLIANCE_CHANGES, true);
	}

	public static getInstance(): AllianceManager {
		if (this._instance == null) {
			this._instance = new AllianceManager();
		}

		return this._instance;
	}

	/**
	 * Performs a two way alliance check.
	 * @param playerA the first player to check
	 * @param playerB the second player to check
	 * @returns true if the players are allied to each other or the same player, false otherwise.
	 */
	public isCoAllied(playerA: player, playerB: player): boolean {
		if (playerA == playerB) return true;

		if (this.isAllied(playerA, playerB)) {
			if (this.isAllied(playerB, playerA)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Performs a one way alliance check.
	 * @param playerA The player that is being checked
	 * @param playerB The player that is checked against
	 * @returns true if player A is allied to Player B, false otherwise.
	 */
	public isAllied(playerA: player, playerB: player): boolean {
		return GetPlayerAlliance(playerA, playerB, ALLIANCE_PASSIVE);
	}

	/**
	 * Removes all alliances and makes all players enemies of each other.
	 */
	public clearAlliances(): void {
		this._alliances.forEach((val: Alliance, key: number | player) => {
			val.disband();
			val = null;

			if (typeof key !== 'number') {
				SetPlayerTeam(key, GetPlayerId(key));
			}
		});

		this._alliances.clear();
		ClearTextMessages();
	}

	/**
	 * Randomly generates a set number of alliances using the active players and computers in game.
	 * @param numberOfAlliances The number of alliances to generate
	 */
	public generateAlliances(numberOfAlliances: number): void {
		const players: player[] = [];
		const extraSlots: player[] = [];

		this.clearAlliances();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const p: player = Player(i);

			if (IsPlayerObserver(p)) continue;

			if (GetPlayerController(p) == MAP_CONTROL_USER) {
				players.push(p);
			} else if (GetPlayerController(p) == MAP_CONTROL_COMPUTER) {
				extraSlots.push(p);
			}
		}

		if (numberOfAlliances >= players.length) {
			numberOfAlliances = players.length;
		}

		const allianceSize: number = players.length / numberOfAlliances;

		for (let i = 0; i < numberOfAlliances; i++) {
			const alliancePlayers: player[] = GetRandomElements(players, allianceSize);
			this.newAlliance(alliancePlayers);
		}

		if (players.length > 0) {
			//TODO create team with computer buffers, wait is this okay already? seems so, needs tested 7/1/2023
			print('Hey, you forgot to code team generation in alliances!');
			let buffersNeeded: number = Math.min(allianceSize - players.length, extraSlots.length);

			for (let i = 0; i < buffersNeeded; i++) {
				players.push(extraSlots[i]);
			}

			this.newAlliance(players);
		}
	}

	/**
	 * Creates a new alliance consisting of the players passed in.
	 * @param players The players to add to the alliance
	 * @returns a new Alliance
	 */
	private newAlliance(players: player[]): Alliance {
		const teamNumber: number = GetPlayerTeam(players[0]);
		const alliance = new Alliance(teamNumber, players);

		this._alliances.set(teamNumber, alliance);

		players.forEach((player) => {
			this._alliances.set(player, alliance);
			this._alliances.get(player).add(player);
		});

		return alliance;
	}

	/**
	 * Checks if a player is valid in terms of being in an Alliance.
	 * @param player The player to check
	 * @returns true if they are playing and not an observer
	 */
	private isValidPlayer(player: player): boolean {
		if (GetPlayerSlotState(player) != PLAYER_SLOT_STATE_PLAYING) return false; // Only consider active slots (human/computers)
		if (IsPlayerObserver(player)) return false; // Do not consider obs
		return true;
	}
}
