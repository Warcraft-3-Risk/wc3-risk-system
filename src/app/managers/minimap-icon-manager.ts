import { FORCE_CUSTOM_MINIMAP_ICONS } from 'src/configs/game-settings';
import { UNIT_ID } from 'src/configs/unit-id';
import { UNIT_TYPE } from '../utils/unit-types';
import { City } from '../city/city';
import { debugPrint } from '../utils/debug-print';
import { ClientManager } from '../game/services/client-manager';
import { MAP_TYPE } from '../utils/map-info';

/**
 * Manages custom minimap icons using SimpleFrames for cities.
 * This allows for custom-sized icons between unit and building size.
 * NOTE: Only active for "world" terrain - other terrains use default WC3 minimap icons.
 */
export class MinimapIconManager {
	private static instance: MinimapIconManager;
	private cityIcons: Map<City, framehandle> = new Map();
	private cityBorders: Map<City, framehandle> = new Map(); // Inner border frames for capital cities
	private cityOuterBorders: Map<City, framehandle> = new Map(); // Outer border frames for capital cities
	private capitalIcons: Map<City, boolean> = new Map(); // Track which cities are capitals
	private trackedUnits: Map<unit, framehandle> = new Map(); // Moving units to track
	private lastSeenOwners: Map<City, player> = new Map(); // Remember last seen owner
	private minimapFrame: framehandle;
	private updateTimer: timer;
	private isActive: boolean; // Whether custom icons are active (only for world terrain)

	// Unit types to track on minimap
	private readonly TRACKED_UNIT_TYPES: number[] = [
		UNIT_ID.RIFLEMEN
	];

	// Minimap constants (corner minimap dimensions)
	private readonly MINIMAP_WIDTH = 0.140; // Minimap width in screen coordinates
	private readonly MINIMAP_HEIGHT = 0.140; // Minimap height in screen coordinates
	private readonly BUILDING_ICON_SIZE = 0.0035; // Icon size for regular cities
	private readonly UNIT_ICON_SIZE = 0.0030; // Icon size for regular units
	private readonly CAPITAL_ICON_SIZE = 0.0025; // Capital colored center size (smaller to show borders)
	private readonly CAPITAL_BORDER_INNER = 0.0035; // Capital inner border size (black ring)
	private readonly CAPITAL_BORDER_OUTER = 0.0045; // Capital outer border size (white ring)

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

		debugPrint('MinimapIconManager: Initialized for terrain: ' + MAP_TYPE);
		debugPrint('MinimapIconManager: Active: ' + this.isActive);

		if (!this.isActive) {
			return;
		}

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

		debugPrint('World bounds: ' + this.worldMinX + ', ' + this.worldMinY + ' to ' + this.worldMaxX + ', ' + this.worldMaxY);
		debugPrint('World size: ' + this.worldWidth + 'x' + this.worldHeight);
		debugPrint('Minimap frame handle: ' + (this.minimapFrame ? 'FOUND' : 'NULL'));
	}

	/**
	 * Initializes minimap icons for all cities.
	 * Should be called after all cities are created.
	 * NOTE: Should only be called for the local player (caller's responsibility).
	 */
	public initializeCityIcons(cities: City[]): void {
		if (!this.isActive) {
			return;
		}

		debugPrint(`MinimapIconManager: Creating icons for ${cities.length} cities`);

		// Create icons for all cities
		cities.forEach((city) => {
			this.createCityIcon(city);
		});

		debugPrint(`MinimapIconManager: Created ${this.cityIcons.size} icons`);

		// Start update timer (update every 1 second)
		this.startUpdateTimer();
	}

	/**
	 * Registers a unit if it is of a trackable type.
	 *Safe to call with any unit.
	 * @param unit - The unit to check and potentially track
	 */
	public registerIfValid(unit: unit): void {
		if (!this.isActive) return;

		const unitType = GetUnitTypeId(unit);

		if (this.TRACKED_UNIT_TYPES.includes(unitType)) {
			// Specific check for Riflemen: Must be a SPAWN unit (not trained from barracks)
			if (unitType === UNIT_ID.RIFLEMEN && !IsUnitType(unit, UNIT_TYPE.SPAWN)) {
				return;
			}

			// Check if already tracked to avoid duplicates
			if (!this.trackedUnits.has(unit)) {
				this.registerTrackedUnit(unit);
			}
		}
	}

	/**
	 * Unregisters a tracked unit (e.g. when loaded into transport)
	 * @param unit - The unit to stop tracking
	 */
	public unregisterTrackedUnit(unit: unit): void {
		if (!this.isActive) return;

		const iconFrame = this.trackedUnits.get(unit);
		if (iconFrame) {
			BlzDestroyFrame(iconFrame);
			this.trackedUnits.delete(unit);
			// Restore minimap display when untracking?
			// Usually we untrack when unit dies or loads.
			// If it loads, it's hidden anyway.
			// If we stop tracking for other reasons, we might want to show it again.
			// But for now, sticking to simple removal.
			BlzSetUnitBooleanField(unit, UNIT_BF_HIDE_MINIMAP_DISPLAY, false);
		}
	}

	/**
	 * Registers a moving unit to be tracked on the minimap.
	 * @param unit - The unit to track
	 */
	public registerTrackedUnit(unit: unit): void {
		if (!this.isActive) return;

		try {
			const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_MINIMAP, 0);

			// Hide the default minimap display for the unit
			BlzSetUnitBooleanField(unit, UNIT_BF_HIDE_MINIMAP_DISPLAY, true);

			// Create color icon frame
			const iconFrame = BlzCreateFrameByType('BACKDROP', 'MinimapUnitIcon', gameUI, '', 0);

			if (!iconFrame) {
				debugPrint('MinimapIconManager: Failed to create frame for unit');
				return;
			}

			// Set icon size (same as cities for now)
			BlzFrameSetSize(iconFrame, this.UNIT_ICON_SIZE, this.UNIT_ICON_SIZE);

			// Set level to render above minimap (Top level for units)
			BlzFrameSetLevel(iconFrame, 15);

			// Store the frame
			this.trackedUnits.set(unit, iconFrame);

			// Initial update
			const localPlayer = GetLocalPlayer();
			if (IsUnitVisible(unit, localPlayer)) {
				this.updateIconPosition(iconFrame, GetUnitX(unit), GetUnitY(unit));
				this.updateUnitIconColor(iconFrame, unit);
				BlzFrameSetVisible(iconFrame, true);
			} else {
				BlzFrameSetVisible(iconFrame, false);
			}
		} catch (e) {
			debugPrint('MinimapIconManager: Error registering unit - ' + e);
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

			// Create color icon frame
			const iconFrame = BlzCreateFrameByType('BACKDROP', 'MinimapCityIcon', gameUI, '', 0);

			if (!iconFrame) {
				debugPrint('MinimapIconManager: Failed to create frame for city');
				return;
			}

			// Set icon size
			BlzFrameSetSize(iconFrame, this.BUILDING_ICON_SIZE, this.BUILDING_ICON_SIZE);

			// Set level to render above minimap (and above border if present)
			BlzFrameSetLevel(iconFrame, 10);

			// Store the frame first (needed for updateIconColor)
			this.cityIcons.set(city, iconFrame);

			// Position the icon
			this.updateIconPosition(iconFrame, worldX, worldY);

			// Check initial visibility
			const localPlayer = GetLocalPlayer();
			const isVisible = IsUnitVisible(city.barrack.unit, localPlayer);

			// Set initial color based on owner and visibility
			this.updateIconColor(iconFrame, city, isVisible);

			// Make it visible
			BlzFrameSetVisible(iconFrame, true);
		} catch (e) {
			debugPrint('MinimapIconManager: Error creating icon - ' + e);
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

		// Minimap positioning (BOTTOM-left corner of screen in WC3)
		// The minimap doesn't start exactly at 0,0 - need offset
		// Adjust these values to align with actual minimap
		const minimapBaseX = 0.009; // Shift right (reduce to move icons left)
		const minimapBaseY = 0.004; // Shift up from bottom (reduce to move icons down)

		// Calculate position within minimap bounds
		const iconX = minimapBaseX + (coords.x * this.MINIMAP_WIDTH);
		const iconY = minimapBaseY + (coords.y * this.MINIMAP_HEIGHT);

		// Position absolutely on screen
		BlzFrameSetAbsPoint(iconFrame, FRAMEPOINT_CENTER, iconX, iconY);

		// Debug first few icons
		if (this.cityIcons.size <= 2) {
			debugPrint('MinimapIconManager: Icon #' + this.cityIcons.size + ' normalized: ' + coords.x + ', ' + coords.y);
			debugPrint('MinimapIconManager: Icon #' + this.cityIcons.size + ' absolute: ' + iconX + ', ' + iconY);
		}
	}

	/**
	 * Starts the periodic update timer.
	 */
	private startUpdateTimer(): void {
		this.updateTimer = CreateTimer();

		TimerStart(this.updateTimer, 0.2, true, () => {
			// Update all icon positions and colors
			// This runs every 0.2 seconds for smooth updates
			this.updateAllIcons();
		});
	}

	/**
	 * Updates all city icons (positions and visibility).
	 */
	private updateAllIcons(): void {
		const localPlayer = GetLocalPlayer();

		this.cityIcons.forEach((iconFrame, city) => {
			// Check if the city's barrack is visible through fog of war
			const isVisible = IsUnitVisible(city.barrack.unit, localPlayer);

			// Update position (in case anything changed)
			const worldX = city.barrack.defaultX;
			const worldY = city.barrack.defaultY;
			this.updateIconPosition(iconFrame, worldX, worldY);

			// Update border positions if this is a capital
			const innerBorder = this.cityBorders.get(city);
			const outerBorder = this.cityOuterBorders.get(city);
			if (innerBorder) {
				this.updateIconPosition(innerBorder, worldX, worldY);
			}
			if (outerBorder) {
				this.updateIconPosition(outerBorder, worldX, worldY);
			}

			// Update color based on owner and visibility
			this.updateIconColor(iconFrame, city, isVisible);
		});

		// Update tracked units
		const unitsToRemove: unit[] = [];
		this.trackedUnits.forEach((iconFrame, unit) => {
			// Check if unit is still valid and alive
			// Note: 0.405 is the death threshold in WC3
			if (GetUnitTypeId(unit) === 0 || GetWidgetLife(unit) <= 0.405) {
				unitsToRemove.push(unit);
				BlzFrameSetVisible(iconFrame, false);
				return;
			}

			// Check visibility
			if (IsUnitVisible(unit, localPlayer)) {
				// Update position
				this.updateIconPosition(iconFrame, GetUnitX(unit), GetUnitY(unit));
				// Update color
				this.updateUnitIconColor(iconFrame, unit);
				// Show icon
				BlzFrameSetVisible(iconFrame, true);
			} else {
				// Hide icon if in fog
				BlzFrameSetVisible(iconFrame, false);
			}
		});

		// Cleanup dead/removed units
		unitsToRemove.forEach((unit) => {
			const frame = this.trackedUnits.get(unit);
			if (frame) {
				BlzDestroyFrame(frame);
				this.trackedUnits.delete(unit);
			}
		});
	}

	/**
	 * Updates an icon's color based on the city's owner and fog of war visibility.
	 * @param iconFrame - The frame to update
	 * @param city - The city whose owner to check
	 * @param isVisible - Whether the city is visible through fog of war
	 */
	private updateIconColor(iconFrame: framehandle, city: City, isVisible: boolean): void {
		const localPlayer = GetLocalPlayer();
		let owner: player;

		if (isVisible) {
			// City is visible - update and remember the owner
			owner = city.getOwner();
			this.lastSeenOwners.set(city, owner);
		} else {
			// City is in fog of war - check if we've seen it before
			const lastSeenOwner = this.lastSeenOwners.get(city);
			if (!lastSeenOwner) {
				// Never seen this city - show as neutral gray
				BlzFrameSetTexture(iconFrame, 'ReplaceableTextures\\TeamColor\\TeamColor90.blp', 0, true);
				return;
			}
			// Use the last seen owner
			owner = lastSeenOwner;
		}

		// Check ally color filter mode
		// 0 = Player colors, 1/2 = Ally/Enemy colors
		const allyColorMode = GetAllyColorFilterState();

		// If the local player owns this city, show it in WHITE
		if (owner == localPlayer) {
			BlzFrameSetTexture(iconFrame, 'ReplaceableTextures\\TeamColor\\TeamColor99.blp', 0, true);
			return;
		}

		// If ally color mode is enabled (mode 1 or 2)
		if (allyColorMode > 0) {
			// Check if owner is a neutral player (Player 24+)
			const ownerId = GetPlayerId(owner);
			if (ownerId >= 24) {
				// Neutral player = Gray (standard WC3 neutral color)
				BlzFrameSetTexture(iconFrame, 'ReplaceableTextures\\TeamColor\\TeamColor90.blp', 0, true);
				return;
			}

			// Check if owner is ally or enemy
			if (IsPlayerAlly(owner, localPlayer)) {
				// Ally = White/Light gray
				BlzFrameSetTexture(iconFrame, 'ReplaceableTextures\\TeamColor\\TeamColor99.blp', 0, true);
			} else if (IsPlayerEnemy(owner, localPlayer)) {
				// Enemy = Red (Player 0 color)
				BlzFrameSetTexture(iconFrame, 'ReplaceableTextures\\TeamColor\\TeamColor00.blp', 0, true);
			} else {
				// Neutral = Gray (standard WC3 neutral color)
				BlzFrameSetTexture(iconFrame, 'ReplaceableTextures\\TeamColor\\TeamColor90.blp', 0, true);
			}
			return;
		}

		// Default: Use player colors (mode 0)
		// Use GetPlayerColor to get the actual color, then convert to integer
		const playerColor = GetPlayerColor(owner);
		const colorIndex = GetHandleId(playerColor); // Convert playercolor to integer

		// Validate color index (WC3 supports 24 player colors: 0-23)
		if (colorIndex < 0 || colorIndex > 23) {
			// Neutral/invalid = Gray
			BlzFrameSetTexture(iconFrame, 'ReplaceableTextures\\TeamColor\\TeamColor90.blp', 0, true);
			return;
		}

		const colorStr = colorIndex < 10 ? '0' + colorIndex : '' + colorIndex;
		const texture = 'ReplaceableTextures\\TeamColor\\TeamColor' + colorStr + '.blp';

		BlzFrameSetTexture(iconFrame, texture, 0, true);
	}

	/**
	 * Updates a unit icon's color based on the unit's owner.
	 * @param iconFrame - The frame to update
	 * @param unit - The unit whose owner to check
	 */
	private updateUnitIconColor(iconFrame: framehandle, unit: unit): void {
		// Used the ClientManager to resolve the real owner (maps Client -> Player)
		const owner = ClientManager.getInstance().getOwnerOfUnit(unit);
		const localPlayer = GetLocalPlayer();
		const allyColorMode = GetAllyColorFilterState();

		// If the local player owns this unit (or owns the client), show it in WHITE
		if (owner == localPlayer) {
			BlzFrameSetTexture(iconFrame, 'ReplaceableTextures\\TeamColor\\TeamColor99.blp', 0, true);
			return;
		}

		// If ally color mode is enabled (mode 1 or 2)
		// 1 = Ally/Enemy
		// 2 = Ally (Teal)/Enemy
		if (allyColorMode > 0) {
			const ownerId = GetPlayerId(owner as player);
			if (ownerId >= 24) {
				BlzFrameSetTexture(iconFrame, 'ReplaceableTextures\\TeamColor\\TeamColor90.blp', 0, true);
				return;
			}

			if (IsPlayerAlly(owner as player, localPlayer)) {
				BlzFrameSetTexture(iconFrame, 'ReplaceableTextures\\TeamColor\\TeamColor99.blp', 0, true);
			} else if (IsPlayerEnemy(owner as player, localPlayer)) {
				BlzFrameSetTexture(iconFrame, 'ReplaceableTextures\\TeamColor\\TeamColor00.blp', 0, true);
			} else {
				BlzFrameSetTexture(iconFrame, 'ReplaceableTextures\\TeamColor\\TeamColor90.blp', 0, true);
			}
			return;
		}

		// Default: Use player colors
		const playerColor = GetPlayerColor(owner as player);
		const colorIndex = GetHandleId(playerColor);

		if (colorIndex < 0 || colorIndex > 23) {
			BlzFrameSetTexture(iconFrame, 'ReplaceableTextures\\TeamColor\\TeamColor90.blp', 0, true);
			return;
		}

		const colorStr = colorIndex < 10 ? '0' + colorIndex : '' + colorIndex;
		const texture = 'ReplaceableTextures\\TeamColor\\TeamColor' + colorStr + '.blp';
		BlzFrameSetTexture(iconFrame, texture, 0, true);
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

			debugPrint('MinimapIconManager: Adding double-ring border for capital city');

			// Create outer border (white, largest)
			const outerBorderFrame = BlzCreateFrameByType('BACKDROP', 'MinimapCapitalOuterBorder', gameUI, '', 0);
			if (!outerBorderFrame) {
				debugPrint('MinimapIconManager: Failed to create outer border frame for capital');
				return;
			}

			// Set outer border size (same as regular city size)
			BlzFrameSetSize(outerBorderFrame, this.CAPITAL_BORDER_OUTER, this.CAPITAL_BORDER_OUTER);

			// Set white color for outer border
			BlzFrameSetTexture(outerBorderFrame, 'ReplaceableTextures\\TeamColor\\TeamColor99.blp', 0, true);

			// Set level to render above regular city icons (which are at level 10)
			BlzFrameSetLevel(outerBorderFrame, 11);

			// Position the outer border
			this.updateIconPosition(outerBorderFrame, worldX, worldY);

			// Make outer border visible
			BlzFrameSetVisible(outerBorderFrame, true);

			// Create inner border (black, medium size)
			const innerBorderFrame = BlzCreateFrameByType('BACKDROP', 'MinimapCapitalInnerBorder', gameUI, '', 0);
			if (!innerBorderFrame) {
				debugPrint('MinimapIconManager: Failed to create inner border frame for capital');
				return;
			}

			// Set inner border size (between outer border and capital icon)
			BlzFrameSetSize(innerBorderFrame, this.CAPITAL_BORDER_INNER, this.CAPITAL_BORDER_INNER);

			// Set black color for inner border
			BlzFrameSetTexture(innerBorderFrame, 'ReplaceableTextures\\TeamColor\\TeamColor24.blp', 0, true);

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
				const isVisible = IsUnitVisible(city.barrack.unit, localPlayer);
				this.updateIconColor(iconFrame, city, isVisible);
			}

			debugPrint('MinimapIconManager: Capital double-ring border created successfully');
		} catch (e) {
			debugPrint('MinimapIconManager: Error adding capital border - ' + e);
		}
	}

	/**
	 * Cleans up all icons (call on game reset).
	 */
	public cleanup(): void {
		if (!this.isActive) {
			return;
		}

		this.cityIcons.forEach((iconFrame) => {
			BlzDestroyFrame(iconFrame);
		});
		this.cityBorders.forEach((borderFrame) => {
			BlzDestroyFrame(borderFrame);
		});
		this.cityOuterBorders.forEach((outerBorderFrame) => {
			BlzDestroyFrame(outerBorderFrame);
		});
		this.trackedUnits.forEach((iconFrame) => {
			BlzDestroyFrame(iconFrame);
		});
		this.cityIcons.clear();
		this.cityBorders.clear();
		this.cityOuterBorders.clear();
		this.capitalIcons.clear();
		this.trackedUnits.clear();
		this.lastSeenOwners.clear();

		if (this.updateTimer) {
			DestroyTimer(this.updateTimer);
		}
	}
}
