import { UNIT_TYPE } from '../utils/unit-types';
import { City } from '../city/city';
import { debugPrint } from '../utils/debug-print';
import { Wait } from '../utils/wait';
import { MinimapTrackedList } from '../utils/minimap-tracked-list-logic';
import { CityToCountry } from '../country/country-map';
import type { Spawner } from '../spawner/spawner';

interface CityIconRecord {
	city: City;
	iconFrame: framehandle;
	lastVisible: boolean | undefined;
	lastOwner: player | undefined;
	lastLastSeenOwner: player | undefined;
	lastColorMode: number | undefined;
}

/**
 * Draws the minimap ourselves: cities, moving units and spawner camouflage are rendered as frames
 * over the native minimap, and their native minimap icons are hidden.
 *
 * Only used in the promode modes (ProMode, Equalized). It stays completely inert until
 * {@link activate} is called from a promode state - every public entry point returns immediately
 * while inactive, so other modes keep the native minimap untouched and no frames, timers or
 * vertex colors are ever created for them.
 *
 * Cities keep fog-safe memory: an enemy city in fog keeps the color it was last seen with, and a
 * never-seen city stays gray, so ownership changes under fog are not revealed.
 */
export class MinimapIconManager {
	private static instance: MinimapIconManager;
	private cityIcons: Map<City, framehandle> = new Map();
	private cityRecords: CityIconRecord[] = [];
	private spawners: Spawner[] = [];
	private trackedList = new MinimapTrackedList<unit, framehandle, player>();
	private framePool: framehandle[] = []; // Pool of unused frames for recycling
	private lastSeenOwners: Map<City, player> = new Map(); // Remember last seen owner
	private updateTimer: timer;
	private isActive: boolean = false;
	private readonly COLOR_TEXTURES: string[] = []; // Pre-built texture path lookup table
	private cityLastTexture: Map<City, string> = new Map(); // Track last-applied texture per city frame
	private frameLastTexture: Map<framehandle, string> = new Map(); // Track last-applied texture per framehandle

	// Units unloaded from a transport are registered on a short delay - see registerAfterUnload()
	private delayedTrackQueue: unit[] = [];
	private delayedTrackTimer: timer;
	private delayedTrackTimerRunning: boolean = false;

	// Global color context, used to invalidate every unit's cached color when it changes
	private lastGlobalColorMode: number | undefined;
	private lastGlobalPovPlayer: player | undefined;

	private consoleUI: framehandle;
	private hudScale: number = 1.0;

	// Minimap constants (corner minimap dimensions)
	private readonly MINIMAP_WIDTH = 0.14; // Minimap width in screen coordinates
	private readonly MINIMAP_HEIGHT = 0.14; // Minimap height in screen coordinates
	private readonly BUILDING_ICON_SIZE = 0.004; // Icon size for cities
	private readonly UNIT_ICON_SIZE = 0.002; // Icon size for units
	private readonly INITIAL_POOL_SIZE = 2000; // Initial number of frames to create to avoid runtime spikes
	private readonly UNITS_PER_TICK = 200; // Throttle dynamic units processed per tick

	// State for adaptive unit tracking
	private currentUnitUpdateIndex: number = 0;

	// World bounds
	private worldMinX: number;
	private worldMinY: number;
	private worldWidth: number;
	private worldHeight: number;

	public static getInstance(): MinimapIconManager {
		if (!this.instance) {
			this.instance = new MinimapIconManager();
		}
		return this.instance;
	}

	// Deliberately does nothing - all setup happens in activate(), so merely referencing the
	// manager from shared code (spawner, guard, transports) never creates anything.
	private constructor() {}

	public isEnabled(): boolean {
		return this.isActive;
	}

	/**
	 * Switches the custom minimap on. Called once, from the first promode match; later calls are no-ops.
	 * Creates the city icons, update timer and frame pool, then primes every city and spawner
	 * under fog so their native fog memory never shows the owner's color.
	 */
	public activate(): void {
		if (this.isActive) return;

		this.isActive = true;

		// Pre-build texture path lookup table (eliminates per-tick string concatenation)
		for (let i = 0; i < 24; i++) {
			const str = i < 10 ? '0' + i : '' + i;
			this.COLOR_TEXTURES[i] = 'ReplaceableTextures\\TeamColor\\TeamColor' + str + '.blp';
		}
		this.COLOR_TEXTURES[90] = 'ReplaceableTextures\\TeamColor\\TeamColor90.blp'; // neutral gray
		this.COLOR_TEXTURES[99] = 'ReplaceableTextures\\TeamColor\\TeamColor99.blp'; // white (self)

		const worldBounds = GetWorldBounds();
		this.worldMinX = GetRectMinX(worldBounds);
		this.worldMinY = GetRectMinY(worldBounds);
		this.worldWidth = GetRectMaxX(worldBounds) - this.worldMinX;
		this.worldHeight = GetRectMaxY(worldBounds) - this.worldMinY;

		this.consoleUI = BlzGetFrameByName('ConsoleUIBackdrop', 0);
		this.delayedTrackTimer = CreateTimer();

		// Follow HUD scale changes so the icons stay aligned with the minimap
		let lastHudScale = -1;
		TimerStart(CreateTimer(), 0.1, true, () => {
			const currentScale = this.consoleUI ? BlzFrameGetWidth(this.consoleUI) / 0.8 : 1.0;

			if (currentScale !== lastHudScale && currentScale > 0) {
				lastHudScale = currentScale;
				this.hudScale = currentScale;
				this.repositionAllStaticIcons();
			}
		});

		const cities: City[] = Array.from(CityToCountry.keys());

		cities.forEach((city) => {
			this.createCityIcon(city);
		});
		this.registerSpawners(cities);

		debugPrint(`MinimapIconManager: Activated with ${this.cityIcons.size} city icons`);

		this.startUpdateTimer();
		this.expandPool(this.INITIAL_POOL_SIZE);

		// Start with Fog enabled so that the initial HideMinimap toggle respects the engine's fog state
		FogEnable(true);
		FogMaskEnable(true);

		const hiddenSpawns = new Set<unit>();
		CityToCountry.forEach((country, city) => {
			city.HideMinimap();
			const spawn = country.getSpawn();
			if (!hiddenSpawns.has(spawn.unit)) {
				spawn.HideMinimap();
				hiddenSpawns.add(spawn.unit);
			}
		});

		FogEnable(false);
		FogMaskEnable(false);
	}

	private registerSpawners(cities: City[]): void {
		this.spawners.length = 0;
		const seenSpawns = new Set<unit>();

		for (const city of cities) {
			const spawn = CityToCountry.get(city)?.getSpawn();
			if (!spawn || seenSpawns.has(spawn.unit)) {
				continue;
			}

			spawn.refreshMinimapCamouflage();
			this.spawners.push(spawn);
			seenSpawns.add(spawn.unit);
		}
	}

	/**
	 * Expands the frame pool by the specified amount.
	 * @param count - Number of frames to add
	 */
	private expandPool(count: number): void {
		const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_MINIMAP, 0);
		for (let i = 0; i < count; i++) {
			const iconFrame = BlzCreateFrameByType('BACKDROP', 'MinimapUnitIcon', gameUI, '', 0);
			if (iconFrame) {
				BlzFrameSetSize(iconFrame, this.UNIT_ICON_SIZE, this.UNIT_ICON_SIZE);
				BlzFrameSetLevel(iconFrame, 15);
				BlzFrameSetVisible(iconFrame, false);
				this.framePool.push(iconFrame);
			}
		}
	}

	/**
	 * Registers a unit if it is of a trackable type. Safe to call with any unit.
	 * @param unit - The unit to check and potentially track
	 * @param forceIconRefresh - Recompute the icon texture even if the unit is already tracked
	 */
	public registerIfValid(unit: unit, forceIconRefresh: boolean = false): void {
		if (!this.isActive) return;

		if (!UnitAlive(unit)) return;

		// Guards are never drawn on the minimap - a guard appearing at a city would leak captures through fog
		if (IsUnitType(unit, UNIT_TYPE.GUARD)) return;

		if (!this.trackedList.trackedUnitIndex.has(unit)) {
			this.registerTrackedUnit(unit);
		}

		if (forceIconRefresh) {
			this.refreshTrackedUnitIcon(unit);
		}
	}

	/**
	 * Registers a unit that was just unloaded from a transport. Registration is delayed slightly,
	 * since the unit cannot be reliably picked up on the same frame it is unloaded.
	 */
	public registerAfterUnload(unit: unit): void {
		if (!this.isActive) return;

		this.delayedTrackQueue.push(unit);

		if (this.delayedTrackTimerRunning) return;

		this.delayedTrackTimerRunning = true;
		TimerStart(this.delayedTrackTimer, 0.1, false, () => {
			for (let i = 0; i < this.delayedTrackQueue.length; i++) {
				const queued = this.delayedTrackQueue[i];

				// Skip units that died, became guards, or were reloaded into a transport during the delay
				if (!UnitAlive(queued) || IsUnitType(queued, UNIT_TYPE.GUARD) || IsUnitLoaded(queued)) continue;

				this.registerIfValid(queued, true);
			}

			this.delayedTrackQueue.length = 0;
			this.delayedTrackTimerRunning = false;
		});
	}

	/**
	 * Unregisters a tracked unit (e.g. when loaded into a transport or turned into a guard).
	 * Re-enables the unit's native minimap display.
	 */
	public unregisterTrackedUnit(unit: unit): void {
		if (!this.isActive) return;

		const index = this.trackedList.trackedUnitIndex.get(unit);
		if (index !== undefined) {
			const iconFrame = this.removeTrackedAt(index);
			if (iconFrame) {
				BlzFrameSetVisible(iconFrame, false);
				this.framePool.push(iconFrame);

				BlzSetUnitBooleanField(unit, UNIT_BF_HIDE_MINIMAP_DISPLAY, false);
			}
		}
	}

	private removeTrackedAt(index: number): framehandle | undefined {
		const frame = this.trackedList.removeTrackedAt(index);

		if (frame) this.frameLastTexture.delete(frame);

		return frame;
	}

	/**
	 * Registers a moving unit to be drawn on the minimap.
	 */
	private registerTrackedUnit(unit: unit): void {
		if (this.trackedList.trackedUnitIndex.has(unit)) return;

		// Hide the default minimap display for the unit
		BlzSetUnitBooleanField(unit, UNIT_BF_HIDE_MINIMAP_DISPLAY, true);

		// Recycle a frame if available, otherwise expand the pool in a batch to avoid per-frame lag spikes
		if (this.framePool.length === 0) {
			this.expandPool(200);
		}

		const iconFrame: framehandle = this.framePool.pop();

		if (!iconFrame) return;

		BlzFrameSetSize(iconFrame, this.UNIT_ICON_SIZE, this.UNIT_ICON_SIZE);
		BlzFrameSetLevel(iconFrame, 15);

		// Poison the owner cache so the update loop computes the color on first sight
		this.trackedList.addTrackedUnit(unit, iconFrame, Player(25));

		const localPlayer = GetLocalPlayer();
		if (IsUnitVisible(unit, localPlayer)) {
			this.updateIconPosition(iconFrame, GetUnitX(unit), GetUnitY(unit));
			this.updateUnitIconColor(iconFrame, unit, localPlayer, GetAllyColorFilterState());
			const idx = this.trackedList.trackedUnitIndex.get(unit);
			if (idx !== undefined) {
				this.trackedList.trackedRawOwnerList[idx] = GetOwningPlayer(unit);
			}
			BlzFrameSetVisible(iconFrame, true);
		} else {
			BlzFrameSetVisible(iconFrame, false);
		}
	}

	/**
	 * Forces a tracked unit's icon to recompute its texture. Used after lifecycle events like
	 * transport unloading, where a recycled frame may still display an old texture.
	 */
	private refreshTrackedUnitIcon(unit: unit): void {
		const index = this.trackedList.trackedUnitIndex.get(unit);
		if (index === undefined) return;

		const iconFrame = this.trackedList.trackedFrameList[index];
		const localPlayer = GetLocalPlayer();

		this.frameLastTexture.delete(iconFrame);

		if (!IsUnitVisible(unit, localPlayer)) {
			this.trackedList.trackedRawOwnerList[index] = Player(25);
			BlzFrameSetVisible(iconFrame, false);
			return;
		}

		this.updateIconPosition(iconFrame, GetUnitX(unit), GetUnitY(unit));
		this.updateUnitIconColor(iconFrame, unit, localPlayer, GetAllyColorFilterState());
		this.trackedList.trackedRawOwnerList[index] = GetOwningPlayer(unit);
		BlzFrameSetVisible(iconFrame, true);
	}

	/**
	 * Creates the minimap icon for a city and hides the native minimap display of its buildings.
	 */
	private createCityIcon(city: City): void {
		const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_MINIMAP, 0);

		// Hide the default minimap display for the city's barrack unit
		BlzSetUnitBooleanField(city.barrack.unit, UNIT_BF_HIDE_MINIMAP_DISPLAY, true);

		// Hide the Circle of Power's native minimap display (prevents stray dots on bases)
		BlzSetUnitBooleanField(city.cop, UNIT_BF_HIDE_MINIMAP_DISPLAY, true);

		const iconFrame = BlzCreateFrameByType('BACKDROP', 'MinimapCityIcon', gameUI, '', 0);

		if (!iconFrame) return;

		BlzFrameSetSize(iconFrame, this.BUILDING_ICON_SIZE, this.BUILDING_ICON_SIZE);

		// Render above the minimap
		BlzFrameSetLevel(iconFrame, 10);

		this.cityIcons.set(city, iconFrame);
		this.cityRecords.push({
			city,
			iconFrame,
			lastVisible: undefined,
			lastOwner: undefined,
			lastLastSeenOwner: undefined,
			lastColorMode: undefined,
		});

		this.updateIconPosition(iconFrame, city.barrack.defaultX, city.barrack.defaultY);

		const localPlayer = GetLocalPlayer();
		this.updateCityIconColor(iconFrame, city, IsUnitVisible(city.barrack.unit, localPlayer), localPlayer, GetAllyColorFilterState());

		BlzFrameSetVisible(iconFrame, true);
	}

	/**
	 * Positions an icon over the minimap point matching the given world coordinates.
	 */
	public updateIconPosition(iconFrame: framehandle, worldX: number, worldY: number): void {
		const normalizedX = (worldX - this.worldMinX) / this.worldWidth;
		const normalizedY = (worldY - this.worldMinY) / this.worldHeight;

		// The default UI is 0.8 wide and always centered at X=0.4, so the console's left edge
		// moves inwards towards 0.4 as the HUD scales down.
		const uiLeftEdgeX = 0.4 - (0.8 * this.hudScale) / 2.0;

		// The minimap sits in the bottom-left corner, slightly inset from the console's corner
		const iconX = uiLeftEdgeX + 0.009 * this.hudScale + normalizedX * (this.MINIMAP_WIDTH * this.hudScale);
		const iconY = 0.004 * this.hudScale + normalizedY * (this.MINIMAP_HEIGHT * this.hudScale);

		BlzFrameSetAbsPoint(iconFrame, FRAMEPOINT_CENTER, iconX, iconY);
	}

	/**
	 * Clears the last seen owners cache.
	 * Called right after fog is applied so cities seen during setup are not remembered.
	 */
	public clearSeenCache(): void {
		if (!this.isActive) return;

		this.lastSeenOwners.clear();
	}

	private repositionAllStaticIcons(): void {
		this.cityIcons.forEach((iconFrame, city) => {
			this.updateIconPosition(iconFrame, city.barrack.defaultX, city.barrack.defaultY);
		});
	}

	private startUpdateTimer(): void {
		this.updateTimer = CreateTimer();

		TimerStart(this.updateTimer, 0.2, true, () => {
			this.updateAllIcons();
		});
	}

	/**
	 * Updates all city icons and a throttled slice of the tracked unit icons.
	 */
	private updateAllIcons(): void {
		const localPlayer = GetLocalPlayer();
		const allyColorMode = GetAllyColorFilterState();

		// If the global color context changed, invalidate every unit's cached owner to force a recolor
		if (this.lastGlobalColorMode !== allyColorMode || this.lastGlobalPovPlayer !== localPlayer) {
			const invalidPlayer = Player(25);
			for (let j = 0; j < this.trackedList.trackedRawOwnerList.length; j++) {
				this.trackedList.trackedRawOwnerList[j] = invalidPlayer;
			}

			this.lastGlobalColorMode = allyColorMode;
			this.lastGlobalPovPlayer = localPlayer;
		}

		const hudScale = this.hudScale;
		const uiLeftEdgeX = 0.4 - (0.8 * hudScale) / 2.0;
		const baseXOffset = uiLeftEdgeX + 0.009 * hudScale;
		const baseYOffset = 0.004 * hudScale;
		const widthScale = this.MINIMAP_WIDTH * hudScale;
		const heightScale = this.MINIMAP_HEIGHT * hudScale;
		const worldMinX = this.worldMinX;
		const worldMinY = this.worldMinY;
		const invWorldWidth = 1 / this.worldWidth;
		const invWorldHeight = 1 / this.worldHeight;

		for (let c = 0; c < this.cityRecords.length; c++) {
			const record = this.cityRecords[c];
			const city = record.city;

			// Check if the city's barrack is visible through fog of war
			const isVisible = IsUnitVisible(city.barrack.unit, localPlayer);
			const currentOwner = city.getOwner();
			const lastSeenOwner = isVisible ? undefined : this.lastSeenOwners.get(city);

			// Dirty check: only update if something visually impactful changed
			if (
				record.lastVisible !== isVisible ||
				record.lastOwner !== currentOwner ||
				record.lastLastSeenOwner !== lastSeenOwner ||
				record.lastColorMode !== allyColorMode
			) {
				record.lastVisible = isVisible;
				record.lastOwner = currentOwner;

				this.updateCityIconColor(record.iconFrame, city, isVisible, localPlayer, allyColorMode);

				record.lastLastSeenOwner = isVisible ? undefined : this.lastSeenOwners.get(city);
				record.lastColorMode = allyColorMode;
			}
		}

		for (let s = 0; s < this.spawners.length; s++) {
			this.spawners[s].refreshMinimapCamouflage();
		}

		const trackedLength = this.trackedList.trackedUnitList.length;
		if (this.currentUnitUpdateIndex >= trackedLength) {
			this.currentUnitUpdateIndex = 0;
		}

		const maxToProcess = Math.min(this.UNITS_PER_TICK, trackedLength);
		let loopsCompleted = 0;

		while (loopsCompleted < maxToProcess && this.trackedList.trackedUnitList.length > 0) {
			if (this.currentUnitUpdateIndex >= this.trackedList.trackedUnitList.length) {
				this.currentUnitUpdateIndex = 0; // Wrap around safely if the list shrunk during the loop
			}

			const i = this.currentUnitUpdateIndex;
			loopsCompleted++;

			const unit = this.trackedList.trackedUnitList[i];
			const iconFrame = this.trackedList.trackedFrameList[i];

			// Drop removed or dead units (0.405 is the death threshold in WC3)
			if (GetUnitTypeId(unit) === 0 || GetWidgetLife(unit) <= 0.405) {
				BlzFrameSetVisible(iconFrame, false);
				const frame = this.removeTrackedAt(i);
				if (frame) this.framePool.push(frame);
				// Do not advance the index: the last element was swapped into this slot
				continue;
			}

			if (IsUnitVisible(unit, localPlayer)) {
				// Update position inline without object allocation
				const normX = (GetUnitX(unit) - worldMinX) * invWorldWidth;
				const normY = (GetUnitY(unit) - worldMinY) * invWorldHeight;
				BlzFrameSetAbsPoint(iconFrame, FRAMEPOINT_CENTER, baseXOffset + normX * widthScale, baseYOffset + normY * heightScale);

				// Only recompute the color if the owner or global color context changed
				const rawOwner = GetOwningPlayer(unit);
				if (this.trackedList.trackedRawOwnerList[i] !== rawOwner) {
					this.trackedList.trackedRawOwnerList[i] = rawOwner;
					this.updateUnitIconColor(iconFrame, unit, localPlayer, allyColorMode);
				}

				BlzFrameSetVisible(iconFrame, true);
			} else {
				// Hide icon if in fog
				BlzFrameSetVisible(iconFrame, false);
			}

			this.currentUnitUpdateIndex++;
		}
	}

	/**
	 * Updates a city icon's color from its owner and fog visibility. A fogged city shows the owner it
	 * was last seen with, and a never-seen city stays gray with its buildings blacked out.
	 */
	private updateCityIconColor(iconFrame: framehandle, city: City, isVisible: boolean, localPlayer: player, allyColorMode: number): void {
		let owner: player;

		if (isVisible) {
			owner = city.getOwner();

			// Restore the building colors that HideMinimap / an unseen state blacked out
			SetUnitVertexColor(city.barrack.unit, 255, 255, 255, 255);
			SetUnitVertexColor(city.cop, 255, 255, 255, 255);

			this.lastSeenOwners.set(city, owner);
		} else {
			const lastSeenOwner = this.lastSeenOwners.get(city);
			if (!lastSeenOwner) {
				// Never seen this city - show as neutral gray and keep its buildings blacked out
				this.setTextureCached(city, iconFrame, this.COLOR_TEXTURES[90], this.cityLastTexture);
				SetUnitVertexColor(city.barrack.unit, 0, 0, 0, 255);
				SetUnitVertexColor(city.cop, 0, 0, 0, 255);
				return;
			}
			owner = lastSeenOwner;
		}

		this.setTextureCached(city, iconFrame, this.getOwnerTexture(owner, localPlayer, allyColorMode), this.cityLastTexture);
	}

	/**
	 * Updates a unit icon's color from the unit's owner.
	 */
	private updateUnitIconColor(iconFrame: framehandle, unit: unit, localPlayer: player, allyColorMode: number): void {
		this.setTextureCached(iconFrame, iconFrame, this.getOwnerTexture(GetOwningPlayer(unit), localPlayer, allyColorMode), this.frameLastTexture);
	}

	/**
	 * Picks the icon texture for an owner, following the native minimap conventions: the local
	 * player is white, and with the ally color filter on, allies are teal and enemies red.
	 */
	private getOwnerTexture(owner: player, localPlayer: player, allyColorMode: number): string {
		if (owner === localPlayer) return this.COLOR_TEXTURES[99];

		// Neutral players (Player 24+) are gray
		if (GetPlayerId(owner) >= 24) return this.COLOR_TEXTURES[90];

		if (allyColorMode > 0) {
			if (IsPlayerAlly(owner, localPlayer)) return this.COLOR_TEXTURES[2];
			if (IsPlayerEnemy(owner, localPlayer)) return this.COLOR_TEXTURES[0];
			return this.COLOR_TEXTURES[90];
		}

		const colorIndex = GetHandleId(GetPlayerColor(owner));

		if (colorIndex < 0 || colorIndex > 23) return this.COLOR_TEXTURES[90];

		return this.COLOR_TEXTURES[colorIndex];
	}

	/**
	 * Sets a frame's texture only if it differs from the last-applied value.
	 */
	private setTextureCached<K>(key: K, iconFrame: framehandle, texture: string, cache: Map<K, string>): void {
		if (cache.get(key) !== texture) {
			BlzFrameSetTexture(iconFrame, texture, 0, true);
			cache.set(key, texture);
		}
	}

	/**
	 * Refreshes the city icons for a new match after a reset. Spawners are re-registered because
	 * resetting a country rebuilds its spawner unit.
	 */
	public async reinitialize(): Promise<void> {
		if (!this.isActive) return;

		const localPlayer = GetLocalPlayer();
		const allyColorMode = GetAllyColorFilterState();
		this.registerSpawners(Array.from(CityToCountry.keys()));

		for (let i = 0; i < this.cityRecords.length; i++) {
			const record = this.cityRecords[i];

			BlzFrameSetSize(record.iconFrame, this.BUILDING_ICON_SIZE, this.BUILDING_ICON_SIZE);
			BlzFrameSetLevel(record.iconFrame, 11);

			this.updateCityIconColor(record.iconFrame, record.city, IsUnitVisible(record.city.barrack.unit, localPlayer), localPlayer, allyColorMode);

			if (i % 50 === 0) {
				await Wait.forSeconds(0.05); // Yield slightly to prevent a frame spike
			}
		}
	}
}
