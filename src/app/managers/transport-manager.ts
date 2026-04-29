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

enum PatrolState {
	LOADING,
	MOVING,
	UNLOADING,
	RETURNING,
}

type Transport = {
	unit: unit;
	cargo: unit[];
	effect: effect | undefined;
	duration: number;
	autoloadEnabled: boolean;
	loadTarget: unit;
	unloadTargetX: number;
	unloadTargetY: number;
	floatingTextCargo: texttag | undefined;
	floatingTextCapacity: texttag | undefined;
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
};

const AUTO_LOAD_DISTANCE: number = 450;
const AUTO_LOAD_DURATION: number = 180;
const MAX_UNLOAD_DISTANCE: number = 300;

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
	private autoLoadingTransports: Transport[] = [];
	private autoLoadTimer: timer = CreateTimer();
	private allOrderedUnits: Set<unit> = new Set<unit>();

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
			floatingTextCargo: undefined,
			floatingTextCapacity: undefined,
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
		};

		this.transports.set(unit, transport);
	}

	/**
	 * Processes the delayed track queue each tick.
	 * Units are queued here after unloading from transports because WC3 cannot
	 * reliably handle minimap registration on the same frame a unit is unloaded.
	 */
	private processDelayedTrackQueue(): void {
		if (TransportManager.delayedTrackQueue.length === 0) return;

		TransportManager.delayedTrackQueue.forEach((unit) => {
			if (DEBUG_PRINTS.master) debugPrint(`Unit Unloaded Event Triggered for unit: ${GetUnitName(unit)}`, DC.transport);
			// Skip units that died, became guards, or were reloaded into a transport during the delay
			if (!UnitAlive(unit) || IsUnitType(unit, UNIT_TYPE.GUARD) || IsUnitLoaded(unit)) return;
			UnitLagManager.getInstance().trackUnit(unit);
			MinimapIconManager.getInstance().registerIfValid(unit);
		});
		TransportManager.delayedTrackQueue = [];
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
				MinimapIconManager.getInstance().registerIfValid(unit);
			});
		}

		transportData.cargo = undefined;

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
					// Get transport unload ability target position
					const abilityTargetX = transport.unloadTargetX;
					const abilityTargetY = transport.unloadTargetY;

					// Get target actual unload position
					const actualTargetX = GetSpellTargetX();
					const actualTargetY = GetSpellTargetY();

					// Calculate distance
					const dx = abilityTargetX - actualTargetX;
					const dy = abilityTargetY - actualTargetY;
					const distance = SquareRoot(dx * dx + dy * dy);

					if (distance > MAX_UNLOAD_DISTANCE) {
						BlzPauseUnitEx(transport.unit, true);
						BlzPauseUnitEx(transport.unit, false);
						IssueImmediateOrder(transport.unit, 'stop');
						ErrorMsg(SharedSlotManager.getInstance().getOwnerOfUnit(transport.unit), 'You may only unload on pebble terrain!');
						return false;
					} else {
						if (this.isTargetTerrainInvalid(abilityTargetX, abilityTargetY)) {
							BlzPauseUnitEx(transport.unit, true);
							BlzPauseUnitEx(transport.unit, false);
							IssueImmediateOrder(transport.unit, 'stop');
							ErrorMsg(SharedSlotManager.getInstance().getOwnerOfUnit(transport.unit), 'You may only unload on pebble terrain!');
							return false;
						}
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

			this.castAutoLoad(transport);
			transport.duration--;

			if (transport.cargo.length >= 10 || !transport.autoloadEnabled || this.isTerrainInvalid(transport.unit) || transport.duration <= 0) {
				this.handleAutoLoadOff(transport);
			}
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
		// If transport is dead, onDeath should have handled it, but safety check:
		if (!UnitAlive(transport.unit)) {
			this.stopPatrol(transport);
			return;
		}

		if (transport.pathingDisableDuration > 0) {
			transport.pathingDisableDuration--;
			if (transport.pathingDisableDuration <= 0) {
				SetUnitPathing(transport.unit, true);
			}
		}

		switch (transport.patrolState) {
			case PatrolState.LOADING:
				this.castAutoLoad(transport);
				transport.patrolLoadTimer++;

				if (transport.cargo.length >= 10 || (transport.patrolLoadTimer >= 5 && transport.cargo.length > 0)) {
					transport.patrolState = PatrolState.MOVING;
					this.removeAutoLoadEffect(transport);
					transport.patrolLoadTimer = 0;
					this.cancelLoadingOrders(transport);
					transport.isScriptOrdering = true;
					IssuePointOrder(transport.unit, 'move', transport.patrolDestX, transport.patrolDestY);
					transport.isScriptOrdering = false;
				}
				break;

			case PatrolState.MOVING:
				const dx = GetUnitX(transport.unit) - transport.patrolDestX;
				const dy = GetUnitY(transport.unit) - transport.patrolDestY;
				const dist = SquareRoot(dx * dx + dy * dy);

				if (dist < 500) {
					transport.patrolState = PatrolState.UNLOADING;
					transport.isScriptOrdering = true;

					IssuePointOrder(transport.unit, 'unloadall', transport.patrolDestX, transport.patrolDestY);
					transport.isScriptOrdering = false;
				} else if (GetUnitCurrentOrder(transport.unit) !== 851986) {
					transport.isScriptOrdering = true;
					IssuePointOrder(transport.unit, 'move', transport.patrolDestX, transport.patrolDestY);
					transport.isScriptOrdering = false;
				}
				break;

			case PatrolState.UNLOADING:
				if (transport.cargo.length === 0) {
					transport.patrolState = PatrolState.RETURNING;
					transport.isScriptOrdering = true;
					IssuePointOrder(transport.unit, 'move', transport.patrolOriginX, transport.patrolOriginY);
					transport.isScriptOrdering = false;

					SetUnitPathing(transport.unit, false);
					transport.pathingDisableDuration = 5;
				} else if (GetUnitCurrentOrder(transport.unit) !== 852048) {
					transport.isScriptOrdering = true;
					IssuePointOrder(transport.unit, 'unloadall', transport.patrolDestX, transport.patrolDestY);
					transport.isScriptOrdering = false;
				}
				break;

			case PatrolState.RETURNING:
				const rdx = GetUnitX(transport.unit) - transport.patrolOriginX;
				const rdy = GetUnitY(transport.unit) - transport.patrolOriginY;
				const rdist = SquareRoot(rdx * rdx + rdy * rdy);

				if (rdist < 50) {
					transport.patrolState = PatrolState.LOADING;
					transport.isScriptOrdering = true;
					IssueImmediateOrder(transport.unit, 'stop');
					transport.isScriptOrdering = false;

					this.addAutoLoadEffect(transport);
				} else if (GetUnitCurrentOrder(transport.unit) !== 851986) {
					transport.isScriptOrdering = true;
					IssuePointOrder(transport.unit, 'move', transport.patrolOriginX, transport.patrolOriginY);
					transport.isScriptOrdering = false;
				}
				break;
		}
	}
}
