import { PLAYER_COLOR_CODES_MAP, PLAYER_COLOR_MAP } from 'src/app/utils/player-colors';
import { PlayerNames } from './player-names';
import { isNonEmptySubstring } from 'src/app/utils/utils';

type Names = 'btag' | 'acct' | 'color';

/**
 * Singleton class responsible for managing player names.
 */
export class NameManager {
	private static instance: NameManager;

	private names: Map<player, PlayerNames>;

	/**
	 * Private constructor to ensure singleton pattern.
	 */
	private constructor() {
		this.names = new Map<player, PlayerNames>();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const p: player = Player(i);

			this.names.set(p, new PlayerNames(GetPlayerName(p)));
			SetPlayerName(p, 'Player');
		}
	}

	/**
	 * @returns The singleton instance of NameManager.
	 */
	public static getInstance() {
		if (this.instance == null) {
			this.instance = new NameManager();
		}

		return this.instance;
	}

	/**
	 * Searches for players by a substring match of their name, color, or BattleTag.
	 * @param string - The string to search for.
	 * @returns Array of player objects that match the criteria.
	 */
	public getPlayersByAnyName(string: string): player[] {
		const foundPlayers: player[] = [];

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player = Player(i);

			if (GetPlayerSlotState(player) != PLAYER_SLOT_STATE_PLAYING) continue;

			if (isNonEmptySubstring(string, this.getColor(player))) {
				foundPlayers.push(player);
			}

			if (isNonEmptySubstring(string, this.getBtag(player))) {
				foundPlayers.push(player);
			}
		}

		return foundPlayers;
	}

	/**
	 * Gets a player by BattleTag substring.
	 * @param string - The BattleTag substring to search for.
	 * @returns The player object if found, null otherwise.
	 */
	public getPlayerFromBtag(string: string): player | null {
		let result: player = null;

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player = Player(i);

			if (GetPlayerSlotState(player) != PLAYER_SLOT_STATE_PLAYING) continue;

			if (isNonEmptySubstring(string, this.getBtag(player))) {
				result = player;
			}
		}

		return result;
	}

	/**
	 * Sets the name of a player based on a specified type ('btag', 'acct', or 'color').
	 * @param p - The player object.
	 * @param name - The type of name to set.
	 */
	public setName(p: player, name: Names) {
		switch (name) {
			case 'btag':
				SetPlayerName(p, `${PLAYER_COLOR_CODES_MAP.get(GetPlayerColor(p))}${this.names.get(p).btag}|r`);
				break;

			case 'acct':
				SetPlayerName(p, `${PLAYER_COLOR_CODES_MAP.get(GetPlayerColor(p))}${this.names.get(p).acct}|r`);
				break;

			case 'color':
				SetPlayerName(p, `${PLAYER_COLOR_CODES_MAP.get(GetPlayerColor(p))}${this.names.get(p).color}|r`);
				break;

			default:
				break;
		}
	}

	/**
	 * @param p - The player object.
	 * @returns The display name of the player, including color codes.
	 */
	public getDisplayName(p: player) {
		return `${PLAYER_COLOR_CODES_MAP.get(GetPlayerColor(p))}${GetPlayerName(p)}|r`;
	}

	/**
	 * @param p - The player object.
	 * @returns The BattleTag of the player.
	 */
	public getBtag(p: player) {
		return this.names.get(p).btag;
	}

	/**
	 * @param p - The player object.
	 * @returns The account name of the player.
	 */
	public getAcct(p: player) {
		return this.names.get(p).acct;
	}

	/**
	 * @param p - The player object.
	 * @returns The color name of the player.
	 */
	public getColor(p: player) {
		return this.names.get(p).color;
	}

	/**
	 * Sets the color of a player.
	 * @param p - The player object.
	 * @param color - The new color.
	 */
	public setColor(p: player, color: playercolor) {
		const colorName: string = PLAYER_COLOR_MAP.get(color);

		SetPlayerColor(p, color);

		this.names.get(p).color = colorName;
	}
}
