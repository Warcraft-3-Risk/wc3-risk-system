import { City } from '../city/city';
import { debugPrint } from '../utils/debug-print';

/**
 * Manages custom minimap icons using SimpleFrames for cities.
 * This allows for custom-sized icons between unit and building size.
 */
export class MinimapIconManager {
	private static instance: MinimapIconManager;
	private cityIcons: Map<City, framehandle> = new Map();
	private lastSeenOwners: Map<City, player> = new Map(); // Remember last seen owner
	private minimapFrame: framehandle;
	private updateTimer: timer;

	// Minimap constants (corner minimap dimensions)
	private readonly MINIMAP_WIDTH = 0.140; // Minimap width in screen coordinates
	private readonly MINIMAP_HEIGHT = 0.140; // Minimap height in screen coordinates
	private readonly ICON_SIZE = 0.0035; // Icon size

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

		debugPrint('MinimapIconManager: Initialized');
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
	 * Creates a SimpleFrame icon for a city on the minimap.
	 */
	private createCityIcon(city: City): void {
		try {
			// Create backdrop frame as child of game UI (NOT minimap)
			const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_MINIMAP, 0);
			const iconFrame = BlzCreateFrameByType('BACKDROP', 'MinimapCityIcon', gameUI, '', 0);

			if (!iconFrame) {
				debugPrint('MinimapIconManager: Failed to create frame for city');
				return;
			}

			// Set icon size
			BlzFrameSetSize(iconFrame, this.ICON_SIZE, this.ICON_SIZE);

			// Set level to render above minimap
			BlzFrameSetLevel(iconFrame, 10);

			// Store the frame first (needed for updateIconColor)
			this.cityIcons.set(city, iconFrame);

			// Calculate and set initial position
			const worldX = city.barrack.defaultX;
			const worldY = city.barrack.defaultY;
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

			// Update color based on owner and visibility
			this.updateIconColor(iconFrame, city, isVisible);
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

		// Validate color index
		if (colorIndex < 0 || colorIndex > 11) {
			// Neutral/invalid = Gray
			BlzFrameSetTexture(iconFrame, 'ReplaceableTextures\\TeamColor\\TeamColor90.blp', 0, true);
			return;
		}

		const colorStr = colorIndex < 10 ? '0' + colorIndex : '' + colorIndex;
		const texture = 'ReplaceableTextures\\TeamColor\\TeamColor' + colorStr + '.blp';

		BlzFrameSetTexture(iconFrame, texture, 0, true);
	}

	/**
	 * Cleans up all icons (call on game reset).
	 */
	public cleanup(): void {
		this.cityIcons.forEach((iconFrame) => {
			BlzDestroyFrame(iconFrame);
		});
		this.cityIcons.clear();
		this.lastSeenOwners.clear();

		if (this.updateTimer) {
			DestroyTimer(this.updateTimer);
		}
	}
}
