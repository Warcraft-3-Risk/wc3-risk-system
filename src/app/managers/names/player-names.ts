/**
 * Responsible for storing and managing a player's names.
 */
export class PlayerNames {
	private _displayName: string;
	private readonly _btag: string;
	private readonly _acct: string;
	private _color: string;
	private _country?: string;
	private _displayColorCode?: string;

	/**
	 * Initializes the BattleTag and account name based on the provided name.
	 * @param name - The name to be processed.
	 */
	constructor(name: string, colorCode: string) {
		const splitName = name.split(' ')[0];

		if (splitName === 'Computer') {
			const uniqueId = '#' + Math.floor(Math.random() * 10000);

			this._btag = `${splitName}${uniqueId}`;
		} else if(splitName === 'Local') {
			const uniqueId = '#' + 1234;

			this._btag = `${splitName}${uniqueId}`;
		} else {
			this._btag = splitName;
		}

		this._acct = this._btag.split('#')[0];
		this._displayName = name;
		this._displayColorCode = colorCode;
	}

	/**
	 * @returns The BattleTag of the player.
	 */
	public get btag() {
		return this._btag;
	}

	/**
	 * @returns The account name of the player.
	 */
	public get acct() {
		return this._acct;
	}

	/**
	 * Sets the color name for the player.
	 * @param color - The new color name.
	 */
	public set color(color: string) {
		this._color = color;
	}

	/**
	 * @returns The color name of the player.
	 */
	public get color() {
		return this._color;
	}

	/**
	 * Sets the country name for the player.
	 * @param country - The new country code.
	 */
	public set country(country: string) {
		this._country = country;
	}

	/**
	 * @returns The country name of the player.
	 */
	public get country() {
		return this._country;
	}

	/**
	 * Sets the display name for the player.
	 * @param displayName - The new display name.
	 */
	public set displayName(displayName: string) {
		this._displayName = displayName;
	}

	/**
	 * @returns The display name of the player.
	 */
	public get displayName() {
		return this._displayName;
	}

	/**
	 * Sets the display color code for the player.
	 * @param displayColorCode - The new display color code.
	 */
	public set displayColorCode(displayColorCode: string) {
		this._displayColorCode = displayColorCode;
	}
	/**
	 * @returns The display color code of the player.
	 */
	public get displayColorCode() {
		return this._displayColorCode;
	}
}
