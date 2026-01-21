import { ABILITY_ID } from '../../configs/ability-id';
import { ClientManager } from '../game/services/client-manager';
import { UnitLagManager } from '../game/services/unit-lag-manager';
import { TimedEvent } from '../libs/timer/timed-event';
import { TimedEventManager } from '../libs/timer/timed-event-manager';
import { debugPrint } from '../utils/debug-print';
import { ErrorMsg } from '../utils/messages';
import { UNIT_TYPE } from '../utils/unit-types';
import { ORDER_ID } from '../../configs/order-id';

enum PatrolState {
	LOADING,
	MOVING,
	UNLOADING,
	RETURNING,
}

type Transport = {
	unit: unit;
	cargo: unit[];
	effect: effect | null;
	duration: number;
	autoloadEnabled: boolean;
	loadTarget: unit;
	unloadTargetX: number;
	unloadTargetY: number;
	event: TimedEvent | null;
	floatingTextCargo: texttag | null;
	floatingTextCapacity: texttag | null;
	patrolEnabled: boolean;
	patrolState: PatrolState;
	patrolDestX: number;
	patrolDestY: number;
	patrolOriginX: number;
	patrolOriginY: number;
	patrolLoadTimer: number;
	patrolEvent: TimedEvent | null;
	isScriptOrdering: boolean;
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
	// Static queue and timer for delayed tracking
	private static delayedTrackQueue: unit[] = [];
	private static delayedTrackTimer: timer = CreateTimer();
	private static delayedTrackTimerRunning: boolean = false;
	private static instance: TransportManager;
	private transports: Map<unit, Transport>;

	/**
	 * Gets the singleton instance of the TransportManager.
	 * @returns The singleton instance.
	 */
	public static getInstance() {
		if (this.instance == null) {
			this.instance = new TransportManager();
		}

		return this.instance;
	}

	/**
	 * Private constructor to initialize the TransportManager.
	 */
	private constructor() {
		this.transports = new Map<unit, Transport>();

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
			effect: null,
			duration: 0,
			autoloadEnabled: false,
			event: null,
			loadTarget: null,
			unloadTargetX: null,
			unloadTargetY: null,
			floatingTextCargo: null,
			floatingTextCapacity: null,
			patrolEnabled: false,
			patrolState: PatrolState.LOADING,
			patrolDestX: 0,
			patrolDestY: 0,
			patrolOriginX: 0,
			patrolOriginY: 0,
			patrolLoadTimer: 0,
			patrolEvent: null,
			isScriptOrdering: false,
		};

		this.transports.set(unit, transport);
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

		// Track all cargo units (clients) again since the transport is dead
		transportData.cargo.forEach((unit) => {
			UnitLagManager.getInstance().trackUnit(unit);
		});

		transportData.cargo = null;

		if (transportData.effect != null) {
			DestroyEffect(transportData.effect);
		}

		transportData.autoloadEnabled = false;
		transportData.patrolEnabled = false;

		if (transportData.patrolEvent != null) {
			TimedEventManager.getInstance().removeTimedEvent(transportData.patrolEvent);
			transportData.patrolEvent = null;
		}

		this.transports.delete(unit);
	}

	/**
	 * Initializes the trigger for units being loaded into transports using the generic load event
	 */
	private onLoadFinish() {
		const t: trigger = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_LOADED, null);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				let transport: unit = GetTransportUnit();
				if (!transport) return false;

				let loadedUnit: unit = GetLoadedUnit();

				// Untrack the unit since it's now loaded and managed by the transport
				UnitLagManager.getInstance().untrackUnit(loadedUnit);

				const transportData = this.transports.get(transport);
				transportData.cargo.push(loadedUnit);

				transport = null;
				loadedUnit = null;

				return true;
			})
		);
	}

	private onLoadStart() {
		const t = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_ISSUED_TARGET_ORDER, null);
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
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SPELL_CHANNEL, null);
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
						ErrorMsg(ClientManager.getInstance().getOwnerOfUnit(transport.unit), 'You may only unload on pebble terrain!');
						return false;
					} else {
						if (this.isTargetTerrainInvalid(abilityTargetX, abilityTargetY)) {
							BlzPauseUnitEx(transport.unit, true);
							BlzPauseUnitEx(transport.unit, false);
							IssueImmediateOrder(transport.unit, 'stop');
							ErrorMsg(ClientManager.getInstance().getOwnerOfUnit(transport.unit), 'You may only unload on pebble terrain!');
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
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_ISSUED_TARGET_ORDER, null);
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
					ErrorMsg(ClientManager.getInstance().getOwnerOfUnit(transport.unit), 'You may only unload on pebble terrain!');

					return false;
				}

				this.handleAutoLoadOff(transport);

				const index: number = transport.cargo.indexOf(GetOrderTargetUnit());

				if (index > -1) {
					const unloadedUnits = transport.cargo.splice(index, 1);
					unloadedUnits.forEach((unit) => {
						TransportManager.delayedTrackQueue.push(unit);
					});

					// Start the timer if not already running - This is needed since we can not make a dummy follow a unit in the same frame it is unloaded
					// Consider moving the timer into the UnitLagManager.
					if (!TransportManager.delayedTrackTimerRunning) {
						TransportManager.delayedTrackTimerRunning = true;
						TimerStart(TransportManager.delayedTrackTimer, 0.1, false, () => {
							TransportManager.delayedTrackQueue.forEach((unit) => {
								debugPrint(`Unit Unloaded Event Triggered for unit: ${GetUnitName(unit)}`);
								UnitLagManager.getInstance().trackUnit(unit);
							});
							TransportManager.delayedTrackQueue = [];
							TransportManager.delayedTrackTimerRunning = false;
						});
					}
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
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_ISSUED_POINT_ORDER, null);
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
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SPELL_CAST, null);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				const transport: Transport = this.transports.get(GetTriggerUnit());

				if (
					GetSpellAbilityId() !== ABILITY_ID.AUTOLOAD_ON ||
					!transport ||
					this.isTerrainInvalid(transport.unit) ||
					transport.autoloadEnabled
				) {
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
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SPELL_EFFECT, null);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				debugPrint('Transport Patrol Casted');
				const transport: Transport = this.transports.get(GetTriggerUnit());

				if (!transport || GetSpellAbilityId() !== ABILITY_ID.TRANSPORT_PATROL) {
					return false;
				}

				debugPrint('Transport Patrol Valid');

				if (transport.patrolEnabled) {
					debugPrint('Transport Patrol Already Enabled - Stopping Previous Patrol');
					this.stopPatrol(transport);
				}

				debugPrint('Transport Patrol Starting');

				transport.patrolEnabled = true;
				transport.patrolState = PatrolState.LOADING;
				transport.patrolDestX = GetSpellTargetX();
				transport.patrolDestY = GetSpellTargetY();
				const u = transport.unit;
				transport.patrolOriginX = GetUnitX(u);
				transport.patrolOriginY = GetUnitY(u);
				transport.patrolLoadTimer = 0;

				debugPrint(`Patrol Origin: (${transport.patrolOriginX}, ${transport.patrolOriginY})`);
				debugPrint(`Patrol Destination: (${transport.patrolDestX}, ${transport.patrolDestY})`);

				transport.effect = AddSpecialEffectTarget(
					'Abilities\\Spells\\NightElf\\Rejuvenation\\RejuvenationTarget.mdl',
					transport.unit,
					'overhead'
				);

				const timedEventManager: TimedEventManager = TimedEventManager.getInstance();

				debugPrint('Registering Patrol Timed Event');
				transport.patrolEvent = timedEventManager.registerTimedEvent(1000000, () => {
					debugPrint('Transport Patrol Tick');
					this.handlePatrol(transport);
				});

				return false;
			})
		);
	}

	private onPatrolOrder() {
		const t = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_ISSUED_POINT_ORDER, null);
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_ISSUED_TARGET_ORDER, null);
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_ISSUED_ORDER, null);
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
					if (GetIssuedOrderId() == ORDER_ID.LOAD) return false;
					// Check if order is UNLOAD (allow manual unloading without cancelling patrol)
					if (GetIssuedOrderId() == ORDER_ID.UNLOAD_UNIT) return false;
					// Check if order is UNLOAD ALL (allow manual unloading without cancelling patrol)
					if (GetIssuedOrderId() == ORDER_ID.UNLOAD_ALL) return false;

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
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SPELL_EFFECT, null);
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
					ErrorMsg(ClientManager.getInstance().getOwnerOfUnit(transport.unit), 'You may only load on pebble terrain!');
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
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SPELL_ENDCAST, null);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				const transport: Transport = this.transports.get(GetTriggerUnit());

				if (!transport || (GetSpellAbilityId() !== ABILITY_ID.UNLOAD && GetSpellAbilityId() !== ABILITY_ID.UNLOAD_DEFAULT_HOTKEY)) {
					return false;
				}

				// Track unloaded units
				const unloadedUnits = transport.cargo.filter((unit) => !IsUnitInTransport(unit, transport.unit));
				transport.cargo = transport.cargo.filter((unit) => IsUnitInTransport(unit, transport.unit));
				unloadedUnits.forEach((unit) => {
					UnitLagManager.getInstance().trackUnit(unit);
				});

				// Disable autoload
				this.handleAutoLoadOff(transport);

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
		return terrainType != FourCC('Vcbp');
	}

	/**
	 * Checks if the target is invalid terrain.
	 */
	private isTargetTerrainInvalid(positionX: number, positionY: number): boolean {
		const terrainType = GetTerrainType(positionX, positionY);
		return terrainType != FourCC('Vcbp');
	}

	private castAutoLoad(transport: Transport) {
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

				IssueTargetOrder(unit, 'smart', transport.unit);
			})
		);

		DestroyGroup(group);
		group = null;
	}

	/**
	 * Handles the activation of the Auto-Load ability.
	 */
	private handleAutoLoadOn(transport: Transport) {
		if (transport.cargo.length >= 10) {
			return;
		}

		transport.autoloadEnabled = true;

		transport.effect = AddSpecialEffectTarget(
			'Abilities\\Spells\\NightElf\\Rejuvenation\\RejuvenationTarget.mdl',
			transport.unit,
			'overhead'
		);

		const timedEventManager: TimedEventManager = TimedEventManager.getInstance();

		transport.event = timedEventManager.registerTimedEvent(AUTO_LOAD_DURATION, () => {
			this.castAutoLoad(transport);

			if (transport.cargo.length >= 10 || !transport.autoloadEnabled || this.isTerrainInvalid(transport.unit)) {
				this.handleAutoLoadOff(transport);
			} else if (transport.event.duration <= 1) {
				// Timer is about to expire naturally - cleanup before auto-removal
				this.handleAutoLoadOff(transport);
			}
		});
	}

	/**
	 * Handles the deactivation of the Auto-Load ability.
	 * @param transport - The transport unit with the Auto-Load ability deactivated.
	 */
	private handleAutoLoadOff(transport: Transport) {
		transport.autoloadEnabled = false;
		DestroyEffect(transport.effect);

		if (transport.event != null) {
			TimedEventManager.getInstance().removeTimedEvent(transport.event);
			transport.event = null;
		}
	}

	/**
	 * Stops the patrol and cleans up resources.
	 */
	private stopPatrol(transport: Transport) {
		transport.patrolEnabled = false;

		if (transport.effect) {
			DestroyEffect(transport.effect);
			transport.effect = null;
		}

		if (transport.patrolEvent) {
			TimedEventManager.getInstance().removeTimedEvent(transport.patrolEvent);
			transport.patrolEvent = null;
		}
	}

	private handlePatrol(transport: Transport) {
		if (!transport.patrolEnabled) return;
		// If transport is dead, onDeath should have handled it, but safety check:
		if (!UnitAlive(transport.unit)) {
			this.stopPatrol(transport);
			return;
		}

		switch (transport.patrolState) {
			case PatrolState.LOADING:
				this.castAutoLoad(transport);
				transport.patrolLoadTimer++;

				if (transport.cargo.length >= 10 || transport.patrolLoadTimer >= 10) {
					transport.patrolState = PatrolState.MOVING;
					transport.patrolLoadTimer = 0;
					transport.isScriptOrdering = true;
					IssuePointOrder(transport.unit, 'move', transport.patrolDestX, transport.patrolDestY);
					transport.isScriptOrdering = false;
				}
				break;

			case PatrolState.MOVING:
				const dx = GetUnitX(transport.unit) - transport.patrolDestX;
				const dy = GetUnitY(transport.unit) - transport.patrolDestY;
				const dist = SquareRoot(dx * dx + dy * dy);

				if (dist < 300) {
					transport.patrolState = PatrolState.UNLOADING;
					transport.isScriptOrdering = true;
					IssuePointOrder(transport.unit, 'unloadall', transport.patrolDestX, transport.patrolDestY);
					transport.isScriptOrdering = false;
				} else if (GetUnitCurrentOrder(transport.unit) != 851986) {
					transport.isScriptOrdering = true;
					IssuePointOrder(transport.unit, 'move', transport.patrolDestX, transport.patrolDestY);
					transport.isScriptOrdering = false;
				}
				break;

			case PatrolState.UNLOADING:
				if (transport.cargo.length == 0) {
					transport.patrolState = PatrolState.RETURNING;
					transport.isScriptOrdering = true;
					IssuePointOrder(transport.unit, 'move', transport.patrolOriginX, transport.patrolOriginY);
					transport.isScriptOrdering = false;
				} else if (GetUnitCurrentOrder(transport.unit) != 852048) {
					transport.isScriptOrdering = true;
					IssuePointOrder(transport.unit, 'unloadall', transport.patrolDestX, transport.patrolDestY);
					transport.isScriptOrdering = false;
				}
				break;

			case PatrolState.RETURNING:
				const rdx = GetUnitX(transport.unit) - transport.patrolOriginX;
				const rdy = GetUnitY(transport.unit) - transport.patrolOriginY;
				const rdist = SquareRoot(rdx * rdx + rdy * rdy);

				if (rdist < 300) {
					transport.patrolState = PatrolState.LOADING;
					transport.isScriptOrdering = true;
					IssueImmediateOrder(transport.unit, 'stop');
					transport.isScriptOrdering = false;
				} else if (GetUnitCurrentOrder(transport.unit) != 851986) {
					transport.isScriptOrdering = true;
					IssuePointOrder(transport.unit, 'move', transport.patrolOriginX, transport.patrolOriginY);
					transport.isScriptOrdering = false;
				}
				break;
		}
	}
}
