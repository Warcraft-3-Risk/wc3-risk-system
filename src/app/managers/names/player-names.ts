export class PlayerNames {
	private readonly btag: string;
	private readonly acct: string;
	private color: string;

	/**
	 * Initializes the BattleTag and account name based on the provided name.
	 * @param name - The name to be processed.
	 */
	constructor(name: string) {
		const splitName = name.split(' ')[0];

		if (splitName === 'Computer' || splitName === 'Local') {
			const uniqueId = '#' + Math.floor(Math.random() * 10000);

			this.btag = `${splitName}${uniqueId}`;
		} else {
			this.btag = splitName;
		}

		this.acct = this.btag.split('#')[0];
	}

	/**
	 * @returns The BattleTag of the player.
	 */
	public getBtag() {
		return this.btag;
	}

	/**
	 * @returns The account name of the player.
	 */
	public getAcct() {
		return this.acct;
	}

	/**
	 * Sets the color name for the player.
	 * @param color - The new color name.
	 */
	public setColor(color: string) {
		this.color = color;
	}

	/**
	 * @returns The color name of the player.
	 */
	public getColor() {
		return this.color;
	}
}
