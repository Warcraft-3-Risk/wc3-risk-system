/**
 * Service for managing fog state for players in a game.
 */
export class FogManager {
	private static instance: FogManager;

	private constructor() {}

	/**
	 * Gets the singleton instance of the CameraManager.
	 * @returns The singleton instance.
	 */
	public static getInstance() {
		if (this.instance == null) {
			this.instance = new FogManager();
		}
		return this.instance;
	}

	/**
	 * Activates the fog for all players.
	 * @param who - Unused, fog is always switched for everyone.
	 */
	public turnFogOn(who?: player) {
		FogEnable(true);
	}

	/**
	 * Deactivates the fog for all players.
	 * @param who - Unused, fog is always switched for everyone.
	 */
	public turnFogOff(who?: player) {
		FogEnable(false);
	}
}
