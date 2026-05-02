import { FORCE_CUSTOM_MINIMAP_ICONS } from 'src/configs/game-settings';
import { DC, DEBUG_PRINTS } from 'src/configs/game-settings';
import { UNIT_TYPE } from '../utils/unit-types';
import { City } from '../city/city';
import { debugPrint } from '../utils/debug-print';
import { SharedSlotManager } from '../game/services/shared-slot-manager';
import { MAP_TYPE } from '../utils/map-info';
import { PlayerManager } from '../player/player-manager';
import { NameManager } from './names/name-manager';
import { SettingsContext } from '../settings/settings-context';
import { isReplay, getReplayObservedPlayer } from '../utils/game-status';
import { MatchFormat } from '../game/match-format-enum';
import { GlobalGameData } from '../game/state/global-game-state';
import { AllyColorFilterManager } from './ally-color-filter-manager';

export interface MinimapTickSample {
	trackedUnits: number;
	cityIcons: number;
	visibleUnits: number;
	deadUnits: number;
	poolSize: number;
	elapsedMs: number;
}

interface CityIconRecord {
	city: City;
	iconFrame: framehandle;
	lastVisible: boolean | undefined;
	lastOwner: player | undefined;
	lastLastSeenOwner: player | undefined;
	lastColorMode: number | undefined;
	lastPovPlayer: player | undefined;
	lastColorBlind: boolean | undefined;
	lastDeadInFFA: boolean | undefined;
	lastOwnershipRevision: number | undefined;
}

/**
 * Manages custom minimap icons using SimpleFrames for cities.
 * This allows for custom-sized icons between unit and building size.
 * NOTE: Only active for "world" terrain - other terrains use default WC3 minimap icons.
 */
export class MinimapIconManager {
	private static instance: MinimapIconManager;
	private cityIcons: Map<City, framehandle> = new Map();
	private cityRecords: CityIconRecord[] = [];
	private cityBorders: Map<City, framehandle> = new Map(); // Inner border frames for capital cities
	private cityOuterBorders: Map<City, framehandle> = new Map(); // Outer border frames for capital cities
	private capitalIcons: Map<City, boolean> = new Map(); // Track which cities are capitals
	private trackedUnitList: unit[] = [];
	private trackedFrameList: framehandle[] = [];
	private trackedRawOwnerList: player[] = []; // Caches raw owner per unit for dirty checking
	private trackedUnitIndex: Map<unit, number> = new Map();
	private framePool: framehandle[] = []; // Pool of unused frames for recycling
	private lastSeenOwners: Map<City, player> = new Map(); // Remember last seen owner
	private minimapFrame: framehandle;
	private updateTimer: timer;
	private isActive: boolean; // Whether custom icons are active (only for world terrain)
	private readonly COLOR_TEXTURES: string[] = []; // Pre-built texture path lookup table
	private cityLastTexture: Map<City, string> = new Map(); // Track last-applied texture per city frame
	private unitLastTexture: Map<unit, string> = new Map(); // Track last-applied texture per unit frame

	// Globals for minimizing color updates across all units
	private lastGlobalColorMode: number | undefined;
	private lastGlobalColorBlind: boolean | undefined;
	private lastGlobalReplayViewer: boolean | undefined;
	private lastGlobalDeadInFFA: boolean | undefined;
	private lastGlobalPovPlayer: player | undefined;
	private lastGlobalOwnershipRevision: number | undefined;

	private consoleUI: framehandle;
	private hudScale: number = 1.0;

	// Minimap constants (corner minimap dimensions)
	private readonly MINIMAP_WIDTH = 0.14; // Minimap width in screen coordinates
	private readonly MINIMAP_HEIGHT = 0.14; // Minimap height in screen coordinates
	private readonly BUILDING_ICON_SIZE = 0.004; // Icon size for regular cities
	private readonly UNIT_ICON_SIZE = 0.002; // Icon size for regular units
	private readonly CAPITAL_ICON_SIZE = 0.0025; // Capital colored center size (smaller to show borders)
	private readonly CAPITAL_BORDER_INNER = 0.0035; // Capital inner border size (black ring)
	private readonly CAPITAL_BORDER_OUTER = 0.0045; // Capital outer border size (white ring)
	private readonly INITIAL_POOL_SIZE = 2000; // Initial number of frames to create to avoid runtime spikes
	private readonly UNITS_PER_TICK = 200; // Throttle dynamic units processed per tick

	// State for adaptive unit tracking
	private currentUnitUpdateIndex: number = 0;

	// World bounds
	private worldMinX: number;
	private worldMinY: number;
	private worldMaxX: number;
	private worldMaxY: number;
	private worldWidth: number;
	private worldHeight: number;

	/**
	 * Gets the singleton instance.
	 */
	public static getInstance(): MinimapIconManager {
		if (!this.instance) {
			this.instance = new MinimapIconManager();
		}
		return this.instance;
	}

	/**
	 * Private constructor - initializes world bounds.
	 */
	private constructor() {
		// Only activate for world terrain
		this.isActive = FORCE_CUSTOM_MINIMAP_ICONS || MAP_TYPE === 'world';

		if (DEBUG_PRINTS.master) debugPrint('MinimapIconManager: Initialized for terrain: ' + MAP_TYPE, DC.minimap);
		if (DEBUG_PRINTS.master) debugPrint('MinimapIconManager: Active: ' + this.isActive, DC.minimap);

		if (!this.isActive) {
			return;
		}

		// Pre-build texture path lookup table (eliminates per-tick string concatenation)
		for (let i = 0; i < 24; i++) {
			const str = i < 10 ? '0' + i : '' + i;
			this.COLOR_TEXTURES[i] = 'ReplaceableTextures\\TeamColor\\TeamColor' + str + '.blp';
		}
		this.COLOR_TEXTURES[24] = 'ReplaceableTextures\\TeamColor\\TeamColor24.blp'; // black (capital inner border)
		this.COLOR_TEXTURES[90] = 'ReplaceableTextures\\TeamColor\\TeamColor90.blp'; // neutral gray
		this.COLOR_TEXTURES[99] = 'ReplaceableTextures\\TeamColor\\TeamColor99.blp'; // white (self / capital outer border)

		// Get world bounds
		const worldBounds = GetWorldBounds();
		this.worldMinX = GetRectMinX(worldBounds);
		this.worldMinY = GetRectMinY(worldBounds);
		this.worldMaxX = GetRectMaxX(worldBounds);
		this.worldMaxY = GetRectMaxY(worldBounds);
		this.worldWidth = this.worldMaxX - this.worldMinX;
		this.worldHeight = this.worldMaxY - this.worldMinY;

		// Get minimap frame
		this.minimapFrame = BlzGetFrameByName('Minimap', 0);
		this.consoleUI = BlzGetFrameByName('ConsoleUIBackdrop', 0);

		// Poll the native button state and correct mode 2 back to 0 if not in Lobby Teams mode
		// Note: the main update loop also corrects mode 2 inside updateIconColor()
		let lastColorMode = -1;
		let lastColorBlind = false;
		let lastColorContrast = false;
		let lastHudScale = -1;

		const allyModeTimer = CreateTimer();
		TimerStart(allyModeTimer, 0.1, true, () => {
			const currentScale = this.consoleUI ? BlzFrameGetWidth(this.consoleUI) / 0.8 : 1.0;

			if (currentScale !== lastHudScale && currentScale > 0) {
				lastHudScale = currentScale;
				this.hudScale = currentScale;
				this.repositionAllStaticIcons();
			}

			const currentColorMode = GetAllyColorFilterState();
			const activeLocalPlayer = PlayerManager.getInstance().players.get(GetLocalPlayer());
			const isColorBlind = activeLocalPlayer ? activeLocalPlayer.options.colorblind : false;
			const isColorContrast = activeLocalPlayer ? activeLocalPlayer.options.colorContrast : false;

			if (currentColorMode !== lastColorMode || isColorBlind !== lastColorBlind || isColorContrast !== lastColorContrast) {
				lastColorMode = currentColorMode;
				lastColorBlind = isColorBlind;
				lastColorContrast = isColorContrast;

				const applyFilter = () => {
					PlayerManager.getInstance().players.forEach((activePlayer) => {
						activePlayer.trackedData.units.forEach((u) => {
							AllyColorFilterManager.getInstance().applyColorFilter(u);
						});
					});
					for (let i = 0; i < this.cityRecords.length; i++) {
						const city = this.cityRecords[i].city;
						AllyColorFilterManager.getInstance().applyColorFilter(city.barrack.unit);
						AllyColorFilterManager.getInstance().applyColorFilter(city.cop);
						if (city.guard && city.guard.unit) {
							AllyColorFilterManager.getInstance().applyColorFilter(city.guard.unit);
						}
					}
				};

				if (currentColorMode === 2) {
					SetAllyColorFilterState(0);
				}
				applyFilter();
			}
		});

		if (DEBUG_PRINTS.master)
			debugPrint('World bounds: ' + this.worldMinX + ', ' + this.worldMinY + ' to ' + this.worldMaxX + ', ' + this.worldMaxY, DC.minimap);
		if (DEBUG_PRINTS.master) debugPrint('World size: ' + this.worldWidth + 'x' + this.worldHeight, DC.minimap);
		if (DEBUG_PRINTS.master) debugPrint('Minimap frame handle: ' + (this.minimapFrame ? 'FOUND' : 'NULL'), DC.minimap);
	}

	/**
	 * Initializes the entire minimap icon system: creates city icons, starts
	 * the periodic update timer, and pre-populates the frame pool.
	 * Should be called after all cities are created.
	 */
	public initialize(cities: City[]): void {
		if (!this.isActive) {
			return;
		}

		if (DEBUG_PRINTS.master) debugPrint(`MinimapIconManager: Creating icons for ${cities.length} cities`, DC.minimap);

		cities.forEach((city) => {
			this.createCityIcon(city);
		});

		if (DEBUG_PRINTS.master) debugPrint(`MinimapIconManager: Created ${this.cityIcons.size} icons`, DC.minimap);

		this.startUpdateTimer();
		this.expandPool(this.INITIAL_POOL_SIZE);
	}

	/**
	 * Expands the frame pool by the specified amount.
	 * @param count - Number of frames to add
	 */
	private expandPool(count: number): void {
		try {
			const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_MINIMAP, 0);
			for (let i = 0; i < count; i++) {
				const iconFrame = BlzCreateFrameByType('BACKDROP', 'MinimapUnitIcon', gameUI, '', 0);
				if (iconFrame) {
					// Initialize properties
					BlzFrameSetSize(iconFrame, this.UNIT_ICON_SIZE, this.UNIT_ICON_SIZE);
					BlzFrameSetLevel(iconFrame, 15);
					BlzFrameSetVisible(iconFrame, false);
					this.framePool.push(iconFrame);
				}
			}
			if (DEBUG_PRINTS.master)
				debugPrint(`MinimapIconManager: Expanded pool by ${count}. Total size: ${this.framePool.length}`, DC.minimap);
		} catch (e) {
			if (DEBUG_PRINTS.master) debugPrint('MinimapIconManager: Error expanding pool - ' + e, DC.minimap);
		}
	}

	/**
	 * Registers a unit if it is of a trackable type.
	 *Safe to call with any unit.
	 * @param unit - The unit to check and potentially track
	 */
	public registerIfValid(unit: unit): void {
		if (!this.isActive) return;

		// Don't track if unit is already dead
		if (!UnitAlive(unit)) {
			return;
		}

		// Only track units marked as SPAWN
		if (!IsUnitType(unit, UNIT_TYPE.SPAWN)) {
			return;
		}

		// Guards are managed separately — they should not have minimap icons
		if (IsUnitType(unit, UNIT_TYPE.GUARD)) {
			return;
		}

		// Check if already tracked to avoid duplicates
		if (!this.trackedUnitIndex.has(unit)) {
			this.registerTrackedUnit(unit);
		}
	}

	/**
	 * Unregisters a tracked unit (e.g. when loaded into transport)
	 * @param unit - The unit to stop tracking
	 */
	public unregisterTrackedUnit(unit: unit): void {
		if (!this.isActive) return;

		const index = this.trackedUnitIndex.get(unit);
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
		const lastIndex = this.trackedUnitList.length - 1;
		if (lastIndex < 0) return undefined;

		const unit = this.trackedUnitList[index];
		const frame = this.trackedFrameList[index];

		const lastUnit = this.trackedUnitList[lastIndex];
		const lastFrame = this.trackedFrameList[lastIndex];
		const lastRawOwner = this.trackedRawOwnerList[lastIndex];

		this.trackedUnitList[index] = lastUnit;
		this.trackedFrameList[index] = lastFrame;
		this.trackedRawOwnerList[index] = lastRawOwner;
		this.trackedUnitIndex.set(lastUnit, index);

		this.trackedUnitList.pop();
		this.trackedFrameList.pop();
		this.trackedRawOwnerList.pop();
		this.trackedUnitIndex.delete(unit);
		this.unitLastTexture.delete(unit);

		return frame;
	}

	private addTrackedUnit(unit: unit, frame: framehandle): void {
		const index = this.trackedUnitList.length;
		this.trackedUnitList.push(unit);
		this.trackedFrameList.push(frame);
		this.trackedRawOwnerList.push(GetOwningPlayer(unit)); // NEVER push undefined in TSTL! It creates `nil` holes breaking fast array indexing.
		this.trackedUnitIndex.set(unit, index);
	}

	/**
	 * Registers a moving unit to be tracked on the minimap.
	 * @param unit - The unit to track
	 */
	public registerTrackedUnit(unit: unit): void {
		if (!this.isActive) return;

		if (this.trackedUnitIndex.has(unit)) {
			return;
		}

		try {
			const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_MINIMAP, 0);

			// Hide the default minimap display for the unit
			BlzSetUnitBooleanField(unit, UNIT_BF_HIDE_MINIMAP_DISPLAY, true);

			let iconFrame: framehandle;

			// Recycle frame if available, otherwise expand pool in batch to avoid per-frame lag spikes
			if (this.framePool.length > 0) {
				iconFrame = this.framePool.pop();
			} else {
				if (DEBUG_PRINTS.master) debugPrint('MinimapIconManager: Pool exhausted, expanding by 200', DC.minimap);
				this.expandPool(200);
				iconFrame = this.framePool.pop();
			}

			if (!iconFrame) {
				if (DEBUG_PRINTS.master) debugPrint('MinimapIconManager: Failed to create/recycle frame for unit', DC.minimap);
				return;
			}

			// Set icon size (same as cities for now)
			BlzFrameSetSize(iconFrame, this.UNIT_ICON_SIZE, this.UNIT_ICON_SIZE);

			// Set level to render above minimap (Top level for units)
			BlzFrameSetLevel(iconFrame, 15);

			// Store the frame
			this.addTrackedUnit(unit, iconFrame);

			// Initial update
			const localPlayer = GetLocalPlayer();
			const effectiveLocal = isReplay() ? getReplayObservedPlayer() : localPlayer;
			if (IsUnitVisible(unit, effectiveLocal)) {
				this.updateIconPosition(iconFrame, GetUnitX(unit), GetUnitY(unit));
				this.updateUnitIconColor(iconFrame, unit, effectiveLocal);
				BlzFrameSetVisible(iconFrame, true);
			} else {
				BlzFrameSetVisible(iconFrame, false);
			}
			if (DEBUG_PRINTS.master)
				debugPrint(
					`MinimapIconManager: Count of tracked units: ${this.trackedUnitList.length}, Pool size: ${this.framePool.length}`,
					DC.minimap
				);
		} catch (e) {
			if (DEBUG_PRINTS.master) debugPrint('MinimapIconManager: Error registering unit - ' + e, DC.minimap);
		}
	}

	/**
	 * Creates a SimpleFrame icon for a city on the minimap.
	 */
	private createCityIcon(city: City): void {
		try {
			const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_MINIMAP, 0);
			const worldX = city.barrack.defaultX;
			const worldY = city.barrack.defaultY;

			// Hide the default minimap display for the city's barrack unit
			BlzSetUnitBooleanField(city.barrack.unit, UNIT_BF_HIDE_MINIMAP_DISPLAY, true);

			// Hide the Circle of Power's native minimap display (prevents stray dots on bases)
			BlzSetUnitBooleanField(city.cop, UNIT_BF_HIDE_MINIMAP_DISPLAY, true);

			// Create color icon frame
			const iconFrame = BlzCreateFrameByType('BACKDROP', 'MinimapCityIcon', gameUI, '', 0);

			if (!iconFrame) {
				if (DEBUG_PRINTS.master) debugPrint('MinimapIconManager: Failed to create frame for city', DC.minimap);
				return;
			}

			// Set icon size
			BlzFrameSetSize(iconFrame, this.BUILDING_ICON_SIZE, this.BUILDING_ICON_SIZE);

			// Set level to render above minimap (and above border if present)
			BlzFrameSetLevel(iconFrame, 10);

			// Store the frame first (needed for updateIconColor)
			this.cityIcons.set(city, iconFrame);
			this.cityRecords.push({
				city,
				iconFrame,
				lastVisible: undefined,
				lastOwner: undefined,
				lastLastSeenOwner: undefined,
				lastColorMode: undefined,
				lastPovPlayer: undefined,
				lastColorBlind: undefined,
				lastDeadInFFA: undefined,
				lastOwnershipRevision: undefined,
			});

			// Position the icon
			this.updateIconPosition(iconFrame, worldX, worldY);

			// Check initial visibility
			const localPlayer = GetLocalPlayer();
			const isVisible = IsUnitVisible(city.barrack.unit, localPlayer);

			// Set initial color based on owner and visibility
			this.updateIconColor(iconFrame, city, isVisible, localPlayer);

			// Make it visible
			BlzFrameSetVisible(iconFrame, true);
		} catch (e) {
			if (DEBUG_PRINTS.master) debugPrint('MinimapIconManager: Error creating icon - ' + e, DC.minimap);
		}
	}

	/**
	 * Converts world coordinates to minimap-relative coordinates (0.0 to 1.0).
	 */
	private worldToMinimapCoords(worldX: number, worldY: number): { x: number; y: number } {
		// Normalize coordinates (0.0 to 1.0) based on world bounds
		const normalizedX = (worldX - this.worldMinX) / this.worldWidth;
		const normalizedY = (worldY - this.worldMinY) / this.worldHeight;

		return { x: normalizedX, y: normalizedY };
	}

	/**
	 * Updates an icon's position based on world coordinates.
	 */
	private updateIconPosition(iconFrame: framehandle, worldX: number, worldY: number): void {
		const coords = this.worldToMinimapCoords(worldX, worldY);

		// The default UI is 0.8 width and is always centered at X=0.4 on the screen.
		// When the HUD scales down, the left edge of the console moves inwards towards 0.4.
		const uiCenterX = 0.4;
		const uiWidthScaled = 0.8 * this.hudScale;
		const uiLeftEdgeX = uiCenterX - uiWidthScaled / 2.0;

		// Minimap positioning (BOTTOM-left corner of screen in WC3)
		// The minimap doesn't start exactly at 0,0 relative to the console - need offset
		// Adjust these values to align with actual minimap
		const minimapBaseX = 0.009 * this.hudScale; // Shift right relative to console left
		const minimapBaseY = 0.004 * this.hudScale; // Shift up from bottom (no Y shift for scaling because console anchors to bottom)

		// Calculate position within minimap bounds
		const iconX = uiLeftEdgeX + minimapBaseX + coords.x * (this.MINIMAP_WIDTH * this.hudScale);
		const iconY = minimapBaseY + coords.y * (this.MINIMAP_HEIGHT * this.hudScale);

		// Position absolutely on screen
		BlzFrameSetAbsPoint(iconFrame, FRAMEPOINT_CENTER, iconX, iconY);

		// Debug first few icons
		if (this.cityIcons.size <= 2) {
			if (DEBUG_PRINTS.master)
				debugPrint('MinimapIconManager: Icon #' + this.cityIcons.size + ' normalized: ' + coords.x + ', ' + coords.y, DC.minimap);
			if (DEBUG_PRINTS.master)
				debugPrint('MinimapIconManager: Icon #' + this.cityIcons.size + ' absolute: ' + iconX + ', ' + iconY, DC.minimap);
		}
	}

	/**
	 * Clears the last seen owners cache.
	 * Should be called right after initial fog application to reset the system.
	 */
	public clearSeenCache(): void {
		this.lastSeenOwners.clear();
	}

	/**
	 * Repositions all static city icons and borders when HUD scale changes.
	 */
	private repositionAllStaticIcons(): void {
		this.cityIcons.forEach((iconFrame, city) => {
			this.updateIconPosition(iconFrame, city.barrack.defaultX, city.barrack.defaultY);
		});
		this.cityBorders.forEach((iconFrame, city) => {
			this.updateIconPosition(iconFrame, city.barrack.defaultX, city.barrack.defaultY);
		});
		this.cityOuterBorders.forEach((iconFrame, city) => {
			this.updateIconPosition(iconFrame, city.barrack.defaultX, city.barrack.defaultY);
		});
	}

	/**
	 * Starts the periodic update timer.
	 */
	private startUpdateTimer(): void {
		this.updateTimer = CreateTimer();

		TimerStart(this.updateTimer, 0.2, true, () => {
			// Update all icon positions and colors
			// This runs every 0.2 seconds
			this.updateAllIcons();
		});
	}

	public debugRunUpdateAllIconsForBenchmark(): MinimapTickSample {
		const start = os.clock();
		const sample = this.updateAllIconsWithSample() as MinimapTickSample;
		sample.elapsedMs = (os.clock() - start) * 1000;
		return sample;
	}

	/**
	 * Updates all city icons (positions and visibility).
	 */
	private updateAllIcons(): void {
		this.updateAllIconsWithSample();
	}

	private updateAllIconsWithSample(): Omit<MinimapTickSample, 'elapsedMs'> {
		const localPlayer = GetLocalPlayer();
		const effectiveLocal = isReplay() ? getReplayObservedPlayer() : localPlayer;

		const isReplayViewer = isReplay();
		const playerManager = PlayerManager.getInstance();
		const activeLocalPlayer = playerManager.players.get(effectiveLocal);
		const localIsColorBlind = activeLocalPlayer ? activeLocalPlayer.options.colorblind : false;
		const localIsColorContrast = activeLocalPlayer ? activeLocalPlayer.options.colorContrast : false;
		const allyColorMode = localIsColorContrast ? 2 : GetAllyColorFilterState();
		const isFFA = SettingsContext.getInstance().isFFA();
		const isDeadInFFA = isFFA && activeLocalPlayer ? activeLocalPlayer.status.isDead() : false;
		const sharedSlotManager = SharedSlotManager.getInstance();
		const currentOwnershipRevision = sharedSlotManager.getOwnershipRevision();

		// Check if any global context parameter changed
		let forceColorUpdateAllUnits = false;
		if (
			this.lastGlobalColorMode !== allyColorMode ||
			this.lastGlobalColorBlind !== localIsColorBlind ||
			this.lastGlobalReplayViewer !== isReplayViewer ||
			this.lastGlobalDeadInFFA !== isDeadInFFA ||
			this.lastGlobalPovPlayer !== effectiveLocal ||
			this.lastGlobalOwnershipRevision !== currentOwnershipRevision
		) {
			forceColorUpdateAllUnits = true;
			this.lastGlobalColorMode = allyColorMode;
			this.lastGlobalColorBlind = localIsColorBlind;
			this.lastGlobalReplayViewer = isReplayViewer;
			this.lastGlobalDeadInFFA = isDeadInFFA;
			this.lastGlobalPovPlayer = effectiveLocal;
			this.lastGlobalOwnershipRevision = currentOwnershipRevision;
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

		let cityIconsCount = 0;
		for (let c = 0; c < this.cityRecords.length; c++) {
			cityIconsCount++;
			const record = this.cityRecords[c];
			const city = record.city;

			// Check if the city's barrack is visible through fog of war
			const isVisible = IsUnitVisible(city.barrack.unit, effectiveLocal);
			const currentOwner = city.getOwner();
			let lastSeenOwner = isVisible ? undefined : this.lastSeenOwners.get(city);

			// Dirty check: only update if something visually impactful changed
			if (
				record.lastVisible !== isVisible ||
				record.lastOwner !== currentOwner ||
				record.lastLastSeenOwner !== lastSeenOwner ||
				record.lastColorMode !== allyColorMode ||
				record.lastPovPlayer !== effectiveLocal ||
				record.lastColorBlind !== localIsColorBlind ||
				record.lastDeadInFFA !== isDeadInFFA ||
				record.lastOwnershipRevision !== currentOwnershipRevision
			) {
				// Record the new state
				record.lastVisible = isVisible;
				record.lastOwner = currentOwner;
				// Need to pre-fetch last seen owner for checking, or let update check it. Wait, updateCityIconColorFast handles remembering owner.

				// Update color based on owner and visibility
				this.updateCityIconColorFast(
					record.iconFrame,
					city,
					isVisible,
					effectiveLocal,
					localPlayer,
					allyColorMode,
					localIsColorBlind,
					isDeadInFFA
				);

				record.lastLastSeenOwner = isVisible ? undefined : this.lastSeenOwners.get(city);
				record.lastColorMode = allyColorMode;
				record.lastPovPlayer = effectiveLocal;
				record.lastColorBlind = localIsColorBlind;
				record.lastDeadInFFA = isDeadInFFA;
				record.lastOwnershipRevision = currentOwnershipRevision;
			}
		}

		// Update tracked units
		let visibleUnitsCount = 0;
		let trackedUnitsCount = 0;
		let deadUnitsCount = 0;

		const trackedLength = this.trackedUnitList.length;
		if (this.currentUnitUpdateIndex >= trackedLength) {
			this.currentUnitUpdateIndex = 0;
		}

		const maxToProcess = Math.min(this.UNITS_PER_TICK, trackedLength);
		let loopsCompleted = 0;

		while (loopsCompleted < maxToProcess && this.trackedUnitList.length > 0) {
			if (this.currentUnitUpdateIndex >= this.trackedUnitList.length) {
				this.currentUnitUpdateIndex = 0; // Wrap around safely if list shrunk during loops
			}

			const i = this.currentUnitUpdateIndex;

			trackedUnitsCount++;
			loopsCompleted++;

			const unit = this.trackedUnitList[i];
			const iconFrame = this.trackedFrameList[i];

			// Check if unit is still valid and alive
			// Note: 0.405 is the death threshold in WC3
			if (GetUnitTypeId(unit) === 0 || GetWidgetLife(unit) <= 0.405) {
				deadUnitsCount++;
				BlzFrameSetVisible(iconFrame, false);
				const frame = this.removeTrackedAt(i);
				if (frame) this.framePool.push(frame);
				// Do not increment currentUnitUpdateIndex because the swapped element is now at this index.
				// By not incrementing, the new element at `i` gets processed either next loop or next tick.
				continue;
			}

			// Check visibility
			if (IsUnitVisible(unit, effectiveLocal)) {
				visibleUnitsCount++;

				// Update position inline without object allocation
				const normX = (GetUnitX(unit) - worldMinX) * invWorldWidth;
				const normY = (GetUnitY(unit) - worldMinY) * invWorldHeight;
				BlzFrameSetAbsPoint(iconFrame, FRAMEPOINT_CENTER, baseXOffset + normX * widthScale, baseYOffset + normY * heightScale);

				// Only compute and update color if raw owner or global state changed
				const rawOwner = GetOwningPlayer(unit);
				if (forceColorUpdateAllUnits || this.trackedRawOwnerList[i] !== rawOwner) {
					this.trackedRawOwnerList[i] = rawOwner;
					// Update color
					this.updateUnitIconColorFast(
						iconFrame,
						unit,
						effectiveLocal,
						allyColorMode,
						isReplayViewer,
						localIsColorBlind,
						isDeadInFFA,
						sharedSlotManager
					);
				}

				// Show icon
				BlzFrameSetVisible(iconFrame, true);
			} else {
				// Hide icon if in fog
				BlzFrameSetVisible(iconFrame, false);
			}

			this.currentUnitUpdateIndex++;
		}

		return {
			trackedUnits: trackedUnitsCount,
			cityIcons: cityIconsCount,
			visibleUnits: visibleUnitsCount,
			deadUnits: deadUnitsCount,
			poolSize: this.framePool.length,
		};
	}

	private updateCityIconColorFast(
		iconFrame: framehandle,
		city: City,
		isVisible: boolean,
		effectiveLocal: player,
		localPlayer: player,
		allyColorMode: number,
		localIsColorBlind: boolean,
		isDeadInFFA: boolean
	): void {
		let owner: player;

		if (isVisible) {
			if (GetLocalPlayer() === effectiveLocal) {
				AllyColorFilterManager.getInstance().applyColorFilter(city.barrack.unit);
				AllyColorFilterManager.getInstance().applyColorFilter(city.cop);
				if (city.guard && city.guard.unit) {
					AllyColorFilterManager.getInstance().applyColorFilter(city.guard.unit);
				}
			}

			// City is visible - update and remember the owner
			owner = city.getOwner();
			this.lastSeenOwners.set(city, owner);
		} else {
			// City is in fog of war - check if we've seen it before
			const lastSeenOwner = this.lastSeenOwners.get(city);
			if (!lastSeenOwner) {
				// Never seen this city - show as neutral gray
				this.setTextureCached(city, iconFrame, this.COLOR_TEXTURES[90], this.cityLastTexture);
				if (GetLocalPlayer() === effectiveLocal) {
					SetUnitVertexColor(city.barrack.unit, 0, 0, 0, 255);
					SetUnitVertexColor(city.cop, 0, 0, 0, 255);
				}
				return;
			}
			// Use the last seen owner
			owner = lastSeenOwner;
		}

		// Check ally color filter mode
		// 0 = Player colors, 1/2 = Ally/Enemy colors

		// If the local player owns this city, show it in WHITE
		if (owner === effectiveLocal) {
			const localTexture = this.COLOR_TEXTURES[99];
			this.setTextureCached(city, iconFrame, localTexture, this.cityLastTexture);
			return;
		}

		if (allyColorMode > 0) {
			// Check if owner is a neutral player (Player 24+)
			const ownerId = GetPlayerId(owner);
			if (ownerId >= 24) {
				// Neutral player = Gray (standard WC3 neutral color)
				this.setTextureCached(city, iconFrame, this.COLOR_TEXTURES[90], this.cityLastTexture);
				return;
			}

			// Check if owner is ally or enemy
			if (IsPlayerAlly(owner, effectiveLocal)) {
				// In FFA, dead players may be assigned as shared slots to another player,
				// so show allies as red to avoid confusion with the shared slot's units
				const allyColor = localIsColorBlind ? this.COLOR_TEXTURES[4] : this.COLOR_TEXTURES[2]; // Yellow vs Teal
				const allyTexture = isDeadInFFA ? this.COLOR_TEXTURES[0] : allyColor;
				this.setTextureCached(city, iconFrame, allyTexture, this.cityLastTexture);
			} else if (IsPlayerEnemy(owner, effectiveLocal)) {
				// Enemy = Red (Player 0 color)
				this.setTextureCached(city, iconFrame, this.COLOR_TEXTURES[0], this.cityLastTexture);
			} else {
				// Neutral = Gray (standard WC3 neutral color)
				this.setTextureCached(city, iconFrame, this.COLOR_TEXTURES[90], this.cityLastTexture);
			}
			return;
		}

		// Standard player colors
		this.setTextureCached(city, iconFrame, this.COLOR_TEXTURES[GetPlayerId(owner)], this.cityLastTexture);
	}

	/**
	 * Updates a unit icon's color based on the unit's owner using fast cached context.
	 */
	private updateUnitIconColorFast(
		iconFrame: framehandle,
		unit: unit,
		effectiveLocal: player,
		allyColorMode: number,
		isReplayViewer: boolean,
		isColorBlind: boolean,
		isDeadInFFA: boolean,
		sharedSlotManager: SharedSlotManager
	): void {
		// Used the SharedSlotManager to resolve the real owner (maps SharedSlot -> Player)
		const owner = sharedSlotManager.getOwnerOfUnit(unit);

		// If the local player owns this unit (or owns the shared slot), show it in WHITE
		if (owner === effectiveLocal) {
			const localTexture = this.COLOR_TEXTURES[99];
			this.setTextureCached(unit, iconFrame, localTexture, this.unitLastTexture);
			return;
		}

		// If ally color mode is enabled (mode 1 or 2)
		// 1 = Ally/Enemy
		// 2 = Ally (Teal)/Enemy
		// Skip ally color in replay — always show player colors
		if (allyColorMode > 0 && !isReplayViewer) {
			const ownerId = GetPlayerId(owner as player);
			if (ownerId >= 24) {
				this.setTextureCached(unit, iconFrame, this.COLOR_TEXTURES[90], this.unitLastTexture);
				return;
			}

			// Check if owner is ally or enemy
			if (IsPlayerAlly(owner as player, effectiveLocal)) {
				// In FFA, dead players may be assigned as shared slots to another player,
				// so show allies as red to avoid confusion with the shared slot's units
				const allyColor = isColorBlind ? this.COLOR_TEXTURES[4] : this.COLOR_TEXTURES[2]; // Yellow vs Teal
				const allyTexture = isDeadInFFA ? this.COLOR_TEXTURES[0] : allyColor;
				this.setTextureCached(unit, iconFrame, allyTexture, this.unitLastTexture);
			} else if (IsPlayerEnemy(owner as player, effectiveLocal)) {
				// Enemy = Red (Player 0 color)
				this.setTextureCached(unit, iconFrame, this.COLOR_TEXTURES[0], this.unitLastTexture);
			} else {
				// Neutral = Gray (standard WC3 neutral color)
				this.setTextureCached(unit, iconFrame, this.COLOR_TEXTURES[90], this.unitLastTexture);
			}
			return;
		}

		// Standard player colors
		this.setTextureCached(unit, iconFrame, this.COLOR_TEXTURES[GetPlayerId(owner as player)], this.unitLastTexture);
	}

	/**
	 * Updates an icon's color based on the city's owner and fog of war visibility.
	 * @param iconFrame - The frame to update
	 * @param city - The city whose owner to check
	 * @param isVisible - Whether the city is visible through fog of war
	 */
	private updateIconColor(iconFrame: framehandle, city: City, isVisible: boolean, localPlayer: player): void {
		let owner: player;
		let allyColorMode = GetAllyColorFilterState();
		const activeLocalPlayerForColor = PlayerManager.getInstance().players.get(localPlayer);
		if (activeLocalPlayerForColor && activeLocalPlayerForColor.options.colorContrast) {
			allyColorMode = 2;
		}

		if (isVisible) {
			if (GetLocalPlayer() === localPlayer) {
				AllyColorFilterManager.getInstance().applyColorFilter(city.barrack.unit);
				AllyColorFilterManager.getInstance().applyColorFilter(city.cop);
				if (city.guard && city.guard.unit) {
					AllyColorFilterManager.getInstance().applyColorFilter(city.guard.unit);
				}
			}

			// City is visible - update and remember the owner
			owner = city.getOwner();
			this.lastSeenOwners.set(city, owner);
		} else {
			// City is in fog of war - check if we've seen it before
			const lastSeenOwner = this.lastSeenOwners.get(city);
			if (!lastSeenOwner) {
				// Never seen this city - show as neutral gray
				this.setTextureCached(city, iconFrame, this.COLOR_TEXTURES[90], this.cityLastTexture);
				if (GetLocalPlayer() === localPlayer) {
					SetUnitVertexColor(city.barrack.unit, 0, 0, 0, 255);
					SetUnitVertexColor(city.cop, 0, 0, 0, 255);
				}
				return;
			}
			// Use the last seen owner
			owner = lastSeenOwner;
		}

		// Check ally color filter mode
		// 0 = Player colors, 1/2 = Ally/Enemy colors

		// If the local player owns this city, show it in WHITE
		if (owner === localPlayer) {
			const localTexture = this.COLOR_TEXTURES[99];
			this.setTextureCached(city, iconFrame, localTexture, this.cityLastTexture);
			return;
		}

		if (allyColorMode > 0) {
			// Check if owner is a neutral player (Player 24+)
			const ownerId = GetPlayerId(owner);
			if (ownerId >= 24) {
				// Neutral player = Gray (standard WC3 neutral color)
				this.setTextureCached(city, iconFrame, this.COLOR_TEXTURES[90], this.cityLastTexture);
				return;
			}

			// Check if owner is ally or enemy
			if (IsPlayerAlly(owner, localPlayer)) {
				// In FFA, dead players may be assigned as shared slots to another player,
				// so show allies as red to avoid confusion with the shared slot's units
				const localActivePlayer = PlayerManager.getInstance().players.get(localPlayer);
				const isDeadInFFA = localActivePlayer && localActivePlayer.status.isDead() && SettingsContext.getInstance().isFFA();
				const isColorBlind = localActivePlayer && localActivePlayer.options.colorblind;
				const allyColor = isColorBlind ? this.COLOR_TEXTURES[4] : this.COLOR_TEXTURES[2]; // Yellow vs Teal
				const allyTexture = isDeadInFFA ? this.COLOR_TEXTURES[0] : allyColor;
				this.setTextureCached(city, iconFrame, allyTexture, this.cityLastTexture);
			} else if (IsPlayerEnemy(owner, localPlayer)) {
				// Enemy = Red (Player 0 color)
				this.setTextureCached(city, iconFrame, this.COLOR_TEXTURES[0], this.cityLastTexture);
			} else {
				// Neutral = Gray (standard WC3 neutral color)
				this.setTextureCached(city, iconFrame, this.COLOR_TEXTURES[90], this.cityLastTexture);
			}
			return;
		}

		// Default: Use player colors (mode 0)
		// Use original color to avoid slot reassignment changing the color
		const playerColor = NameManager.getInstance().getOriginalColor(owner);
		const colorIndex = GetHandleId(playerColor); // Convert playercolor to integer

		// Validate color index (WC3 supports 24 player colors: 0-23)
		if (colorIndex < 0 || colorIndex > 23) {
			// Neutral/invalid = Gray
			this.setTextureCached(city, iconFrame, this.COLOR_TEXTURES[90], this.cityLastTexture);
			return;
		}

		this.setTextureCached(city, iconFrame, this.COLOR_TEXTURES[colorIndex], this.cityLastTexture);
	}

	/**
	 * Updates a unit icon's color based on the unit's owner.
	 * @param iconFrame - The frame to update
	 * @param unit - The unit whose owner to check
	 */
	private updateUnitIconColor(iconFrame: framehandle, unit: unit, localPlayer: player): void {
		// Used the SharedSlotManager to resolve the real owner (maps SharedSlot -> Player)
		const owner = SharedSlotManager.getInstance().getOwnerOfUnit(unit);
		let allyColorMode = GetAllyColorFilterState();
		const activeLocalPlayerForColor = PlayerManager.getInstance().players.get(localPlayer);
		if (activeLocalPlayerForColor && activeLocalPlayerForColor.options.colorContrast) {
			allyColorMode = 2;
		}

		// If the local player owns this unit (or owns the shared slot), show it in WHITE
		if (owner === localPlayer) {
			const localTexture = this.COLOR_TEXTURES[99];
			this.setTextureCached(unit, iconFrame, localTexture, this.unitLastTexture);
			return;
		}

		// If ally color mode is enabled (mode 1 or 2)
		// 1 = Ally/Enemy
		// 2 = Ally (Teal)/Enemy
		// Skip ally color in replay — always show player colors
		const isReplayViewer = isReplay();
		if (allyColorMode > 0 && !isReplayViewer) {
			const ownerId = GetPlayerId(owner as player);
			if (ownerId >= 24) {
				this.setTextureCached(unit, iconFrame, this.COLOR_TEXTURES[90], this.unitLastTexture);
				return;
			}

			if (IsPlayerAlly(owner as player, localPlayer)) {
				// In FFA, dead players may be assigned as shared slots to another player,
				// so show allies as red to avoid confusion with the shared slot's units
				const localActivePlayer = PlayerManager.getInstance().players.get(localPlayer);
				const isDeadInFFA = localActivePlayer && localActivePlayer.status.isDead() && SettingsContext.getInstance().isFFA();
				const isColorBlind = localActivePlayer && localActivePlayer.options.colorblind;
				const allyColor = isColorBlind ? this.COLOR_TEXTURES[4] : this.COLOR_TEXTURES[2]; // Yellow vs Teal
				const allyTexture = isDeadInFFA ? this.COLOR_TEXTURES[0] : allyColor;
				this.setTextureCached(unit, iconFrame, allyTexture, this.unitLastTexture);
			} else if (IsPlayerEnemy(owner as player, localPlayer)) {
				// Enemy = Red
				this.setTextureCached(unit, iconFrame, this.COLOR_TEXTURES[0], this.unitLastTexture);
			} else {
				// Neutral = Gray
				this.setTextureCached(unit, iconFrame, this.COLOR_TEXTURES[90], this.unitLastTexture);
			}
			return;
		}

		// Default: Use player colors
		// Use original color to avoid slot reassignment changing the color
		const playerColor = NameManager.getInstance().getOriginalColor(owner as player);
		const colorIndex = GetHandleId(playerColor);

		if (colorIndex < 0 || colorIndex > 23) {
			this.setTextureCached(unit, iconFrame, this.COLOR_TEXTURES[90], this.unitLastTexture);
			return;
		}

		this.setTextureCached(unit, iconFrame, this.COLOR_TEXTURES[colorIndex], this.unitLastTexture);
	}

	/**
	 * Sets a frame's texture only if it differs from the last-applied value.
	 * Skips the expensive BlzFrameSetTexture native call when the texture hasn't changed.
	 */
	private setTextureCached<K>(key: K, iconFrame: framehandle, texture: string, cache: Map<K, string>): void {
		if (cache.get(key) !== texture) {
			BlzFrameSetTexture(iconFrame, texture, 0, true);
			cache.set(key, texture);
		}
	}

	/**
	 * Adds a prominent double-ring border to a city's minimap icon (call when city becomes a capital).
	 * Creates a white outer ring + black inner ring for maximum visibility.
	 * @param city - The city to add a border for
	 */
	public addCapitalBorder(city: City): void {
		if (!this.isActive) {
			return;
		}

		// Check if border already exists
		if (this.cityBorders.has(city)) {
			return;
		}

		try {
			const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_MINIMAP, 0);
			const worldX = city.barrack.defaultX;
			const worldY = city.barrack.defaultY;

			if (DEBUG_PRINTS.master) debugPrint('MinimapIconManager: Adding double-ring border for capital city', DC.minimap);

			// Create outer border (white, largest)
			const outerBorderFrame = BlzCreateFrameByType('BACKDROP', 'MinimapCapitalOuterBorder', gameUI, '', 0);
			if (!outerBorderFrame) {
				if (DEBUG_PRINTS.master) debugPrint('MinimapIconManager: Failed to create outer border frame for capital', DC.minimap);
				return;
			}

			// Set outer border size (same as regular city size)
			BlzFrameSetSize(outerBorderFrame, this.CAPITAL_BORDER_OUTER, this.CAPITAL_BORDER_OUTER);

			// Set white color for outer border
			BlzFrameSetTexture(outerBorderFrame, this.COLOR_TEXTURES[99], 0, true);

			// Set level to render above regular city icons (which are at level 10)
			BlzFrameSetLevel(outerBorderFrame, 11);

			// Position the outer border
			this.updateIconPosition(outerBorderFrame, worldX, worldY);

			// Make outer border visible
			BlzFrameSetVisible(outerBorderFrame, true);

			// Create inner border (black, medium size)
			const innerBorderFrame = BlzCreateFrameByType('BACKDROP', 'MinimapCapitalInnerBorder', gameUI, '', 0);
			if (!innerBorderFrame) {
				if (DEBUG_PRINTS.master) debugPrint('MinimapIconManager: Failed to create inner border frame for capital', DC.minimap);
				return;
			}

			// Set inner border size (between outer border and capital icon)
			BlzFrameSetSize(innerBorderFrame, this.CAPITAL_BORDER_INNER, this.CAPITAL_BORDER_INNER);

			// Set black color for inner border
			BlzFrameSetTexture(innerBorderFrame, this.COLOR_TEXTURES[24], 0, true);

			// Set level to render above outer border
			BlzFrameSetLevel(innerBorderFrame, 12);

			// Position the inner border
			this.updateIconPosition(innerBorderFrame, worldX, worldY);

			// Make inner border visible
			BlzFrameSetVisible(innerBorderFrame, true);

			// Store both border frames
			this.cityOuterBorders.set(city, outerBorderFrame);
			this.cityBorders.set(city, innerBorderFrame);

			// Mark this as a capital icon
			this.capitalIcons.set(city, true);

			// Make the capital icon smaller (border makes it stand out)
			const iconFrame = this.cityIcons.get(city);
			if (iconFrame) {
				BlzFrameSetSize(iconFrame, this.CAPITAL_ICON_SIZE, this.CAPITAL_ICON_SIZE);
				BlzFrameSetLevel(iconFrame, 13); // Above borders (which are at 11-12)

				// Update color immediately
				const localPlayer = GetLocalPlayer();
				const effectiveLocal = isReplay() ? getReplayObservedPlayer() : localPlayer;
				const isVisible = IsUnitVisible(city.barrack.unit, effectiveLocal);
				this.updateIconColor(iconFrame, city, isVisible, effectiveLocal);
			}

			if (DEBUG_PRINTS.master) debugPrint('MinimapIconManager: Capital double-ring border created successfully', DC.minimap);
		} catch (e) {
			if (DEBUG_PRINTS.master) debugPrint('MinimapIconManager: Error adding capital border - ' + e, DC.minimap);
		}
	}

	/**
	 * Destroys and fully re-creates all minimap icons, timer, and frame pool.
	 * Call on game reset (-ng) to start fresh.
	 */
	public reinitialize(cities: City[]): void {
		if (!this.isActive) {
			return;
		}

		this.destroy();
		this.initialize(cities);
	}

	/**
	 * Destroys all frames, timers, and clears all state.
	 */
	public destroy(): void {
		if (!this.isActive) {
			return;
		}

		this.cityRecords.forEach((record) => {
			BlzDestroyFrame(record.iconFrame);
		});
		this.cityBorders.forEach((borderFrame) => {
			BlzDestroyFrame(borderFrame);
		});
		this.cityOuterBorders.forEach((outerBorderFrame) => {
			BlzDestroyFrame(outerBorderFrame);
		});
		this.trackedFrameList.forEach((iconFrame) => {
			BlzDestroyFrame(iconFrame);
		});
		this.framePool.forEach((frame) => {
			BlzDestroyFrame(frame);
		});
		this.cityIcons.clear();
		this.cityRecords.length = 0;
		this.cityBorders.clear();
		this.cityOuterBorders.clear();
		this.capitalIcons.clear();
		this.trackedUnitList.length = 0;
		this.trackedFrameList.length = 0;
		this.trackedUnitIndex.clear();
		this.framePool = [];
		this.lastSeenOwners.clear();
		this.cityLastTexture.clear();
		this.unitLastTexture.clear();

		if (this.updateTimer) {
			DestroyTimer(this.updateTimer);
		}
	}
}
