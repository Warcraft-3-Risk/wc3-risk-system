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
	private framePool: framehandle[] = []; // Pool of unused frames for recycling
	private lastSeenOwners: Map<City, player> = new Map(); // Remember last seen owner
	private minimapFrame: framehandle;
	private updateTimer: timer;
	private isActive: boolean; // Whether custom icons are active (only for world terrain)
	private readonly COLOR_TEXTURES: string[] = []; // Pre-built texture path lookup table
	private cityLastTexture: Map<City, string> = new Map(); // Track last-applied texture per city frame
	private unitLastTexture: Map<unit, string> = new Map(); // Track last-applied texture per unit frame
	private unitsToRemove: unit[] = []; // Reused array to collect dead units for cleanup

	// Minimap constants (corner minimap dimensions)
	private readonly MINIMAP_WIDTH = 0.14; // Minimap width in screen coordinates
	private readonly MINIMAP_HEIGHT = 0.14; // Minimap height in screen coordinates
	private readonly BUILDING_ICON_SIZE = 0.004; // Icon size for regular cities
	private readonly UNIT_ICON_SIZE = 0.002; // Icon size for regular units
	private readonly CAPITAL_ICON_SIZE = 0.0025; // Capital colored center size (smaller to show borders)
	private readonly CAPITAL_BORDER_INNER = 0.0035; // Capital inner border size (black ring)
	private readonly CAPITAL_BORDER_OUTER = 0.0045; // Capital outer border size (white ring)
	private readonly INITIAL_POOL_SIZE = 2000; // Initial number of frames to create to avoid runtime spikes

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

		// Skip ally color mode 2 — only allow toggling between 0 and 1
		// Poll the native button state and correct mode 2 back to 0
		// Note: the main update loop also corrects mode 2 inside updateIconColor()
		const allyModeTimer = CreateTimer();
		TimerStart(allyModeTimer, 0.1, true, () => {
			if (GetAllyColorFilterState() === 2) {
				SetAllyColorFilterState(0);
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
		if (!this.trackedUnits.has(unit)) {
			this.registerTrackedUnit(unit);
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
			BlzFrameSetVisible(iconFrame, false);
			this.trackedUnits.delete(unit);
			this.unitLastTexture.delete(unit);
			this.framePool.push(iconFrame);
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
			this.trackedUnits.set(unit, iconFrame);

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
					`MinimapIconManager: Count of tracked units: ${this.trackedUnits.size}, Pool size: ${this.framePool.length}`,
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

		// Minimap positioning (BOTTOM-left corner of screen in WC3)
		// The minimap doesn't start exactly at 0,0 - need offset
		// Adjust these values to align with actual minimap
		const minimapBaseX = 0.009; // Shift right (reduce to move icons left)
		const minimapBaseY = 0.004; // Shift up from bottom (reduce to move icons down)

		// Calculate position within minimap bounds
		const iconX = minimapBaseX + coords.x * this.MINIMAP_WIDTH;
		const iconY = minimapBaseY + coords.y * this.MINIMAP_HEIGHT;

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

	/**
	 * Updates all city icons (positions and visibility).
	 */
	private updateAllIcons(): void {
		const localPlayer = GetLocalPlayer();
		const effectiveLocal = isReplay() ? getReplayObservedPlayer() : localPlayer;

		this.cityIcons.forEach((iconFrame, city) => {
			// Check if the city's barrack is visible through fog of war
			const isVisible = IsUnitVisible(city.barrack.unit, effectiveLocal);

			// City positions are static (defaultX/Y never change) — set once at creation, no update needed

			// Update color based on owner and visibility
			this.updateIconColor(iconFrame, city, isVisible, effectiveLocal);
		});

		// Update tracked units
		this.unitsToRemove.length = 0;
		this.trackedUnits.forEach((iconFrame, unit) => {
			// Check if unit is still valid and alive
			// Note: 0.405 is the death threshold in WC3
			if (GetUnitTypeId(unit) === 0 || GetWidgetLife(unit) <= 0.405) {
				this.unitsToRemove.push(unit);
				BlzFrameSetVisible(iconFrame, false);
				return;
			}

			// Check visibility
			if (IsUnitVisible(unit, effectiveLocal)) {
				// Update position
				this.updateIconPosition(iconFrame, GetUnitX(unit), GetUnitY(unit));
				// Update color
				this.updateUnitIconColor(iconFrame, unit, effectiveLocal);
				// Show icon
				BlzFrameSetVisible(iconFrame, true);
			} else {
				// Hide icon if in fog
				BlzFrameSetVisible(iconFrame, false);
			}
		});

		// Cleanup dead/removed units
		this.unitsToRemove.forEach((unit) => {
			const frame = this.trackedUnits.get(unit);
			if (frame) {
				BlzFrameSetVisible(frame, false);
				this.trackedUnits.delete(unit);
				this.unitLastTexture.delete(unit);
				this.framePool.push(frame);
			}
		});
	}

	/**
	 * Updates an icon's color based on the city's owner and fog of war visibility.
	 * @param iconFrame - The frame to update
	 * @param city - The city whose owner to check
	 * @param isVisible - Whether the city is visible through fog of war
	 */
	private updateIconColor(iconFrame: framehandle, city: City, isVisible: boolean, localPlayer: player): void {
		let owner: player;

		if (isVisible) {
			if (GetLocalPlayer() === localPlayer) {
				SetUnitVertexColor(city.barrack.unit, 255, 255, 255, 255);
				SetUnitVertexColor(city.cop, 255, 255, 255, 255);
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
		const allyColorMode = GetAllyColorFilterState();

		// If the local player owns this city, show it in WHITE
		if (owner === localPlayer) {
			this.setTextureCached(city, iconFrame, this.COLOR_TEXTURES[99], this.cityLastTexture);
			return;
		}

		// Ally Color 2 is not allowed
		if (allyColorMode === 2) {
			SetAllyColorFilterState(0);
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
				const allyTexture = isDeadInFFA ? this.COLOR_TEXTURES[0] : this.COLOR_TEXTURES[4];
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
		const allyColorMode = GetAllyColorFilterState();

		// If the local player owns this unit (or owns the shared slot), show it in WHITE
		if (owner === localPlayer) {
			this.setTextureCached(unit, iconFrame, this.COLOR_TEXTURES[99], this.unitLastTexture);
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
				const allyTexture = isDeadInFFA ? this.COLOR_TEXTURES[0] : this.COLOR_TEXTURES[4];
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
		this.framePool.forEach((frame) => {
			BlzDestroyFrame(frame);
		});
		this.cityIcons.clear();
		this.cityBorders.clear();
		this.cityOuterBorders.clear();
		this.capitalIcons.clear();
		this.trackedUnits.clear();
		this.framePool = [];
		this.lastSeenOwners.clear();
		this.cityLastTexture.clear();
		this.unitLastTexture.clear();
		this.unitsToRemove.length = 0;

		if (this.updateTimer) {
			DestroyTimer(this.updateTimer);
		}
	}
}
