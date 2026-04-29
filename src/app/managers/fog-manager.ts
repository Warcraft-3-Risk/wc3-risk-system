import { City } from '../city/city';

/**
 * Service for managing fog state for players in a game.
 */
export class FogManager {
	private _fog: Map<player, fogmodifier>;
	private static instance: FogManager;

	private constructor() {
		this._fog = new Map<player, fogmodifier>();
	}

	/**
	 * Gets the singleton instance of the CameraManager.
	 * @returns The singleton instance.
	 */
	public static getInstance() {
		if (this.instance === undefined) {
			this.instance = new FogManager();
		}
		return this.instance;
	}

	/**
	 * Includes a player for fog state tracking and control.
	 * @param who - The player to manage.
	 */
	public add(who: player) {
		// if (this._fog.has(who)) {
		// 	return;
		// }
		// this._fog.set(who, CreateFogModifierRect(who, FOG_OF_WAR_VISIBLE, GetPlayableMapRect(), true, false));
	}

	/**
	 * Stops managing the fog state for a specific player.
	 * @param who - The player to remove from management.
	 */
	public remove(who: player) {
		// DestroyFogModifier(this._fog.get(who));
		// this._fog.delete(who);
	}

	/**
	 * Activates the fog for all or a specific player.
	 * If a player is provided, fog will be activated for that player only.
	 * Does not affect observers.
	 * @param who - Optional: specific player to activate fog for.
	 */
	public turnFogOn(who?: player) {
		FogEnable(true);
		// if (who && !IsPlayerObserver(who)) {
		// 	return FogModifierStop(this._fog.get(who));
		// }

		// this._fog.forEach((fog, player) => {
		// 	if (IsPlayerObserver(player)) {
		// 		return;
		// 	}
		// 	FogModifierStop(fog);
		// });
	}

	/**
	 * Deactivates the fog for all or a specific player.
	 * If a player is provided, fog will be deactivated for that player only.
	 * @param who - Optional: specific player to deactivate fog for.
	 */
	public turnFogOff(who?: player) {
		FogEnable(false);
		this.removeBlackMask();
		// if (who) {
		// 	return FogModifierStart(this._fog.get(who));
		// }

		// this._fog.forEach((fog) => {
		// 	FogModifierStart(fog);
		// });
	}

	private _maskModifiers: fogmodifier[] = []; // Persistent black mask modifiers
	private static readonly CITY_MASK_RADIUS = 400; // Radius around each city to black mask

	/**
	 * Applies black mask around each city location for all active players.
	 * The rest of the map remains partially visible (fogged).
	 * Flow: mask entire map → set entire map to fogged (explored) → re-mask only city areas.
	 * @param players - The active player handles to mask.
	 * @param cities - All cities to mask around.
	 */
	public applyBlackMask(players: player[], cities: City[]): void {
		FogMaskEnable(true);

		const worldBounds = GetWorldBounds();
		for (const p of players) {
			// First, reset everything to masked (undo startup exploration)
			SetFogStateRect(p, FOG_OF_WAR_MASKED, worldBounds, true);
			// Then set everything to fogged (partially visible) so terrain is shown
			SetFogStateRect(p, FOG_OF_WAR_FOGGED, worldBounds, true);

			// Now black mask only the area around each city
			for (const city of cities) {
				const x = city.barrack.defaultX;
				const y = city.barrack.defaultY;
				SetFogStateRadius(p, FOG_OF_WAR_MASKED, x, y, FogManager.CITY_MASK_RADIUS, true);
			}
		}
	}

	/**
	 * Removes all persistent black mask modifiers, restoring normal fog behavior.
	 */
	public removeBlackMask(): void {
		for (const mod of this._maskModifiers) {
			FogModifierStop(mod);
			DestroyFogModifier(mod);
		}
		this._maskModifiers = [];

		// Force-reveal all masked areas for every player so nothing stays black
		const worldBounds = GetWorldBounds();
		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			SetFogStateRect(Player(i), FOG_OF_WAR_VISIBLE, worldBounds, true);
		}

		FogMaskEnable(false);
	}
}
