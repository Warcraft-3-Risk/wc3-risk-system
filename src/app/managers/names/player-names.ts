export class PlayerNames {
	private readonly _btag: string;
	private readonly _acct: string;
	private _color: string;

	/**
	 * Initializes the BattleTag and account name based on the provided name.
	 * @param name - The name to be processed.
	 */
	constructor(name: string) {
		const splitName = name.split(' ')[0];

		if (splitName === 'Computer' || splitName === 'Local') {
			const uniqueId = '#' + Math.floor(Math.random() * 10000);

			this._btag = `${splitName}${uniqueId}`;
		} else {
			this._btag = splitName;
		}

		this._acct = this._btag.split('#')[0];
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
}
