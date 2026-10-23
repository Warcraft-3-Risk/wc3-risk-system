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

interface CapitalIconRecord {
	city: City;
	// Horizontal and vertical border bars, then the horizontal and vertical colored arms
	frames: framehandle[];
	lastOwner: player | undefined;
	lastColorMode: number | undefined;
	lastTexture: string | undefined;
}

/**
 * Draws the minimap ourselves: cities, moving units and spawner camouflage are rendered as frames
 * over the native minimap, and their native minimap icons are hidden.
 *
 * Only used in the promode modes (ProMode, Chaos). It stays completely inert until
 * {@link activate} is called from a promode state - every public entry point returns immediately
 * while inactive, so other modes keep the native minimap untouched and no frames, timers or
 * vertex colors are ever created for them.
 *
 * Cities keep fog-safe memory: an enemy city in fog keeps the color it was last seen with, and a
 * never-seen city stays gray, so ownership changes under fog are not revealed.
 *
 * Outside promode there is a second, much smaller mode: capitals only ({@link setCapital}). It draws
 * capitals as an outlined cross in the owner's color and hides their native minimap display,
 * everything else keeps the native minimap. It only starts once a city becomes a capital, so modes
 * without capitals never create anything.
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
	private isBaseReady: boolean = false;
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

	// Capitals-only mode: capital cross icons, with frames recycled when a capital turns back into a city.
	// The cross is two colored bars over two slightly larger black bars, which form its outline so it
	// stays readable next to massed units.
	private capitalRecords: CapitalIconRecord[] = [];
	private capitalFramePool: framehandle[][] = [];
	private capitalRevealPending: Set<City> = new Set(); // Capitals whose fog memory refresh waits for fog to be on
	private heldCapitalReveals: fogmodifier[] = []; // Reveals of new capitals, kept until the match starts
	private readonly CAPITAL_ARM_LENGTH = 0.0105; // Tip to tip length of the cross arms
	private readonly CAPITAL_ARM_THICKNESS = 0.0017; // Thickness of the arms, kept above ~3 pixels so it does not flicker between 2 and 3
	private readonly CAPITAL_BORDER = 0.0007; // Width of the black outline around the cross
	private readonly CAPITAL_BORDER_FRAMES = 2; // Leading entries of a record's frames that are outline, the rest take the owner color
	private readonly CAPITAL_REVEAL_RADIUS = 300; // Large enough to cover the fog grid around the buildings, small enough to show little else
	private readonly CAPITAL_REVEAL_DURATION = 0.5; // Long enough for a vision update to refresh the fog memory
	private readonly CAPITAL_BORDER_TEXTURE = 'ReplaceableTextures\\CameraMasks\\Black_mask.blp';

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

		// Capital icons are only drawn outside promode - promode draws every city itself
		this.clearCapitals();

		this.isActive = true;
		this.ensureBase();

		this.delayedTrackTimer = CreateTimer();

		const cities: City[] = Array.from(CityToCountry.keys());

		cities.forEach((city) => {
			this.createCityIcon(city);
		});
		this.registerSpawners(cities);

		debugPrint(`MinimapIconManager: Activated with ${this.cityIcons.size} city icons`);

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

	/**
	 * Sets up what both modes share: the texture table, world bounds, HUD scale tracking and the update timer.
	 * Runs once, from whichever mode starts first.
	 */
	private ensureBase(): void {
		if (this.isBaseReady) return;

		this.isBaseReady = true;

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

		// Follow HUD scale and window size changes so the icons stay aligned with the minimap.
		// The window size matters for the capital icons, which are snapped to whole screen pixels.
		let lastHudScale = -1;
		let lastClientWidth = BlzGetLocalClientWidth();
		let lastClientHeight = BlzGetLocalClientHeight();
		TimerStart(CreateTimer(), 0.1, true, () => {
			const currentScale = this.consoleUI ? BlzFrameGetWidth(this.consoleUI) / 0.8 : 1.0;
			const clientWidth = BlzGetLocalClientWidth();
			const clientHeight = BlzGetLocalClientHeight();

			if ((currentScale !== lastHudScale && currentScale > 0) || clientWidth !== lastClientWidth || clientHeight !== lastClientHeight) {
				if (currentScale > 0) {
					lastHudScale = currentScale;
					this.hudScale = currentScale;
				}

				lastClientWidth = clientWidth;
				lastClientHeight = clientHeight;
				this.repositionAllStaticIcons();
			}
		});

		this.startUpdateTimer();
	}

	/**
	 * Capitals-only mode: called whenever a city becomes a capital or turns back into a normal city.
	 * A capital gets a cross icon and its native minimap display hidden, a former capital gets its
	 * native display back. Ignored in promode, which already draws every city.
	 *
	 * @param beforeMatchStart - True while the match has not started yet. A new capital is then revealed
	 * to every player until {@link releaseCapitalReveals} is called once the countdown is over.
	 */
	public setCapital(city: City, isCapital: boolean, beforeMatchStart: boolean): void {
		if (this.isActive) return;

		const index = this.capitalRecords.findIndex((record) => record.city === city);

		if (isCapital) {
			if (index !== -1) return;

			this.ensureBase();
			this.createCapitalIcon(city, beforeMatchStart);
		} else if (index !== -1) {
			this.removeCapitalAt(index);
		}
	}

	private createCapitalIcon(city: City, beforeMatchStart: boolean): void {
		this.setCapitalMinimapHidden(city, true, beforeMatchStart);

		let frames = this.capitalFramePool.pop();

		if (!frames) {
			const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_MINIMAP, 0);
			frames = [];

			for (let i = 0; i < 4; i++) {
				const frame = BlzCreateFrameByType('BACKDROP', 'MinimapCapitalIcon', gameUI, '', 0);
				// Outline below the colored arms
				BlzFrameSetLevel(frame, i < this.CAPITAL_BORDER_FRAMES ? 9 : 10);
				frames.push(frame);
			}

			// Sizes are set in positionCapitalIcon, since they depend on the screen resolution
			BlzFrameSetTexture(frames[0], this.CAPITAL_BORDER_TEXTURE, 0, true);
			BlzFrameSetTexture(frames[1], this.CAPITAL_BORDER_TEXTURE, 0, true);
		}

		const record: CapitalIconRecord = {
			city,
			frames,
			lastOwner: undefined,
			lastColorMode: undefined,
			lastTexture: undefined,
		};

		this.capitalRecords.push(record);
		this.positionCapitalIcon(record);
		this.updateCapitalIconColor(record, GetLocalPlayer(), GetAllyColorFilterState());

		for (let i = 0; i < frames.length; i++) {
			BlzFrameSetVisible(frames[i], true);
		}
	}

	private removeCapitalAt(index: number): void {
		const record = this.capitalRecords[index];

		this.setCapitalMinimapHidden(record.city, false, false);

		for (let i = 0; i < record.frames.length; i++) {
			BlzFrameSetVisible(record.frames[i], false);
		}

		this.capitalFramePool.push(record.frames);
		this.capitalRecords.splice(index, 1);
	}

	/**
	 * Hides or shows a capital's barracks and circle of power on the native minimap.
	 *
	 * The hide flag only applies to what a player currently sees: a fogged building keeps showing the
	 * minimap image it was last seen with. So both buildings are briefly revealed to every player,
	 * which refreshes that remembered image with the new flag. The engine only updates that memory
	 * while fog is on, and capitals are set up while fog is off, so the reveal waits for fog if needed.
	 *
	 * Capitals set up before the match starts stay revealed until the countdown is over instead, which
	 * covers the moment fog turns on for the match.
	 */
	private setCapitalMinimapHidden(city: City, hidden: boolean, holdUntilMatchStart: boolean): void {
		BlzSetUnitBooleanField(city.barrack.unit, UNIT_BF_HIDE_MINIMAP_DISPLAY, hidden);
		BlzSetUnitBooleanField(city.cop, UNIT_BF_HIDE_MINIMAP_DISPLAY, hidden);

		if (holdUntilMatchStart) {
			this.heldCapitalReveals.push(...this.createCapitalReveal(city));
		} else if (IsFogEnabled()) {
			this.revealCapitalBriefly(city);
		} else {
			this.capitalRevealPending.add(city);
		}
	}

	/**
	 * Reveals a capital's buildings to every player for a moment, so their fog memory picks up the
	 * current minimap hide flag. Runs from synced code only, so every client creates the same handles.
	 */
	private revealCapitalBriefly(city: City): void {
		const modifiers = this.createCapitalReveal(city);

		const timer = CreateTimer();
		TimerStart(timer, this.CAPITAL_REVEAL_DURATION, false, () => {
			this.destroyCapitalReveal(modifiers);
			DestroyTimer(timer);
		});
	}

	/**
	 * Ends the reveals of the capitals set up before the match. Called once the countdown is over.
	 */
	public releaseCapitalReveals(): void {
		this.destroyCapitalReveal(this.heldCapitalReveals);
		this.heldCapitalReveals = [];
	}

	private createCapitalReveal(city: City): fogmodifier[] {
		const units = [city.barrack.unit, city.cop];
		const modifiers: fogmodifier[] = [];

		for (let p = 0; p < bj_MAX_PLAYERS; p++) {
			const player = Player(p);

			if (GetPlayerSlotState(player) != PLAYER_SLOT_STATE_PLAYING) continue;

			for (let i = 0; i < units.length; i++) {
				const modifier = CreateFogModifierRadius(
					player,
					FOG_OF_WAR_VISIBLE,
					GetUnitX(units[i]),
					GetUnitY(units[i]),
					this.CAPITAL_REVEAL_RADIUS,
					true,
					false
				);

				FogModifierStart(modifier);
				modifiers.push(modifier);
			}
		}

		return modifiers;
	}

	private destroyCapitalReveal(modifiers: fogmodifier[]): void {
		for (let i = 0; i < modifiers.length; i++) {
			FogModifierStop(modifiers[i]);
			DestroyFogModifier(modifiers[i]);
		}
	}

	/**
	 * Runs the reveals that waited for fog. Called from the update timer, which is synced, and
	 * IsFogEnabled is the same on every client, so all clients create the fog modifiers together.
	 */
	private revealPendingCapitals(): void {
		if (this.capitalRevealPending.size === 0 || !IsFogEnabled()) return;

		this.capitalRevealPending.forEach((city) => this.revealCapitalBriefly(city));
		this.capitalRevealPending.clear();
	}

	private clearCapitals(): void {
		for (let i = this.capitalRecords.length - 1; i >= 0; i--) {
			this.removeCapitalAt(i);
		}
	}

	/**
	 * Centers every part of the cross on the capital's minimap point and sizes it.
	 *
	 * The center and all sizes are snapped to whole screen pixels. Otherwise a capital whose center
	 * falls between two pixels gets its arm and outline edges rounded in different directions,
	 * which makes the outline thicker on one side.
	 */
	private positionCapitalIcon(record: CapitalIconRecord): void {
		const frames = record.frames;
		let centerX = this.getMinimapX(record.city.barrack.defaultX);
		let centerY = this.getMinimapY(record.city.barrack.defaultY);
		let length = this.CAPITAL_ARM_LENGTH;
		let thickness = this.CAPITAL_ARM_THICKNESS;
		let border = this.CAPITAL_BORDER;

		const clientWidth = BlzGetLocalClientWidth();
		const clientHeight = BlzGetLocalClientHeight();

		if (clientWidth > 0 && clientHeight > 0) {
			// Frame coordinates span 0.6 vertically; horizontally the 4:3 area is centered in the window
			const pixelsPerUnit = clientHeight / 0.6;
			const originX = (clientWidth - (clientHeight * 4) / 3) / 2;

			const thicknessPx = Math.max(1, Math.round(thickness * pixelsPerUnit));
			const borderPx = Math.max(1, Math.round(border * pixelsPerUnit));
			let lengthPx = Math.max(thicknessPx, Math.round(length * pixelsPerUnit));

			// Both bars share the center, so length and thickness need the same parity to sit on whole pixels
			if ((lengthPx - thicknessPx) % 2 !== 0) lengthPx++;

			// An odd size is centered on a pixel's middle, an even size on a pixel edge
			const pixelX = originX + centerX * pixelsPerUnit;
			const pixelY = centerY * pixelsPerUnit;
			const snappedX = thicknessPx % 2 === 1 ? Math.floor(pixelX) + 0.5 : Math.round(pixelX);
			const snappedY = thicknessPx % 2 === 1 ? Math.floor(pixelY) + 0.5 : Math.round(pixelY);

			centerX = (snappedX - originX) / pixelsPerUnit;
			centerY = snappedY / pixelsPerUnit;
			length = lengthPx / pixelsPerUnit;
			thickness = thicknessPx / pixelsPerUnit;
			border = borderPx / pixelsPerUnit;
		}

		BlzFrameSetSize(frames[0], length + 2 * border, thickness + 2 * border);
		BlzFrameSetSize(frames[1], thickness + 2 * border, length + 2 * border);
		BlzFrameSetSize(frames[2], length, thickness);
		BlzFrameSetSize(frames[3], thickness, length);

		for (let i = 0; i < frames.length; i++) {
			BlzFrameSetAbsPoint(frames[i], FRAMEPOINT_CENTER, centerX, centerY);
		}
	}

	/**
	 * Colors a capital by its current owner, also in fog. Capitals and their owners are public in the
	 * capitals mode, so unlike the promode city icons there is no fog memory to keep.
	 */
	private updateCapitalIconColor(record: CapitalIconRecord, localPlayer: player, allyColorMode: number): void {
		const texture = this.getOwnerTexture(record.city.getOwner(), localPlayer, allyColorMode);

		if (record.lastTexture === texture) return;

		record.lastTexture = texture;

		for (let i = this.CAPITAL_BORDER_FRAMES; i < record.frames.length; i++) {
			BlzFrameSetTexture(record.frames[i], texture, 0, true);
		}
	}

	private updateCapitalIcons(localPlayer: player, allyColorMode: number): void {
		this.revealPendingCapitals();

		for (let c = 0; c < this.capitalRecords.length; c++) {
			const record = this.capitalRecords[c];
			const currentOwner = record.city.getOwner();

			// Dirty check: only recolor when the owner or the ally color filter changed
			if (record.lastOwner !== currentOwner || record.lastColorMode !== allyColorMode) {
				record.lastOwner = currentOwner;
				record.lastColorMode = allyColorMode;

				this.updateCapitalIconColor(record, localPlayer, allyColorMode);
			}
		}
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
		BlzFrameSetAbsPoint(iconFrame, FRAMEPOINT_CENTER, this.getMinimapX(worldX), this.getMinimapY(worldY));
	}

	private getMinimapX(worldX: number): number {
		const normalizedX = (worldX - this.worldMinX) / this.worldWidth;

		// The default UI is 0.8 wide and always centered at X=0.4, so the console's left edge
		// moves inwards towards 0.4 as the HUD scales down.
		const uiLeftEdgeX = 0.4 - (0.8 * this.hudScale) / 2.0;

		// The minimap sits in the bottom-left corner, slightly inset from the console's corner
		return uiLeftEdgeX + 0.009 * this.hudScale + normalizedX * (this.MINIMAP_WIDTH * this.hudScale);
	}

	private getMinimapY(worldY: number): number {
		const normalizedY = (worldY - this.worldMinY) / this.worldHeight;

		return 0.004 * this.hudScale + normalizedY * (this.MINIMAP_HEIGHT * this.hudScale);
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

		this.capitalRecords.forEach((record) => this.positionCapitalIcon(record));
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

		// Capitals-only mode has nothing else to draw
		if (!this.isActive) {
			this.updateCapitalIcons(localPlayer, allyColorMode);
			return;
		}

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
