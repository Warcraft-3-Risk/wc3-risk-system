import { ABILITY_ID } from '../../configs/ability-id';
import { ClientManager } from '../game/services/client-manager';
import { UnitLagManager } from '../game/services/unit-lag-manager';
import { TimedEvent } from '../libs/timer/timed-event';
import { TimedEventManager } from '../libs/timer/timed-event-manager';
import { debugPrint } from '../utils/debug-print';
import { ErrorMsg } from '../utils/messages';
import { UNIT_TYPE } from '../utils/unit-types';
import { HexColors } from '../utils/hex-colors';
import { ORDER_ID } from '../../configs/order-id';

type Transport = {
	unit: unit;
	cargo: unit[];
	effect: effect | null;
	duration: number;
	autoloadEnabled: boolean;
	loadTarget: unit;
	event: TimedEvent | null;
	floatingTextCargo: texttag | null;
	floatingTextCapacity: texttag | null;
};

const AUTO_LOAD_DISTANCE: number = 450;
const AUTO_LOAD_DURATION: number = 600;
const MAX_CARGO_CAPACITY: number = 10;
const CARGO_TEXT_X_OFFSET: number = -160;
const CAPACITY_TEXT_X_OFFSET: number = -85;
const FLOATING_TEXT_OFFSET_Y: number = 120;
const FLOATING_TEXT_HEIGHT_OFFSET: number = 120;

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
		// Handler for order queued for the unload ability finish
		this.onUnloadFinish();

		// Autoload management
		this.onAutoLoadOn();

		// Observer update loop for transport capacity indicators
		this.startFloatingTextUpdateLoop();
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
			floatingTextCargo: null,
			floatingTextCapacity: null,
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

		if (transportData.floatingTextCapacity != null || transportData.floatingTextCargo != null) {
			this.destroyTextTags(transportData);
		}

		transportData.autoloadEnabled = false;

		this.transports.delete(unit);
	}

	/**
	 * Initializes the trigger for units being loaded into transports using the generic load event
	 */
	private onLoadFinish() {
		const t: trigger = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			debugPrint(`TransportManager: Registering onLoadFinish event for player ${i}`);
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

				// Update floating text after loading a unit
				this.updateFloatingText(transportData);

				transport = null;
				loadedUnit = null;

				return true;
			})
		);
	}

	private onLoadStart() {
		const t = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			debugPrint(`TransportManager: Registering onLoadStart event for player ${i}`);
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

	private onUnloadUnitStart() {
		const t = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			debugPrint(`TransportManager: Registering onUnloadUnitStart event for player ${i}`);
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

					// Update floating text after unloading a unit
					this.updateFloatingText(transport);

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
			debugPrint(`TransportManager: Registering onUnloadStart event for player ${i}`);
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_ISSUED_POINT_ORDER, null);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				const transport: Transport = this.transports.get(GetTriggerUnit());

				if (GetIssuedOrderId() !== ORDER_ID.UNLOAD_ALL || !transport) {
					return false;
				}

				if (this.isTargetTerrainInvalid(GetOrderPointX(), GetOrderPointY())) {
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

					// Update floating text after unloading a unit
					this.updateFloatingText(transport);

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

				return false;
			})
		);
	}

	private onAutoLoadOn() {
		const t = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			debugPrint(`TransportManager: Registering onAutoLoadOn event for player ${i}`);
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

	/**
	 * Initializes the trigger for spell effects on transports.
	 */
	private onLoadAction() {
		const t = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			debugPrint(`TransportManager: Registering onLoadAction event for player ${i}`);
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
			debugPrint(`TransportManager: Registering onUnloadFinish event for player ${i}`);
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

				// Update floating text after unloading
				this.updateFloatingText(transport);

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
		const terrainType = GetTerrainType(GetUnitX(u), GetUnitY(u))
		return terrainType != FourCC('Vcbp');
	}

	/**
	 * Checks if the target is invalid terrain.
	 */
	private isTargetTerrainInvalid(positionX: number, positionY: number): boolean {
		const terrainType = GetTerrainType(positionX, positionY);
		return terrainType != FourCC('Vcbp');
	}

	/**
	 * Updates the floating text display above a transport unit showing cargo count.
	 * Only visible to observers.
	 * @param transport - The transport data to update the floating text for.
	 */
	private updateFloatingText(transport: Transport) {
		const cargoCount = transport.cargo.length;
		const unitX = GetUnitX(transport.unit);
		const unitY = GetUnitY(transport.unit);

		// If no cargo, hide both texts
		if (cargoCount === 0) {
			this.destroyTextTags(transport);
			return;
		}

		// Create cargo text ("3 /") if needed
		if (transport.floatingTextCargo == null) {
			transport.floatingTextCargo = CreateTextTag();
			SetTextTagPermanent(transport.floatingTextCargo, true);
			SetTextTagLifespan(transport.floatingTextCargo, 0);
			SetTextTagFadepoint(transport.floatingTextCargo, 0);
		}
		const cargoStr = `${HexColors.TANGERINE} ${cargoCount} /`;
		SetTextTagText(transport.floatingTextCargo, cargoStr, 0.017);
		SetTextTagPos(transport.floatingTextCargo, unitX + CARGO_TEXT_X_OFFSET, unitY + FLOATING_TEXT_OFFSET_Y, FLOATING_TEXT_HEIGHT_OFFSET);

		// Create capacity text ("10") if needed
		if (transport.floatingTextCapacity == null) {
			transport.floatingTextCapacity = CreateTextTag();
			SetTextTagPermanent(transport.floatingTextCapacity, true);
			SetTextTagLifespan(transport.floatingTextCapacity, 0);
			SetTextTagFadepoint(transport.floatingTextCapacity, 0);
		}
		const capacityStr = `${HexColors.TANGERINE} ${MAX_CARGO_CAPACITY}`;
		SetTextTagText(transport.floatingTextCapacity, capacityStr, 0.017);
		SetTextTagPos(
			transport.floatingTextCapacity,
			unitX + CAPACITY_TEXT_X_OFFSET,
			unitY + FLOATING_TEXT_OFFSET_Y,
			FLOATING_TEXT_HEIGHT_OFFSET
		);

		// Visibility for observers only
		if (IsPlayerObserver(GetLocalPlayer())) {
			SetTextTagVisibility(transport.floatingTextCargo, true);
			SetTextTagVisibility(transport.floatingTextCapacity, true);
		} else {
			SetTextTagVisibility(transport.floatingTextCargo, false);
			SetTextTagVisibility(transport.floatingTextCapacity, false);
		}
	}

	/**
	 * Helper function to destroy transport ship text tags
	 */
	private destroyTextTags(transport: Transport) {
		if (transport.floatingTextCargo != null) {
			if (IsPlayerObserver(GetLocalPlayer())) {
				DestroyTextTag(transport.floatingTextCargo);
			}
			transport.floatingTextCargo = null;
		}
		if (transport.floatingTextCapacity != null) {
			if (IsPlayerObserver(GetLocalPlayer())) {
				DestroyTextTag(transport.floatingTextCapacity);
			}
			transport.floatingTextCapacity = null;
		}
	}

	/**
	 * Starts a periodic loop to update floating text positions for all transports.
	 * This ensures the floating text follows the transport units as they move.
	 */
	private startFloatingTextUpdateLoop() {
		const updateTimer: timer = CreateTimer();

		TimerStart(updateTimer, 0.03, true, () => {
			if (IsPlayerObserver(GetLocalPlayer())) {
				this.transports.forEach((transport) => {
					// Update both if exist and cargo >0
					if (transport.cargo.length > 0) {
						const unitX = GetUnitX(transport.unit);
						const unitY = GetUnitY(transport.unit);
						if (transport.floatingTextCargo != null) {
							SetTextTagPos(
								transport.floatingTextCargo,
								unitX + CARGO_TEXT_X_OFFSET,
								unitY + FLOATING_TEXT_OFFSET_Y,
								FLOATING_TEXT_HEIGHT_OFFSET
							);
						}
						if (transport.floatingTextCapacity != null) {
							SetTextTagPos(
								transport.floatingTextCapacity,
								unitX + CAPACITY_TEXT_X_OFFSET,
								unitY + FLOATING_TEXT_OFFSET_Y,
								FLOATING_TEXT_HEIGHT_OFFSET
							);
						}
					}
				});
			}
		});
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

		const event: TimedEvent = timedEventManager.registerTimedEvent(AUTO_LOAD_DURATION, () => {
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

			if (transport.cargo.length >= 10 || !transport.autoloadEnabled || this.isTerrainInvalid(transport.unit)) {
				this.handleAutoLoadOff(transport);
				timedEventManager.removeTimedEvent(event);
			}
		});

		transport.event = event;
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
}
