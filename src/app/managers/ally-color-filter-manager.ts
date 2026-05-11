import { SharedSlotManager } from '../game/services/shared-slot-manager';
import { PlayerManager } from '../player/player-manager';
import { UNIT_TYPE } from '../utils/unit-types';
import { NEUTRAL_HOSTILE } from '../utils/utils';
import { AllyColorState } from './alliances/ally-color-state';
import { CityToCountry } from '../country/country-map';

export class AllyColorFilterManager {
	private static instance: AllyColorFilterManager;
	private pollTimer: timer | undefined;

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

				for (const activePlayer of PlayerManager.getInstance().players.values()) {
					for (const u of activePlayer.trackedData.units) {
						this.applyColorFilter(u);
					}
				}

				for (const [city] of CityToCountry) {
					this.applyColorFilter(city.barrack.unit);
					this.applyColorFilter(city.cop);
					if (city.guard && city.guard.unit) {
						this.applyColorFilter(city.guard.unit);
					}
				}
			}
		});
	}

	public recalculate(): void {
		this.updateCache();
	}

	private updateCache(): void {
		const localPlayer = GetLocalPlayer();
		const localPlayerId = GetPlayerId(localPlayer);
		const activeLocalPlayer = PlayerManager.getInstance().players.get(localPlayer);
		const isColorBlind = activeLocalPlayer ? activeLocalPlayer.options.colorblind : false;
		const isColorContrast = activeLocalPlayer ? activeLocalPlayer.options.colorContrast : false;
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

			if (isColorContrast) {
				if (GetPlayerId(owner) === GetPlayerId(NEUTRAL_HOSTILE)) {
					tooltip = '|cFF888888';
				} else if (isLocalOwner) {
					tooltip = '|cFF0000FF';
				} else if (isAlly) {
					if (isColorBlind) {
						tooltip = '|cFFFFFF00';
					} else {
						tooltip = '|cFF00FFFF';
					}
				} else {
					tooltip = '|cFFFF0000';
				}
			}

			this.cache[i] = { color, red: r, green: g, blue: b, spawnRed: spawnR, spawnGreen: spawnG, spawnBlue: spawnB, tooltip };
		}
	}

	/**
	 * Applies the current ally color filter to a specific unit.
	 * Should be called whenever a unit is created, trained, unloaded, or changes ownership.
	 * @param u The unit to apply the color filter to.
	 */
	public applyColorFilter(u: unit): void {
		const owner = SharedSlotManager.getInstance().getOwnerOfUnit(u);
		const isLocalOwner = GetPlayerId(GetLocalPlayer()) === GetPlayerId(owner);
		const isSpawn = IsUnitType(u, UNIT_TYPE.SPAWN);
		const alpha = isLocalOwner && isSpawn ? 150 : 255;

		const playerId = GetPlayerId(owner);
		const cacheData = this.cache[playerId];

		if (cacheData) {
			if (isSpawn) {
				SetUnitVertexColor(u, cacheData.spawnRed, cacheData.spawnGreen, cacheData.spawnBlue, alpha);
			} else {
				SetUnitVertexColor(u, cacheData.red, cacheData.green, cacheData.blue, alpha);
			}
			SetUnitColor(u, cacheData.color);
		}
	}

	/**
	 * Returns a hex color string (e.g., '|cFF0000FF') corresponding to the unit's
	 * high contrast color if the filter is active and applies. Otherwise returns undefined.
	 */
	public getTooltipColorHex(u: unit): string | undefined {
		const owner = SharedSlotManager.getInstance().getOwnerOfUnit(u);
		const playerId = GetPlayerId(owner);
		const cacheData = this.cache[playerId];
		if (cacheData) {
			return cacheData.tooltip;
		}

		return undefined;
	}
}
