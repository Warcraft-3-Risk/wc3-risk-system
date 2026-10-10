/**
 * World-to-minimap screen coordinate conversion.
 *
 * Extracted from the minimap icon system so a frame can be placed over the minimap without
 * pulling in a whole icon manager. The offsets below are hand-tuned against the default
 * console layout - if the icon drifts on a given map, these are the values to nudge.
 */

const MINIMAP_WIDTH: number = 0.14;
const MINIMAP_HEIGHT: number = 0.14;

// The default UI is 0.8 wide and always centred at X=0.4, so the console's left edge moves
// inwards towards 0.4 as the HUD scales down.
const UI_CENTER_X: number = 0.4;
const UI_WIDTH: number = 0.8;

// The minimap does not start exactly at the console's corner, so nudge in from it.
const MINIMAP_INSET_X: number = 0.009;
const MINIMAP_INSET_Y: number = 0.004;

let worldMinX: number = 0;
let worldMinY: number = 0;
let worldWidth: number = 1;
let worldHeight: number = 1;
let hudScale: number = 1.0;
let initialized: boolean = false;

/**
 * Caches the world bounds and HUD scale. Safe to call more than once.
 */
export function initMinimapCoords(): void {
	if (initialized) return;

	const worldBounds: rect = GetWorldBounds();

	worldMinX = GetRectMinX(worldBounds);
	worldMinY = GetRectMinY(worldBounds);
	worldWidth = GetRectMaxX(worldBounds) - worldMinX;
	worldHeight = GetRectMaxY(worldBounds) - worldMinY;

	// Guard against a degenerate map rect so we never divide by zero below.
	if (worldWidth <= 0) worldWidth = 1;
	if (worldHeight <= 0) worldHeight = 1;

	initialized = true;
}

/**
 * Positions a frame over the point on the minimap that corresponds to the given world coordinates.
 */
export function positionFrameOnMinimap(frame: framehandle, worldX: number, worldY: number): void {
	initMinimapCoords();

	const normalizedX: number = (worldX - worldMinX) / worldWidth;
	const normalizedY: number = (worldY - worldMinY) / worldHeight;

	const uiLeftEdgeX: number = UI_CENTER_X - (UI_WIDTH * hudScale) / 2.0;

	// The minimap sits in the bottom-left corner of the screen in WC3.
	const iconX: number = uiLeftEdgeX + MINIMAP_INSET_X * hudScale + normalizedX * (MINIMAP_WIDTH * hudScale);
	const iconY: number = MINIMAP_INSET_Y * hudScale + normalizedY * (MINIMAP_HEIGHT * hudScale);

	BlzFrameSetAbsPoint(frame, FRAMEPOINT_CENTER, iconX, iconY);
}
