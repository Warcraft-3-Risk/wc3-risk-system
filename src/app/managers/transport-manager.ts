import { ABILITY_ID } from '../../configs/ability-id';
import { SharedSlotManager } from '../game/services/shared-slot-manager';
import { UnitLagManager } from '../game/services/unit-lag-manager';
import { TimedEvent } from '../libs/timer/timed-event';
import { TimedEventManager } from '../libs/timer/timed-event-manager';
import { debugPrint } from '../utils/debug-print';
import { DC, DEBUG_PRINTS } from 'src/configs/game-settings';
import { ErrorMsg } from '../utils/messages';
import { UNIT_TYPE } from '../utils/unit-types';
import { ORDER_ID } from '../../configs/order-id';
import { MinimapIconManager } from './minimap-icon-manager';
import { CityToCountry } from '../country/country-map';
import { City } from '../city/city';
import { PatrolState, TransportPatrolContext, TransportPatrolLogic } from '../utils/transport-patrol-logic';
import { TransportAutoLoadContext, TransportAutoLoadLogic } from '../utils/transport-auto-load-logic';
import { TransportUnloadContext, TransportUnloadLogic } from '../utils/transport-unload-logic';

import { TransportTooltipLogic } from '../utils/transport-tooltip-logic';
import { EDITOR_DEVELOPER_MODE } from 'src/configs/game-settings';
import { AllyColorFilterManager } from './ally-color-filter-manager';

type Transport = {
	unit: unit;
	cargo: unit[];
	effect: effect | undefined;
	duration: number;
	autoloadEnabled: boolean;
	loadTarget: unit;
	unloadTargetX: number;
	unloadTargetY: number;
	tooltipFrame: { box: framehandle; text: framehandle } | undefined;
	patrolEnabled: boolean;
	patrolState: PatrolState;
	patrolDestX: number;
	patrolDestY: number;
	patrolOriginX: number;
	patrolOriginY: number;
	patrolLoadTimer: number;
	patrolEvent: TimedEvent | undefined;
	isScriptOrdering: boolean;
	pathingDisableDuration: number;
	orderedUnits: unit[];
	// EPAS Phase 0 fields
	epasActive: boolean;
	epasPortCenterX: number;
	epasPortCenterY: number;
	epasSafeRadius: number;
	epasOriginalDestX: number;
	epasOriginalDestY: number;
	epasPortName: string;
	epasLastX: number;
	epasLastY: number;
};

const AUTO_LOAD_DISTANCE: number = 450;
const AUTO_LOAD_DURATION: number = 180;
const MAX_UNLOAD_DISTANCE: number = 300;

// ─── EPAS Phase 0 Constants ──────────────────────────────────────────────────
const PORT_GUARD_ATTACK_RANGE: number = 600;
const EPAS_BUFFER: number = 300;
const EPAS_SAFE_RADIUS: number = PORT_GUARD_ATTACK_RANGE + EPAS_BUFFER;
const EPAS_PI: number = 3.141592653589793;
const EPAS_ARC_STEP_ANGLE: number = EPAS_PI / 4; // 45 degrees: how far ahead on the arc to target each tick
const EPAS_RADIANS_TO_DEGREES: number = 180 / EPAS_PI;
const EPAS_EXIT_OVERSHOOT: number = 300; // how far past the safe radius to target the exit waypoint

type PortData = {
	city: City;
	portUnit: unit;
	centerX: number;
	centerY: number;
	safeRadius: number;
	enterTrigger: trigger;
	portName: string;
};

const AllPortData: PortData[] = [];

/**
 * Manages transport units and their cargo.
 * To be used in conjunction with TriggerRegisterPlayerUnitEvent.
 * EVENT_PLAYER_UNIT_LOADED specific event variables:
 * - GetTransportUnit: The transport being loaded into.
 * - GetLoadedUnit: The unit being loaded.
 * - GetTriggerUnit: The unit being loaded.
 * Helper functions:
 * - IsUnitInTransport: Check if given unit is loaded into given transport.
 * - IsUnitLoaded: Check if given unit is loaded into any transport.
 */
export class TransportManager {
	// Global queue for delayed minimap re-tracking after unload.
	// A persistent 0.1s repeating timer drains this queue each tick.
	private static delayedTrackQueue: unit[] = [];
	private static delayedTrackTimer: timer = CreateTimer();
	private static instance: TransportManager;
	private transports: Map<unit, Transport>;
	private transportList: Transport[] = [];
	private autoLoadingTransports: Transport[] = [];
	private autoLoadTimer: timer = CreateTimer();
	private renderTimer: timer = CreateTimer();
	private allOrderedUnits: Set<unit> = new Set<unit>();
	private tooltipCtxCounter: number = 2000; // Start high to avoid collision with standard context ids

	/**
	 * Gets the singleton instance of the TransportManager.
	 * @returns The singleton instance.
	 */
	public static getInstance() {
		if (this.instance === undefined) {
			this.instance = new TransportManager();
		}

		return this.instance;
	}

	/**
	 * Private constructor to initialize the TransportManager.
	 */
	private constructor() {
		this.transports = new Map<unit, Transport>();

		TimerStart(this.autoLoadTimer, 1.0, true, () => this.onAutoLoadTick());

		// Persistent timer to process delayed minimap re-tracking after unloads
		TimerStart(TransportManager.delayedTrackTimer, 0.1, true, () => this.processDelayedTrackQueue());

		// Unit load management
		// Handler for order queued for the load ability start
		this.onLoadStart();
		// Handler for order execution once unit reached destination point for the load ability
		this.onLoadAction();
		// Handler for order queued for the load ability finish
		this.onLoadFinish();

		// Unit unload management
		// Handler for order queued for the unload ability start
		this.onUnloadStart();
		// Handler for order queued by clicking the unit icon in the transport ship for the unload ability
		this.onUnloadUnitStart();
		// Handler for order execution once unit reached destination point for the unload ability
		this.onUnloadAction();
		// Handler for order queued for the unload ability finish
		this.onUnloadFinish();

		// Autoload management
		this.onAutoLoadOn();

		// Patrol management
		this.onPatrolStart();
		this.onPatrolOrder();

		TimerStart(this.renderTimer, 0.02, true, () => this.renderTooltips());
	}

	/**
	 * Renders UI tooltips above transport ships for observers showing their cargo load.
	 */
	private renderTooltips(): void {
		const isObserver = EDITOR_DEVELOPER_MODE || IsPlayerObserver(GetLocalPlayer());
		const activeCount = this.transportList.length;

		for (let i = 0; i < activeCount; i++) {
			const transport = this.transportList[i];
			if (!transport.tooltipFrame) continue;

			if (!UnitAlive(transport.unit)) {
				BlzFrameSetVisible(transport.tooltipFrame.box, false);
				BlzFrameSetVisible(transport.tooltipFrame.text, false);
				continue;
			}

			const ux = GetUnitX(transport.unit);
			const uy = GetUnitY(transport.unit);
			const [sx, sy, onScreen] = World2Screen(ux, uy, 0);

			if (TransportTooltipLogic.isVisible(isObserver, onScreen, sy, transport.cargo.length)) {
				const text = TransportTooltipLogic.getTooltipText(transport.cargo.length, 10);
				BlzFrameSetText(transport.tooltipFrame.text, text);
				BlzFrameSetSize(transport.tooltipFrame.text, 0.045, 0.012);
				BlzFrameSetAbsPoint(transport.tooltipFrame.text, FRAMEPOINT_TOP, sx, sy - 0.025);

				BlzFrameSetVisible(transport.tooltipFrame.box, true);
				BlzFrameSetVisible(transport.tooltipFrame.text, true);
			} else {
				BlzFrameSetVisible(transport.tooltipFrame.box, false);
				BlzFrameSetVisible(transport.tooltipFrame.text, false);
			}
		}
	}

	// ─── EPAS Phase 0 ────────────────────────────────────────────────────────

	/**
	 * Call once AFTER all cities have been constructed.
	 * Builds PortData for every port city and registers enter-range triggers.
	 */
	public initializeEPAS(): void {
		const allCities = Array.from(CityToCountry.keys());
		const portCities = allCities.filter((city) => city.isPort());

		debugPrint(`[EPAS] Initializing EPAS for ${portCities.length} port cities`);

		for (const city of portCities) {
			const portUnit = city.barrack.unit;
			const cx = GetUnitX(portUnit);
			const cy = GetUnitY(portUnit);
			const portName = GetUnitName(portUnit);

			const portData: PortData = {
				city,
				portUnit,
				centerX: cx,
				centerY: cy,
				safeRadius: EPAS_SAFE_RADIUS,
				enterTrigger: null!,
				portName,
			};

			const trig = CreateTrigger();
			TriggerRegisterUnitInRange(trig, portUnit, EPAS_SAFE_RADIUS, null);
			TriggerAddCondition(
				trig,
				Condition(() => this.onPortRangeEnter(portData))
			);
			portData.enterTrigger = trig;

			AllPortData.push(portData);

			debugPrint(`[EPAS] Registered port: ${portName} at (${cx}, ${cy}), safeRadius=${EPAS_SAFE_RADIUS}`);
		}

		debugPrint(`[EPAS] EPAS initialization complete`);
	}

	private onPortRangeEnter(portData: PortData): boolean {
		const entering = GetTriggerUnit();

		debugPrint(`[EPAS] Unit entered range of port: ${portData.portName}`);

		// 1. Is it a tracked transport?
		const transport = this.transports.get(entering);
		if (!transport) {
			debugPrint(`[EPAS] >> Not a tracked transport — ignoring`);
			return false;
		}

		// 2. Is patrol enabled?
		if (!transport.patrolEnabled) {
			debugPrint(`[EPAS] >> Transport not patrolling — ignoring`);
			return false;
		}

		// 3. Is state MOVING or RETURNING?
		if (transport.patrolState !== PatrolState.MOVING && transport.patrolState !== PatrolState.RETURNING) {
			debugPrint(`[EPAS] >> Transport not in MOVING/RETURNING state (state=${transport.patrolState}) — ignoring`);
			return false;
		}

		// 4. Is EPAS already active?
		if (transport.epasActive) {
			debugPrint(`[EPAS] >> EPAS already active for this transport — ignoring`);
			return false;
		}

		// 5. Is port enemy of transport?
		if (!IsUnitEnemy(portData.portUnit, GetOwningPlayer(transport.unit))) {
			debugPrint(`[EPAS] >> Port is not enemy — ignoring`);
			return false;
		}

		// 6. Heading-toward-port check (dot product using destination vector)
		const tx = GetUnitX(transport.unit);
		const ty = GetUnitY(transport.unit);
		const destX = transport.patrolState === PatrolState.MOVING ? transport.patrolDestX : transport.patrolOriginX;
		const destY = transport.patrolState === PatrolState.MOVING ? transport.patrolDestY : transport.patrolOriginY;

		// 6a. Skip if destination is inside this port's safe area (ship needs to reach it)
		const destToPortDx = destX - portData.centerX;
		const destToPortDy = destY - portData.centerY;
		if (destToPortDx * destToPortDx + destToPortDy * destToPortDy <= portData.safeRadius * portData.safeRadius) {
			debugPrint(`[EPAS] >> Destination is inside this port's safe area — ignoring`);
			return false;
		}

		const toDestX = destX - tx;
		const toDestY = destY - ty;
		const toPortX = portData.centerX - tx;
		const toPortY = portData.centerY - ty;
		const dot = toDestX * toPortX + toDestY * toPortY;

		debugPrint(`[EPAS] >> Heading check: dot=${dot}`);

		if (dot <= 0) {
			debugPrint(`[EPAS] >> Transport heading AWAY from port — ignoring`);
			return false;
		}

		debugPrint(`[EPAS] >> All checks passed — ACTIVATING EPAS for port: ${portData.portName}`);

		this.activateEPAS(transport, portData);
		return false;
	}

	private activateEPAS(transport: Transport, portData: PortData): void {
		const tx = GetUnitX(transport.unit);
		const ty = GetUnitY(transport.unit);

		transport.epasActive = true;
		transport.epasPortCenterX = portData.centerX;
		transport.epasPortCenterY = portData.centerY;
		transport.epasSafeRadius = portData.safeRadius;
		transport.epasPortName = portData.portName;

		// Save original destination so we can resume on exit
		if (transport.patrolState === PatrolState.MOVING) {
			transport.epasOriginalDestX = transport.patrolDestX;
			transport.epasOriginalDestY = transport.patrolDestY;
		} else {
			transport.epasOriginalDestX = transport.patrolOriginX;
			transport.epasOriginalDestY = transport.patrolOriginY;
		}

		debugPrint(`[EPAS] ACTIVATED for port: ${portData.portName}`);
		debugPrint(`[EPAS] >> Transport position: (${tx}, ${ty})`);
		debugPrint(`[EPAS] >> Patrol state: ${transport.patrolState === PatrolState.MOVING ? 'MOVING' : 'RETURNING'}`);
		debugPrint(`[EPAS] >> Original destination saved: (${transport.epasOriginalDestX}, ${transport.epasOriginalDestY})`);
		debugPrint(`[EPAS] >> Safe radius: ${portData.safeRadius}`);

		// Seed position tracking for velocity computation
		transport.epasLastX = tx;
		transport.epasLastY = ty;

		// Issue first avoidance move
		this.issueEPASMoveOrder(transport);
	}

	private deactivateEPAS(transport: Transport): void {
		debugPrint(`[EPAS] DEACTIVATED — exited safe radius of port: ${transport.epasPortName}`);
		debugPrint(`[EPAS] >> Resuming patrol to original destination: (${transport.epasOriginalDestX}, ${transport.epasOriginalDestY})`);

		transport.epasActive = false;

		// Resume original patrol destination
		transport.isScriptOrdering = true;
		IssuePointOrder(transport.unit, 'move', transport.epasOriginalDestX, transport.epasOriginalDestY);
		transport.isScriptOrdering = false;
	}

	private issueEPASMoveOrder(transport: Transport): void {
		const tx = GetUnitX(transport.unit);
		const ty = GetUnitY(transport.unit);

		// Current angle from port center to ship
		const angleToShip = Atan2(ty - transport.epasPortCenterY, tx - transport.epasPortCenterX);

		// Compute actual velocity from position delta (updated each tick)
		let vx = tx - transport.epasLastX;
		let vy = ty - transport.epasLastY;
		const speed = vx * vx + vy * vy;

		// If ship hasn't moved (first tick or stuck), fall back to ship→dest direction
		if (speed < 1) {
			vx = transport.epasOriginalDestX - tx;
			vy = transport.epasOriginalDestY - ty;
		}

		const toShipX = tx - transport.epasPortCenterX;
		const toShipY = ty - transport.epasPortCenterY;

		// 2D cross product: positive = ship moving CCW around port, negative = CW
		const cross = toShipX * vy - toShipY * vx;
		const step = cross >= 0 ? EPAS_ARC_STEP_ANGLE : -EPAS_ARC_STEP_ANGLE;

		const targetAngle = angleToShip + step;

		// Waypoint just outside the safe radius so the ship exits the zone
		const exitRadius = transport.epasSafeRadius + EPAS_EXIT_OVERSHOOT;
		const wpX = transport.epasPortCenterX + exitRadius * Cos(targetAngle);
		const wpY = transport.epasPortCenterY + exitRadius * Sin(targetAngle);

		transport.isScriptOrdering = true;
		IssuePointOrder(transport.unit, 'move', wpX, wpY);
		transport.isScriptOrdering = false;

		debugPrint(
			`[EPAS] Arc move: cross=${R2I(cross)} dir=${cross >= 0 ? 'CCW' : 'CW'} angle=${R2I(targetAngle * EPAS_RADIANS_TO_DEGREES)}° → (${R2I(wpX)}, ${R2I(wpY)})`
		);
	}

	private isPathClearOfPort(
		shipX: number,
		shipY: number,
		destX: number,
		destY: number,
		portX: number,
		portY: number,
		safeRadius: number
	): boolean {
		const segDx = destX - shipX;
		const segDy = destY - shipY;
		const lenSq = segDx * segDx + segDy * segDy;

		if (lenSq < 1) return true;

		// Project port center onto the line segment [ship → dest]
		const t = ((portX - shipX) * segDx + (portY - shipY) * segDy) / lenSq;
		const tClamped = t < 0 ? 0 : t > 1 ? 1 : t;

		const closestX = shipX + tClamped * segDx;
		const closestY = shipY + tClamped * segDy;

		const distX = portX - closestX;
		const distY = portY - closestY;
		const distSq = distX * distX + distY * distY;

		return distSq > safeRadius * safeRadius;
	}

	private checkEPASTick(transport: Transport): void {
		if (!transport.epasActive) return;

		const tx = GetUnitX(transport.unit);
		const ty = GetUnitY(transport.unit);
		const edx = tx - transport.epasPortCenterX;
		const edy = ty - transport.epasPortCenterY;
		const eDist = SquareRoot(edx * edx + edy * edy);

		debugPrint(`[EPAS] Tick — dist to port ${transport.epasPortName}: ${R2I(eDist)} / ${transport.epasSafeRadius}`);

		// Primary exit: straight-line path to destination is now clear of the port
		if (
			this.isPathClearOfPort(
				tx,
				ty,
				transport.epasOriginalDestX,
				transport.epasOriginalDestY,
				transport.epasPortCenterX,
				transport.epasPortCenterY,
				transport.epasSafeRadius
			)
		) {
			debugPrint(`[EPAS] Path to destination is clear — deactivating`);
			this.deactivateEPAS(transport);
			return;
		}

		// Fallback exit: ship reached outside the safe radius
		if (eDist > transport.epasSafeRadius) {
			this.deactivateEPAS(transport);
			return;
		}

		// Update position tracking for velocity computation
		transport.epasLastX = tx;
		transport.epasLastY = ty;

		// Only re-issue arc move if ship has stopped (hit land, reached waypoint, etc.)
		// Order 851986 = move. If the ship is still moving, let it finish reaching its current waypoint.
		if (GetUnitCurrentOrder(transport.unit) !== 851986) {
			debugPrint(`[EPAS] Ship stopped (order=${GetUnitCurrentOrder(transport.unit)}) — issuing new arc move`);
			this.issueEPASMoveOrder(transport);
		}
	}

	private checkEPASProximity(transport: Transport): void {
		if (transport.epasActive) return;

		const tx = GetUnitX(transport.unit);
		const ty = GetUnitY(transport.unit);
		const owner = GetOwningPlayer(transport.unit);
		const destX = transport.patrolState === PatrolState.MOVING ? transport.patrolDestX : transport.patrolOriginX;
		const destY = transport.patrolState === PatrolState.MOVING ? transport.patrolDestY : transport.patrolOriginY;

		for (const portData of AllPortData) {
			if (!IsUnitEnemy(portData.portUnit, owner)) continue;

			const pdx = tx - portData.centerX;
			const pdy = ty - portData.centerY;
			const distSq = pdx * pdx + pdy * pdy;

			if (distSq > portData.safeRadius * portData.safeRadius) continue;

			// Skip if destination is inside this port's safe area (ship needs to reach it)
			const destToPortDx = destX - portData.centerX;
			const destToPortDy = destY - portData.centerY;
			if (destToPortDx * destToPortDx + destToPortDy * destToPortDy <= portData.safeRadius * portData.safeRadius) continue;

			// Check if destination is roughly toward the port
			const toDestX = destX - tx;
			const toDestY = destY - ty;
			const toPortX = portData.centerX - tx;
			const toPortY = portData.centerY - ty;
			const dot = toDestX * toPortX + toDestY * toPortY;

			if (dot <= 0) continue;

			debugPrint(`[EPAS] Proximity check — inside safe radius of port: ${portData.portName}, activating`);
			this.activateEPAS(transport, portData);
			return;
		}
	}

	/**
	 * Adds a transport unit to the TransportManager.
	 * @param unit - The transport unit to be added.
	 */
	public add(unit: unit) {
		const transport: Transport = {
			unit: unit,
			cargo: [],
			effect: undefined,
			duration: 0,
			autoloadEnabled: false,
			loadTarget: undefined,
			unloadTargetX: undefined,
			unloadTargetY: undefined,
			tooltipFrame: this.createTooltipFrame(),
			patrolEnabled: false,
			patrolState: PatrolState.LOADING,
			patrolDestX: 0,
			patrolDestY: 0,
			patrolOriginX: 0,
			patrolOriginY: 0,
			patrolLoadTimer: 0,
			patrolEvent: undefined,
			isScriptOrdering: false,
			pathingDisableDuration: 0,
			orderedUnits: [],
			// EPAS Phase 0 fields
			epasActive: false,
			epasPortCenterX: 0,
			epasPortCenterY: 0,
			epasSafeRadius: 0,
			epasOriginalDestX: 0,
			epasOriginalDestY: 0,
			epasPortName: '',
			epasLastX: 0,
			epasLastY: 0,
		};

		this.transports.set(unit, transport);
		this.transportList.push(transport);
	}

	private createTooltipFrame(): { box: framehandle; text: framehandle } {
		this.tooltipCtxCounter++;
		const ctx = this.tooltipCtxCounter;
		const box = BlzCreateFrame('TasToolTipBox', BlzGetFrameByName('ConsoleUIBackdrop', 0), 0, ctx);
		const text = BlzCreateFrame('TasTooltipText', box, 0, ctx);

		BlzFrameSetPoint(box, FRAMEPOINT_BOTTOMLEFT, text, FRAMEPOINT_BOTTOMLEFT, -0.01, -0.01);
		BlzFrameSetPoint(box, FRAMEPOINT_TOPRIGHT, text, FRAMEPOINT_TOPRIGHT, 0.01, 0.01);
		BlzFrameSetAlpha(box, 150);
		BlzFrameSetAlpha(text, 255);
		BlzFrameSetEnable(text, false);
		BlzFrameSetVisible(box, false);
		BlzFrameSetVisible(text, false);

		return { box, text };
	}

	/**
	 * Processes the delayed track queue each tick.
	 * Units are queued here after unloading from transports because WC3 cannot
	 * reliably handle minimap registration on the same frame a unit is unloaded.
	 */
	private processDelayedTrackQueue(): void {
		if (TransportManager.delayedTrackQueue.length === 0) return;

		for (let i = 0; i < TransportManager.delayedTrackQueue.length; i++) {
			const unit = TransportManager.delayedTrackQueue[i];
			if (DEBUG_PRINTS.master) debugPrint(`Unit Unloaded Event Triggered for unit: ${GetUnitName(unit)}`, DC.transport);
			// Skip units that died, became guards, or were reloaded into a transport during the delay
			if (!UnitAlive(unit) || IsUnitType(unit, UNIT_TYPE.GUARD) || IsUnitLoaded(unit)) continue;

			UnitLagManager.getInstance().trackUnit(unit);
			MinimapIconManager.getInstance().registerIfValid(unit, true);
			AllyColorFilterManager.getInstance().applyColorFilter(unit);
		}
		TransportManager.delayedTrackQueue.length = 0;
	}

	/**
	 * Returns the cargo units loaded in the given transport, or undefined if not tracked.
	 */
	public getCargo(unit: unit): unit[] | undefined {
		const transport = this.transports.get(unit);
		return transport ? transport.cargo : undefined;
	}

	/**
	 * Handles the death event of a transport unit.
	 * @param killer - The unit that killed the transport.
	 * @param unit - The transport unit that is killed.
	 */
	public onDeath(killer: unit, unit: unit) {
		if (!this.transports.has(unit)) return;

		const transport: Transport = this.transports.get(unit);

		if (this.isTerrainInvalid(transport.unit)) {
			transport.cargo = transport.cargo.filter((unit) => {
				BlzSetUnitMaxHP(unit, 1);
				UnitDamageTarget(killer, unit, 100, true, false, ATTACK_TYPE_CHAOS, DAMAGE_TYPE_NORMAL, WEAPON_TYPE_WHOKNOWS);

				return false;
			});
		}

		const transportData: Transport = this.transports.get(unit);

		if (transportData.cargo) {
			// Track all cargo units (shared slots) again since the transport is dead
			transportData.cargo.forEach((unit) => {
				UnitLagManager.getInstance().trackUnit(unit);
				MinimapIconManager.getInstance().registerIfValid(unit, true);
				AllyColorFilterManager.getInstance().applyColorFilter(unit);
			});
		}

		transportData.cargo = undefined;

		if (transportData.tooltipFrame) {
			BlzDestroyFrame(transportData.tooltipFrame.text);
			BlzDestroyFrame(transportData.tooltipFrame.box);
			transportData.tooltipFrame = undefined;
		}

		if (transportData.epasActive) {
			debugPrint(`[EPAS] Cleared — transport died`);
		}
		transportData.epasActive = false;

		this.removeAutoLoadEffect(transportData);

		transportData.autoloadEnabled = false;
		// Remove from autoLoadingTransports
		const index = this.autoLoadingTransports.indexOf(transportData);
		if (index > -1) {
			this.autoLoadingTransports.splice(index, 1);
		}

		this.cancelLoadingOrders(transportData);

		transportData.patrolEnabled = false;

		if (transportData.patrolEvent !== undefined) {
			TimedEventManager.getInstance().removeTimedEvent(transportData.patrolEvent);
			transportData.patrolEvent = undefined;
		}

		this.transports.delete(unit);

		const listIndex = this.transportList.indexOf(transportData);
		if (listIndex > -1) {
			this.transportList.splice(listIndex, 1);
		}
	}

	/**
	 * Initializes the trigger for units being loaded into transports using the generic load event
	 */
	private onLoadFinish() {
		const t: trigger = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_LOADED, undefined);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				let transport: unit = GetTransportUnit();
				if (!transport) return false;

				let loadedUnit: unit = GetLoadedUnit();

				// Untrack the unit since it's now loaded and managed by the transport
				UnitLagManager.getInstance().untrackUnit(loadedUnit);
				MinimapIconManager.getInstance().unregisterTrackedUnit(loadedUnit);

				const transportData = this.transports.get(transport);
				transportData.cargo.push(loadedUnit);
				transportData.patrolLoadTimer = 0;

				// Remove the loaded unit from any transport's orderedUnits list
				// This handles the case where multiple transports might have tried to claim the unit
				// or if the unit loaded into a different transport than the one that ordered it
				for (const t of this.autoLoadingTransports) {
					if (t.orderedUnits.includes(loadedUnit)) {
						this.unregisterOrder(t, loadedUnit);
					}
				}

				transport = undefined;
				loadedUnit = undefined;

				return true;
			})
		);
	}

	private onLoadStart() {
		const t = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_ISSUED_TARGET_ORDER, undefined);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				const transport: Transport = this.transports.get(GetTriggerUnit());

				if (GetIssuedOrderId() !== 852046 || !transport) {
					return false;
				}

				transport.loadTarget = GetOrderTargetUnit();

				return false;
			})
		);
	}

	private onUnloadAction() {
		const t = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SPELL_CHANNEL, undefined);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				const transport: Transport = this.transports.get(GetTriggerUnit());

				if (!transport || (GetSpellAbilityId() !== ABILITY_ID.UNLOAD && GetSpellAbilityId() !== ABILITY_ID.UNLOAD_DEFAULT_HOTKEY)) {
					return false;
				}

				// If the transport itself is currently standing on valid terrain, unloading is possible and units will run
				// to the direction of the unload action click else we check more in-depth where transport ship is at so
				// we can allow unloading ships when the transport ship is standing on ocean terrain and unload to edge of port
				if (this.isTerrainInvalid(transport.unit)) {
					const abilityTargetX = transport.unloadTargetX;
					const abilityTargetY = transport.unloadTargetY;

					const context: TransportUnloadContext = {
						transportInvalidTerrain: this.isTerrainInvalid(transport.unit),
						abilityTargetX: abilityTargetX,
						abilityTargetY: abilityTargetY,
						actualTargetX: GetSpellTargetX(),
						actualTargetY: GetSpellTargetY(),
						targetTerrainInvalid: this.isTargetTerrainInvalid(abilityTargetX, abilityTargetY),
						stopAndError: () => {
							BlzPauseUnitEx(transport.unit, true);
							BlzPauseUnitEx(transport.unit, false);
							IssueImmediateOrder(transport.unit, 'stop');
							ErrorMsg(SharedSlotManager.getInstance().getOwnerOfUnit(transport.unit), 'You may only unload on pebble terrain!');
						},
					};

					if (!TransportUnloadLogic.validateUnload(context)) {
						return false;
					}
				}

				return false;
			})
		);
	}

	private onUnloadUnitStart() {
		const t = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_ISSUED_TARGET_ORDER, undefined);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				const transport: Transport = this.transports.get(GetTriggerUnit());

				if (GetIssuedOrderId() !== ORDER_ID.UNLOAD_UNIT || !transport) {
					return false;
				}

				if (this.isTerrainInvalid(transport.unit)) {
					BlzPauseUnitEx(transport.unit, true);
					BlzPauseUnitEx(transport.unit, false);
					IssueImmediateOrder(transport.unit, 'stop');
					ErrorMsg(SharedSlotManager.getInstance().getOwnerOfUnit(transport.unit), 'You may only unload on pebble terrain!');

					return false;
				}

				this.handleAutoLoadOff(transport);

				const index: number = transport.cargo.indexOf(GetOrderTargetUnit());

				if (index > -1) {
					const unloadedUnits = transport.cargo.splice(index, 1);
					unloadedUnits.forEach((unit) => {
						TransportManager.delayedTrackQueue.push(unit);
					});
				}
			})
		);
	}

	/**
	 * Initializes the trigger for the unload order for transports.
	 */
	private onUnloadStart() {
		const t = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_ISSUED_POINT_ORDER, undefined);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				const transport: Transport = this.transports.get(GetTriggerUnit());

				if (GetIssuedOrderId() !== ORDER_ID.UNLOAD_ALL || !transport) {
					return false;
				}

				transport.unloadTargetX = GetOrderPointX();
				transport.unloadTargetY = GetOrderPointY();

				return false;
			})
		);
	}

	private onAutoLoadOn() {
		const t = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SPELL_CAST, undefined);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				const transport: Transport = this.transports.get(GetTriggerUnit());

				if (GetSpellAbilityId() !== ABILITY_ID.AUTOLOAD_ON || !transport) {
					return false;
				}

				if (this.isTerrainInvalid(transport.unit)) {
					IssueImmediateOrder(transport.unit, 'stop');
					ErrorMsg(SharedSlotManager.getInstance().getOwnerOfUnit(transport.unit), 'You may only load on pebble terrain!');
					return false;
				}

				if (transport.autoloadEnabled) {
					return false;
				}

				this.handleAutoLoadOn(transport);

				return false;
			})
		);
	}

	private onPatrolStart() {
		const t = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SPELL_EFFECT, undefined);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				if (DEBUG_PRINTS.master) debugPrint('Transport Patrol Casted', DC.transport);
				const transport: Transport = this.transports.get(GetTriggerUnit());

				if (!transport || GetSpellAbilityId() !== ABILITY_ID.TRANSPORT_PATROL) {
					return false;
				}

				if (this.isTerrainInvalid(transport.unit)) {
					IssueImmediateOrder(transport.unit, 'stop');
					ErrorMsg(SharedSlotManager.getInstance().getOwnerOfUnit(transport.unit), 'You may only load on pebble terrain!');
					return false;
				}

				if (DEBUG_PRINTS.master) debugPrint('Transport Patrol Valid', DC.transport);

				if (transport.patrolEnabled) {
					if (DEBUG_PRINTS.master) debugPrint('Transport Patrol Already Enabled - Stopping Previous Patrol', DC.transport);
					this.stopPatrol(transport);
				}

				if (DEBUG_PRINTS.master) debugPrint('Transport Patrol Starting', DC.transport);

				transport.patrolEnabled = true;
				transport.patrolState = PatrolState.LOADING;
				transport.patrolDestX = GetSpellTargetX();
				transport.patrolDestY = GetSpellTargetY();
				const u = transport.unit;
				transport.patrolOriginX = GetUnitX(u);
				transport.patrolOriginY = GetUnitY(u);
				transport.patrolLoadTimer = 0;

				if (DEBUG_PRINTS.master) debugPrint(`Patrol Origin: (${transport.patrolOriginX}, ${transport.patrolOriginY})`, DC.transport);
				if (DEBUG_PRINTS.master) debugPrint(`Patrol Destination: (${transport.patrolDestX}, ${transport.patrolDestY})`, DC.transport);

				this.addAutoLoadEffect(transport);

				const timedEventManager: TimedEventManager = TimedEventManager.getInstance();

				if (DEBUG_PRINTS.master) debugPrint('Registering Patrol Timed Event', DC.transport);
				transport.patrolEvent = timedEventManager.registerTimedEvent(1000000, () => {
					if (DEBUG_PRINTS.master) debugPrint('Transport Patrol Tick', DC.transport);
					this.handlePatrol(transport);
				});

				return false;
			})
		);
	}

	private onPatrolOrder() {
		const t = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_ISSUED_POINT_ORDER, undefined);
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_ISSUED_TARGET_ORDER, undefined);
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_ISSUED_ORDER, undefined);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				const transport: Transport = this.transports.get(GetTriggerUnit());

				if (!transport || !transport.patrolEnabled) {
					return false;
				}

				if (!transport.isScriptOrdering) {
					// Check if order is LOAD (allow manual loading without cancelling patrol)
					if (GetIssuedOrderId() === ORDER_ID.LOAD) return false;
					// Check if order is UNLOAD (allow manual unloading without cancelling patrol)
					if (GetIssuedOrderId() === ORDER_ID.UNLOAD_UNIT) return false;
					// Check if order is UNLOAD ALL (allow manual unloading without cancelling patrol)
					if (GetIssuedOrderId() === ORDER_ID.UNLOAD_ALL) return false;

					// Player issued order, cancel patrol
					this.stopPatrol(transport);
				}

				return false;
			})
		);
	}

	/**
	 * Initializes the trigger for spell effects on transports.
	 */
	private onLoadAction() {
		const t = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SPELL_EFFECT, undefined);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				const transport: Transport = this.transports.get(GetTriggerUnit());

				if (!transport || GetSpellAbilityId() !== ABILITY_ID.LOAD) {
					return false;
				}

				if (this.isTerrainInvalid(transport.loadTarget) && this.isTerrainInvalid(transport.unit)) {
					BlzPauseUnitEx(transport.loadTarget, true);
					BlzPauseUnitEx(transport.loadTarget, false);
					IssueImmediateOrder(transport.loadTarget, 'stop');

					BlzPauseUnitEx(transport.unit, true);
					BlzPauseUnitEx(transport.unit, false);
					IssueImmediateOrder(transport.unit, 'stop');
					ErrorMsg(SharedSlotManager.getInstance().getOwnerOfUnit(transport.unit), 'You may only load on pebble terrain!');
					return false;
				}

				return false;
			})
		);
	}

	/**
	 * Initializes the trigger for spell end casting on transports.
	 */
	private onUnloadFinish() {
		const t = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SPELL_ENDCAST, undefined);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				const transport: Transport = this.transports.get(GetTriggerUnit());

				if (!transport || (GetSpellAbilityId() !== ABILITY_ID.UNLOAD && GetSpellAbilityId() !== ABILITY_ID.UNLOAD_DEFAULT_HOTKEY)) {
					return false;
				}

				// Queue unloaded units for delayed minimap re-tracking (same queue as onUnloadUnitStart)
				const unloadedUnits = transport.cargo.filter((unit) => !IsUnitInTransport(unit, transport.unit));
				transport.cargo = transport.cargo.filter((unit) => IsUnitInTransport(unit, transport.unit));
				unloadedUnits.forEach((unit) => {
					TransportManager.delayedTrackQueue.push(unit);
					const index = transport.orderedUnits.indexOf(unit);
					if (index > -1) {
						this.unregisterOrder(transport, unit);
					}
				});

				// Disable autoload
				this.handleAutoLoadOff(transport);

				if (transport.patrolEnabled && transport.patrolState === PatrolState.UNLOADING && transport.cargo.length === 0) {
					transport.patrolState = PatrolState.RETURNING;
					transport.isScriptOrdering = true;
					IssuePointOrder(transport.unit, 'move', transport.patrolOriginX, transport.patrolOriginY);
					transport.isScriptOrdering = false;

					SetUnitPathing(transport.unit, false);
					transport.pathingDisableDuration = 5;
				}

				return false;
			})
		);
	}

	/**
	 * Checks if a unit is on invalid terrain.
	 * @param u - The unit to be checked.
	 * @returns True if terrain is invalid, otherwise false.
	 */
	private isTerrainInvalid(u: unit): boolean {
		const terrainType = GetTerrainType(GetUnitX(u), GetUnitY(u));
		return terrainType !== FourCC('Vcbp');
	}

	/**
	 * Checks if the target is invalid terrain.
	 */
	private isTargetTerrainInvalid(positionX: number, positionY: number): boolean {
		const terrainType = GetTerrainType(positionX, positionY);
		return terrainType !== FourCC('Vcbp');
	}

	private addAutoLoadEffect(transport: Transport) {
		if (!transport.effect) {
			transport.effect = AddSpecialEffectTarget(
				'Abilities\\Spells\\NightElf\\Rejuvenation\\RejuvenationTarget.mdl',
				transport.unit,
				'overhead'
			);
		}
	}

	private removeAutoLoadEffect(transport: Transport) {
		if (transport.effect) {
			DestroyEffect(transport.effect);
			transport.effect = undefined;
		}
	}

	private onAutoLoadTick() {
		for (let i = this.autoLoadingTransports.length - 1; i >= 0; i--) {
			const transport = this.autoLoadingTransports[i];

			const context: TransportAutoLoadContext = {
				duration: transport.duration,
				cargoCount: transport.cargo.length,
				autoloadEnabled: transport.autoloadEnabled,
				isTerrainInvalid: this.isTerrainInvalid(transport.unit),
				castAutoLoad: () => this.castAutoLoad(transport),
				handleAutoLoadOff: () => this.handleAutoLoadOff(transport),
			};

			TransportAutoLoadLogic.handleAutoLoadTick(context);

			transport.duration = context.duration;
		}
	}

	private cancelLoadingOrders(transport: Transport) {
		transport.orderedUnits.forEach((u) => {
			if (UnitAlive(u) && !IsUnitInTransport(u, transport.unit)) {
				IssueImmediateOrder(u, 'stop');
			}
			this.allOrderedUnits.delete(u);
		});
		transport.orderedUnits = [];
	}

	private registerOrder(transport: Transport, unit: unit) {
		transport.orderedUnits.push(unit);
		this.allOrderedUnits.add(unit);
	}

	private unregisterOrder(transport: Transport, unit: unit) {
		const index = transport.orderedUnits.indexOf(unit);
		if (index > -1) {
			transport.orderedUnits.splice(index, 1);
		}
		this.allOrderedUnits.delete(unit);
	}

	private castAutoLoad(transport: Transport) {
		// Cleanup units that are invalid / loaded / dead
		for (let i = transport.orderedUnits.length - 1; i >= 0; i--) {
			const u = transport.orderedUnits[i];
			if (!UnitAlive(u) || IsUnitInTransport(u, transport.unit)) {
				this.unregisterOrder(transport, u);
			}
		}

		if (transport.cargo.length + transport.orderedUnits.length >= 10) return;

		// Resolve real owner once (handles multi-shared slots)
		const transportRealOwner = SharedSlotManager.getInstance().getOwnerOfUnit(transport.unit);
		let group: group = CreateGroup();

		GroupEnumUnitsInRange(
			group,
			GetUnitX(transport.unit),
			GetUnitY(transport.unit),
			AUTO_LOAD_DISTANCE,
			Filter(() => {
				let unit: unit = GetFilterUnit();

				if (IsUnitType(unit, UNIT_TYPE.SHIP)) return;
				if (IsUnitType(unit, UNIT_TYPE.GUARD)) return;
				if (IsUnitType(unit, UNIT_TYPE.CITY)) return;
				if (SharedSlotManager.getInstance().getOwnerOfUnit(unit) !== transportRealOwner) return;

				// Global check for already ordered units
				if (this.allOrderedUnits.has(unit)) return;

				if (transport.cargo.length + transport.orderedUnits.length < 10) {
					IssueTargetOrder(unit, 'smart', transport.unit);
					this.registerOrder(transport, unit);
				}
			})
		);

		DestroyGroup(group);
		group = undefined;
	}

	/**
	 * Handles the activation of the Auto-Load ability.
	 */
	private handleAutoLoadOn(transport: Transport) {
		if (transport.cargo.length >= 10) {
			return;
		}

		transport.autoloadEnabled = true;
		transport.duration = AUTO_LOAD_DURATION;

		this.addAutoLoadEffect(transport);

		this.autoLoadingTransports.push(transport);
	}

	/**
	 * Handles the deactivation of the Auto-Load ability.
	 * @param transport - The transport unit with the Auto-Load ability deactivated.
	 */
	private handleAutoLoadOff(transport: Transport) {
		transport.autoloadEnabled = false;

		this.removeAutoLoadEffect(transport);

		this.cancelLoadingOrders(transport);

		const index = this.autoLoadingTransports.indexOf(transport);
		if (index > -1) {
			this.autoLoadingTransports.splice(index, 1);
		}
	}

	/**
	 * Stops the patrol and cleans up resources.
	 */
	private stopPatrol(transport: Transport) {
		if (transport.epasActive) {
			debugPrint(`[EPAS] Cleared — patrol stopped`);
		}
		transport.epasActive = false;
		transport.patrolEnabled = false;

		this.removeAutoLoadEffect(transport);

		if (transport.patrolEvent) {
			TimedEventManager.getInstance().removeTimedEvent(transport.patrolEvent);
			transport.patrolEvent = undefined;
		}

		this.cancelLoadingOrders(transport);

		if (transport.pathingDisableDuration > 0) {
			SetUnitPathing(transport.unit, true);
			transport.pathingDisableDuration = 0;
		}
	}

	private handlePatrol(transport: Transport) {
		if (!transport.patrolEnabled) return;

		if (transport.patrolState === PatrolState.MOVING || transport.patrolState === PatrolState.RETURNING) {
			this.checkEPASTick(transport);
			if (!transport.epasActive) this.checkEPASProximity(transport);
			if (transport.epasActive) return;
		}

		const context: TransportPatrolContext = {
			patrolState: transport.patrolState,
			patrolDestX: transport.patrolDestX,
			patrolDestY: transport.patrolDestY,
			patrolOriginX: transport.patrolOriginX,
			patrolOriginY: transport.patrolOriginY,
			patrolLoadTimer: transport.patrolLoadTimer,
			pathingDisableDuration: transport.pathingDisableDuration,
			cargoCount: transport.cargo.length,

			unitAlive: UnitAlive(transport.unit),
			unitX: GetUnitX(transport.unit),
			unitY: GetUnitY(transport.unit),
			currentOrderId: GetUnitCurrentOrder(transport.unit),

			stopPatrol: () => this.stopPatrol(transport),
			setUnitPathing: (enabled: boolean) => SetUnitPathing(transport.unit, enabled),
			castAutoLoad: () => this.castAutoLoad(transport),
			removeAutoLoadEffect: () => this.removeAutoLoadEffect(transport),
			addAutoLoadEffect: () => this.addAutoLoadEffect(transport),
			cancelLoadingOrders: () => this.cancelLoadingOrders(transport),
			issueMoveOrder: (x: number, y: number) => {
				transport.isScriptOrdering = true;
				IssuePointOrder(transport.unit, 'move', x, y);
				transport.isScriptOrdering = false;
			},
			issueUnloadAllOrder: (x: number, y: number) => {
				transport.isScriptOrdering = true;
				IssuePointOrder(transport.unit, 'unloadall', x, y);
				transport.isScriptOrdering = false;
			},
			issueStopOrder: () => {
				transport.isScriptOrdering = true;
				IssueImmediateOrder(transport.unit, 'stop');
				transport.isScriptOrdering = false;
			},
		};

		TransportPatrolLogic.handlePatrolTick(context);

		transport.patrolState = context.patrolState;
		transport.patrolLoadTimer = context.patrolLoadTimer;
		transport.pathingDisableDuration = context.pathingDisableDuration;
	}
}
