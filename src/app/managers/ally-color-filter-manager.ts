import { SharedSlotManager } from '../game/services/shared-slot-manager';
import { PlayerManager } from '../player/player-manager';
import { UNIT_TYPE } from '../utils/unit-types';
import { NEUTRAL_HOSTILE } from '../utils/utils';
import { AllyColorState } from './alliances/ally-color-state';
import { CityToCountry } from '../country/country-map';
import { NameManager } from './names/name-manager';

type ColorFilterCity = { barrack: { unit: unit }; cop: unit; guard?: { unit?: unit } };

export class AllyColorFilterManager {
	private static instance: AllyColorFilterManager;
	private pollTimer: timer | undefined;
	private seenCityOwners: Map<ColorFilterCity, player> = new Map();

	private cache: {
		color: playercolor;
		red: number;
		green: number;
		blue: number;
		spawnRed: number;
		spawnGreen: number;
		spawnBlue: number;
		tooltip?: string;
	}[] = [];

	public static getInstance(): AllyColorFilterManager {
		if (!this.instance) {
			this.instance = new AllyColorFilterManager();
		}
		return this.instance;
	}

	private constructor() {
		this.recalculate();
	}

	public startPolling(): void {
		if (this.pollTimer) return;

		let lastColorMode = -1;
		let lastColorBlind = false;
		let lastColorContrast = false;

		this.pollTimer = CreateTimer();
		TimerStart(this.pollTimer, 0.05, true, () => {
			const nativeMode = GetAllyColorFilterState();
			if (nativeMode > 0) {
				SetAllyColorFilterState(0);

				const state = AllyColorState.getInstance();
				state.toggle();

				const mode = state.getMode();
				if (mode === 0) print('Ally Color Filter: |cff00ff00Off|r');
				else if (mode === 1) print('Ally Color Filter: |cffffff00Minimap Only|r');
				else print('Ally Color Filter: |cffff0000On|r');
			}

			const customMode = AllyColorState.getInstance().getMode();
			const activeLocalPlayer = PlayerManager.getInstance().players.get(GetLocalPlayer());
			const isColorBlind = activeLocalPlayer ? activeLocalPlayer.options.colorblind : false;
			const isColorContrast = activeLocalPlayer ? activeLocalPlayer.options.colorContrast : false;

			if (customMode !== lastColorMode || isColorBlind !== lastColorBlind || isColorContrast !== lastColorContrast) {
				lastColorMode = customMode;
				lastColorBlind = isColorBlind;
				lastColorContrast = isColorContrast;

				this.recalculate();
				this.applyPlayerColorFilter();

				for (const activePlayer of PlayerManager.getInstance().players.values()) {
					for (const u of activePlayer.trackedData.units) {
						this.applyColorFilter(u);
					}
					for (const u of activePlayer.trackedData.transports) {
						this.applyColorFilter(u);
					}
				}

				for (const [city] of CityToCountry) {
					this.applyCityColorFilter(city);
				}
			}
		});
	}

	public markCitySeen(city: ColorFilterCity, owner: player): void {
		this.seenCityOwners.set(city, owner);
	}

	public clearSeenCityCache(): void {
		this.seenCityOwners.clear();
	}

	public applyCityColorFilter(city: ColorFilterCity): void {
		const localPlayer = GetLocalPlayer();
		const guardUnit = city.guard?.unit;
		const isVisible =
			IsUnitVisible(city.barrack.unit, localPlayer) || IsUnitVisible(city.cop, localPlayer) || (guardUnit && IsUnitVisible(guardUnit, localPlayer));

		if (isVisible) {
			const owner = SharedSlotManager.getInstance().getOwnerOfUnit(city.barrack.unit);
			this.markCitySeen(city, owner);
			this.applyColorFilter(city.barrack.unit);
			this.applyColorFilter(city.cop);
			if (guardUnit) {
				this.applyColorFilter(guardUnit);
			}
			return;
		}

		const lastSeenOwner = this.seenCityOwners.get(city);
		if (!lastSeenOwner) {
			return;
		}

		this.applyColorFilterForOwner(city.barrack.unit, lastSeenOwner);
		this.applyColorFilterForOwner(city.cop, lastSeenOwner);
		if (guardUnit) {
			this.applyColorFilterForOwner(guardUnit, lastSeenOwner);
		}
	}

	public recalculate(): void {
		this.updateCache();
	}

	private setPlayerColorLocally(client: player, affectedPlayer: player, color: playercolor): void {
		if (GetLocalPlayer() === client && GetPlayerColor(affectedPlayer) !== color) {
			SetPlayerColor(affectedPlayer, color);
		}
	}

	public applyPlayerColorFilter(): void {
		const allyColorState = AllyColorState.getInstance();
		const mode = allyColorState.getMode();
		const localPlayer = GetLocalPlayer();
		const activeLocalPlayer = PlayerManager.getInstance().players.get(localPlayer);
		const isColorBlind = activeLocalPlayer ? activeLocalPlayer.options.colorblind : false;
		const nameManager = NameManager.getInstance();

		for (let i = 0; i < bj_MAX_PLAYER_SLOTS; i++) {
			const rawOwner = Player(i);
			const owner = SharedSlotManager.getInstance().getOwner(rawOwner);
			const color = mode === 2 ? allyColorState.getUnitModelColor(owner, localPlayer, isColorBlind) : nameManager.getOriginalColor(owner);

			this.setPlayerColorLocally(localPlayer, rawOwner, color);
		}
	}

	private updateCache(): void {
		const localPlayer = GetLocalPlayer();
		const localPlayerId = GetPlayerId(localPlayer);
		const activeLocalPlayer = PlayerManager.getInstance().players.get(localPlayer);
		const isColorBlind = activeLocalPlayer?.options?.colorblind ?? false;
		const isColorContrast = activeLocalPlayer?.options?.colorContrast ?? false;
		const allyColorState = AllyColorState.getInstance();
		const mode = allyColorState.getMode();

		for (let i = 0; i < bj_MAX_PLAYER_SLOTS; i++) {
			const owner = Player(i);
			const isLocalOwner = localPlayerId === i;
			const isAlly = IsPlayerAlly(localPlayer, owner);
			const unitModelColor = allyColorState.getUnitModelColor(owner, localPlayer, isColorBlind);

			let r = 255,
				g = 255,
				b = 255;
			let spawnR = 255,
				spawnG = 255,
				spawnB = 255;
			let color = unitModelColor;
			let tooltip: string | undefined = undefined;

			if (isColorContrast) {
				if (GetPlayerId(owner) === GetPlayerId(NEUTRAL_HOSTILE)) {
					r = 0;
					g = 0;
					b = 0;
					spawnR = 0;
					spawnG = 0;
					spawnB = 0;
					color = GetPlayerColor(owner);
				} else if (isLocalOwner) {
					r = 0;
					g = 0;
					b = 255;
					spawnR = 0;
					spawnG = 0;
					spawnB = 255;
					color = unitModelColor; // Blue
				} else if (isAlly) {
					if (isColorBlind) {
						r = 255;
						g = 255;
						b = 0;
						spawnR = 255;
						spawnG = 255;
						spawnB = 0;
						color = ConvertPlayerColor(4); // Yellow
					} else {
						r = 0;
						g = 255;
						b = 255;
						spawnR = 0;
						spawnG = 255;
						spawnB = 255;
						color = unitModelColor; // Teal
					}
				} else {
					r = 255;
					g = 50;
					b = 50;
					spawnR = 255;
					spawnG = 50;
					spawnB = 50;
					color = unitModelColor; // Red
				}
			} else {
				if (isLocalOwner) {
					spawnR = 200;
					spawnG = 200;
					spawnB = 200;
				}
			}

			if (this.shouldUseRelationshipTextColor(mode, isColorContrast)) {
				tooltip = this.getRelationshipTextColorHex(owner, localPlayer, isColorBlind);
			}

			this.cache[i] = { color, red: r, green: g, blue: b, spawnRed: spawnR, spawnGreen: spawnG, spawnBlue: spawnB, tooltip };
		}
	}

	private shouldUseRelationshipTextColor(mode: number, isColorContrast: boolean): boolean {
		return mode === 2 || isColorContrast;
	}

	private isNeutralOwner(owner: player): boolean {
		const ownerId = GetPlayerId(owner);
		return ownerId >= bj_MAX_PLAYERS || ownerId === GetPlayerId(NEUTRAL_HOSTILE);
	}

	private getRelationshipTextColorHex(owner: player, localPlayer: player, isColorBlind: boolean): string {
		if (this.isNeutralOwner(owner)) {
			return '|cFF888888';
		}
		if (GetPlayerId(owner) === GetPlayerId(localPlayer)) {
			return '|cFF0000FF';
		}
		if (IsPlayerAlly(localPlayer, owner)) {
			return isColorBlind ? '|cFFFFFF00' : '|cFF00FFFF';
		}
		return '|cFFFF0000';
	}

	/**
	 * Applies the current ally color filter to a specific unit.
	 * Should be called whenever a unit is created, trained, unloaded, or changes ownership.
	 * @param u The unit to apply the color filter to.
	 */
	public applyColorFilter(u: unit): void {
		const owner = SharedSlotManager.getInstance().getOwnerOfUnit(u);
		this.applyColorFilterForOwner(u, owner);
	}

	private applyColorFilterForOwner(u: unit, owner: player): void {
		const isLocalOwner = GetPlayerId(GetLocalPlayer()) === GetPlayerId(owner);
		const isSpawn = IsUnitType(u, UNIT_TYPE.SPAWN);
		const alpha = isLocalOwner && isSpawn ? 150 : 255;

		const playerId = GetPlayerId(owner);
		const cacheData = this.cache[playerId];

		if (cacheData) {
			// Player colors are assigned after this manager is constructed, so normal
			// color modes must read the live engine color instead of the startup cache.
			const mode = AllyColorState.getInstance().getMode();
			const unitColor = mode === 2 ? cacheData.color : GetPlayerColor(owner);

			if (isSpawn) {
				SetUnitVertexColor(u, cacheData.spawnRed, cacheData.spawnGreen, cacheData.spawnBlue, alpha);
			} else {
				SetUnitVertexColor(u, cacheData.red, cacheData.green, cacheData.blue, alpha);
			}
			SetUnitColor(u, unitColor);
		}
	}

	/**
	 * Returns a hex color string (e.g., '|cFF0000FF') for UI text that should
	 * follow the local player's ally-color relationship view.
	 */
	public getPlayerColorHex(owner: player): string | undefined {
		const localPlayer = GetLocalPlayer();
		const activeLocalPlayer = PlayerManager.getInstance().players.get(localPlayer);
		const isColorBlind = activeLocalPlayer?.options?.colorblind ?? false;
		const isColorContrast = activeLocalPlayer?.options?.colorContrast ?? false;
		const mode = AllyColorState.getInstance().getMode();

		if (!this.shouldUseRelationshipTextColor(mode, isColorContrast)) {
			return undefined;
		}

		return this.getRelationshipTextColorHex(owner, localPlayer, isColorBlind);
	}

	/**
	 * Returns a hex color string (e.g., '|cFF0000FF') corresponding to the unit's
	 * ally-color text color if the filter is active and applies. Otherwise returns undefined.
	 */
	public getTooltipColorHex(u: unit): string | undefined {
		return this.getPlayerColorHex(SharedSlotManager.getInstance().getOwnerOfUnit(u));
	}
}
