import { PLAYER_COLOR_CODES_MAP, PLAYER_COLOR_MAP } from 'src/app/utils/player-colors';
import { PlayerNames } from './player-names';
import { isNonEmptySubstring } from 'src/app/utils/utils';

type Names = 'btag' | 'acct' | 'color' | 'country' | 'obs';

/**
 * Singleton class responsible for managing player names.
 */
export class NameManager {
	private static instance: NameManager;

	private names: Map<player, PlayerNames>;
	private originalColors: Map<player, playercolor>;

	/**
	 * Private constructor to ensure singleton pattern.
	 */
	private constructor() {
		this.names = new Map<player, PlayerNames>();
		this.originalColors = new Map<player, playercolor>();

		for (let i = 0; i < bj_MAX_PLAYER_SLOTS; i++) {
			const p: player = Player(i);

			this.names.set(p, new PlayerNames(GetPlayerName(p), PLAYER_COLOR_CODES_MAP.get(GetPlayerColor(p))));
			SetPlayerName(p, 'Player');
		}
	}

	/**
	 * @returns The singleton instance of NameManager.
	 */
	public static getInstance() {
		if (this.instance === undefined) {
			this.instance = new NameManager();
		}

		return this.instance;
	}

	private static readonly COLOR_ALIASES: Map<string, string> = new Map([
		['dg', 'dark green'],
		['lb', 'light blue'],
	]);

	/**
	 * Resolves color aliases (e.g. "dg" -> "dark green") and returns the resolved search string.
	 */
	private resolveColorAlias(input: string): string {
		return NameManager.COLOR_ALIASES.get(input.toLowerCase().trim()) ?? input;
	}

	/**
	 * Finds players matching the search string by color or btag.
	 * Uses exact color match first; falls back to substring if no exact match is found.
	 * Skips shared slots.
	 */
	private findPlayersByName(search: string, filter?: (p: player) => boolean): player[] {
		// Lazy import to avoid circular dependency (SharedSlotManager imports NameManager)
		const { SharedSlotManager } = require('src/app/game/services/shared-slot-manager') as {
			SharedSlotManager: typeof import('src/app/game/services/shared-slot-manager').SharedSlotManager;
		};

		const resolved = this.resolveColorAlias(search);
		const resolvedLower = resolved.toLowerCase().trim();

		const exactColorMatches: player[] = [];
		const substringMatches: player[] = [];

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const p = Player(i);

			if (GetPlayerSlotState(p) !== PLAYER_SLOT_STATE_PLAYING) continue;
			if (SharedSlotManager.getInstance().getPlayerBySharedSlot(p) !== undefined) continue;
			if (filter && !filter(p)) continue;

			const color = this.getColor(p);
			if (color && color.toLowerCase().trim() === resolvedLower) {
				exactColorMatches.push(p);
			} else if (isNonEmptySubstring(resolved, color)) {
				substringMatches.push(p);
			}

			if (isNonEmptySubstring(resolved, this.getBtag(p))) {
				if (!exactColorMatches.includes(p) && !substringMatches.includes(p)) {
					substringMatches.push(p);
				}
			}
		}

		return exactColorMatches.length > 0 ? exactColorMatches : substringMatches;
	}

	/**
	 * Searches for players by color name or BattleTag.
	 * Exact color match takes priority over substring matches.
	 */
	public getPlayersByAnyName(string: string): player[] {
		return this.findPlayersByName(string);
	}

	/**
	 * Searches for allied players by color name or BattleTag.
	 * Exact color match takes priority over substring matches.
	 */
	public getAllyPlayersByAnyName(string: string, sender: player): player[] {
		return this.findPlayersByName(string, (p) => IsPlayerAlly(sender, p));
	}

	/**
	 * Gets a player by BattleTag substring.
	 * @param string - The BattleTag substring to search for.
	 * @returns The player object if found, undefined otherwise.
	 */
	public getPlayerFromBtag(string: string): player | undefined {
		// Lazy import to avoid circular dependency (SharedSlotManager imports NameManager)
		const { SharedSlotManager } = require('src/app/game/services/shared-slot-manager') as {
			SharedSlotManager: typeof import('src/app/game/services/shared-slot-manager').SharedSlotManager;
		};

		let result: player = undefined;

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player = Player(i);

			if (GetPlayerSlotState(player) !== PLAYER_SLOT_STATE_PLAYING) continue;
			if (SharedSlotManager.getInstance().getPlayerBySharedSlot(player) !== undefined) continue;

			if (isNonEmptySubstring(string, this.getBtag(player))) {
				result = player;
			}
		}

		return result;
	}

	/**
	 * Sets the name of a player based on a specified type ('btag', 'acct', 'color', 'country').
	 * @param p - The player object.
	 * @param name - The type of name to set.
	 */
	public setName(p: player, name: Names) {
		switch (name) {
			case 'btag':
				this.names.get(p).displayName = `${PLAYER_COLOR_CODES_MAP.get(this.getOriginalColor(p))}${this.names.get(p).btag}|r`;
				break;
			case 'acct':
				this.names.get(p).displayName = `${PLAYER_COLOR_CODES_MAP.get(this.getOriginalColor(p))}${this.names.get(p).acct}|r`;
				break;
			case 'color':
				this.names.get(p).displayName = `${PLAYER_COLOR_CODES_MAP.get(this.getOriginalColor(p))}${this.names.get(p).color}|r`;
				break;
			case 'country':
				this.names.get(p).displayName = `${PLAYER_COLOR_CODES_MAP.get(this.getOriginalColor(p))}${this.names.get(p).country}|r`;
				break;
			case 'obs':
				this.names.get(p).displayName =
					`${PLAYER_COLOR_CODES_MAP.get(this.getOriginalColor(p))}${this.names.get(p).color} (${this.names.get(p).acct})|r`;
				break;
			default:
				break;
		}

		this.names.get(p).displayColorCode = PLAYER_COLOR_CODES_MAP.get(this.getOriginalColor(p));
		SetPlayerName(p, this.names.get(p).displayName);
	}

	/**
	 * @param p - The player object.
	 * @returns The display name of the player, including color codes.
	 */
	public getDisplayName(p: player): string {
		return this.names.get(p).displayName;
	}

	/**
	 * @param p - The player object.
	 * @returns The BattleTag of the player.
	 */
	public getBtag(p: player): string {
		return this.names.get(p).btag;
	}

	/**
	 * @param p - The player object.
	 * @returns The account name of the player.
	 */
	public getAcct(p: player): string {
		return this.names.get(p).acct;
	}

	/**
	 * @param p - The player object.
	 * @returns The color name of the player.
	 */
	public getColorCode(p: player): string {
		return `${PLAYER_COLOR_CODES_MAP.get(GetPlayerColor(p))}`;
	}

	/**
	 * @param p - The player object.
	 * @returns The color name of the player.
	 */
	public getColor(p: player): string {
		return this.names.get(p).color;
	}

	/**
	 * @param p - The player object.
	 * @returns The original playercolor from the first setColor call (after randomization), before shared-slot-manager overrides.
	 */
	public getOriginalColor(p: player): playercolor {
		return this.originalColors.get(p) ?? GetPlayerColor(p);
	}

	/**
	 * @param p - The player object.
	 * @returns The color code string for the player's original color.
	 */
	public getOriginalColorCode(p: player): string {
		return `${PLAYER_COLOR_CODES_MAP.get(this.getOriginalColor(p))}`;
	}

	/**
	 * @param p - The player object.
	 * @returns The color name for the player's original color.
	 */
	public getOriginalColorName(p: player): string {
		return PLAYER_COLOR_MAP.get(this.getOriginalColor(p));
	}

	/**
	 * Clears stored original colors so the next setColor call captures new originals.
	 * Should be called on game reset before colors are re-randomized.
	 */
	public resetOriginalColors(): void {
		this.originalColors.clear();
	}

	public setColor(p: player, color: playercolor): void {
		if (!this.originalColors.has(p)) {
			this.originalColors.set(p, color);
		}

		const colorName: string = PLAYER_COLOR_MAP.get(color);

		SetPlayerColor(p, color);

		this.names.get(p).color = colorName;
	}

	/**
	 * Copies the display name and color code from a source player to a target slot.
	 * Used to sync shared slot names with their real owner.
	 */
	public copyDisplayNameToSlot(slot: player, sourcePlayer: player): void {
		const source = this.names.get(sourcePlayer);
		const target = this.names.get(slot);
		target.displayName = source.displayName;
		target.displayColorCode = source.displayColorCode;
		SetPlayerName(slot, source.displayName);
	}

	/**
	 * @returns The display color code of the player.
	 */
	public getDisplayColorCode(p: player): string {
		return this.names.get(p).displayColorCode;
	}

	/**
	 * Sets the country of a player.
	 * @param p - The player object.
	 * @param country - The new country name.
	 */
	public setCountry(p: player, country: string): void {
		this.names.get(p).country = country;
	}

	/**
	 * @param p - The player object.
	 * @returns The country name of the player.
	 */
	public getCountry(p: player): string {
		return this.names.get(p).country;
	}
}
