import { ABILITY_ID } from '../../configs/ability-id';
import { ClientManager } from '../game/services/client-manager';
import { UnitLagManager } from '../game/services/unit-lag-manager';
import { TimedEvent } from '../libs/timer/timed-event';
import { TimedEventManager } from '../libs/timer/timed-event-manager';
import { debugPrint } from '../utils/debug-print';
import { ErrorMsg } from '../utils/messages';
import { UNIT_TYPE } from '../utils/unit-types';
import { PLAYER_SLOTS } from '../utils/utils';
import { Wait } from '../utils/wait';

type Transport = {
	unit: unit;
	cargo: unit[];
	effect: effect | null;
	duration: number;
	autoloadStatus: boolean;
	event: TimedEvent | null;
};

const AUTO_LOAD_DISTANCE: number = 350;
const AUTO_LOAD_DURATION: number = 600;

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
		this.onLoad();
		this.orderUnloadHandler();
		this.spellCastHandler();
		this.spellEffectHandler();
		this.spellEndCastHandler();
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
			autoloadStatus: false,
			event: null,
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

		transportData.cargo = null;

		if (transportData.effect != null) {
			DestroyEffect(transportData.effect);
		}

		transportData.autoloadStatus = false;

		this.transports.delete(unit);
	}

	/**
	 * Initializes the trigger for units being loaded into transports using the generic load event
	 */
	private onLoad() {
		const t: trigger = CreateTrigger();

		for (let i = 0; i < PLAYER_SLOTS; i++) {
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

				this.transports.get(transport).cargo.push(loadedUnit);

				transport = null;
				loadedUnit = null;

				return true;
			})
		);
	}

	/**
	 * Initializes the trigger for the unload order for transports.
	 */
	private orderUnloadHandler() {
		const t = CreateTrigger();

		for (let i = 0; i < PLAYER_SLOTS; i++) {
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_ISSUED_TARGET_ORDER, null);
		}

		TriggerAddCondition(
			t,
			Condition(async () => {
				if (GetIssuedOrderId() == 852047) {
					const transport: Transport = this.transports.get(GetTriggerUnit());

					if (!transport) return false;

					this.handleAutoLoadOff(transport);

					if (this.isTerrainInvalid(transport.unit)) {
						BlzPauseUnitEx(transport.unit, true);
						BlzPauseUnitEx(transport.unit, false);
						IssueImmediateOrder(transport.unit, 'stop');
						ErrorMsg(ClientManager.getInstance().getActualClientOwnerOfUnit(transport.unit), 'You may only unload on pebble terrain!');
					} else {
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
					}
				}

				return false;
			})
		);
	}

	private spellCastHandler() {
		const t = CreateTrigger();

		for (let i = 0; i < PLAYER_SLOTS; i++) {
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SPELL_CAST, null);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				const transport: Transport = this.transports.get(GetTriggerUnit());

				if (GetSpellAbilityId() != ABILITY_ID.AUTOLOAD_ON) return false;
				if (this.isTerrainInvalid(transport.unit)) return false;
				if (transport.autoloadStatus) return false;

				this.handleAutoLoadOn(transport);

				return false;
			})
		);
	}

	/**
	 * Initializes the trigger for spell effects on transports.
	 */
	private spellEffectHandler() {
		const t = CreateTrigger();

		for (let i = 0; i < PLAYER_SLOTS; i++) {
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SPELL_EFFECT, null);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				const transport: Transport = this.transports.get(GetTriggerUnit());

				if (!transport) return false;
				if (!this.isTerrainInvalid(transport.unit)) return false;

				if (GetSpellAbilityId() == ABILITY_ID.LOAD) {
					IssueImmediateOrder(transport.unit, 'stop');
					BlzPauseUnitEx(transport.unit, true);
					BlzPauseUnitEx(transport.unit, false);
					ErrorMsg(ClientManager.getInstance().getActualClientOwnerOfUnit(transport.unit), 'You may only load on pebble terrain!');
				} else if (GetSpellAbilityId() == ABILITY_ID.UNLOAD) {
					IssueImmediateOrder(transport.unit, 'stop');
					ErrorMsg(ClientManager.getInstance().getActualClientOwnerOfUnit(transport.unit), 'You may only unload on pebble terrain!');
				}

				return false;
			})
		);
	}

	/**
	 * Initializes the trigger for spell end casting on transports.
	 */
	private spellEndCastHandler() {
		const t = CreateTrigger();

		for (let i = 0; i < PLAYER_SLOTS; i++) {
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SPELL_ENDCAST, null);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				const transport: Transport = this.transports.get(GetTriggerUnit());

				if (GetSpellAbilityId() == ABILITY_ID.UNLOAD) {
					debugPrint(`Unload Spell End Cast Event Triggered for unit: ${GetUnitName(transport.unit)}`);
					const unloadedUnits = transport.cargo.filter((unit) => !IsUnitInTransport(unit, transport.unit));
					transport.cargo = transport.cargo.filter((unit) => IsUnitInTransport(unit, transport.unit));
					unloadedUnits.forEach((unit) => {
						debugPrint(`Unit Unloaded Event Triggered for unit: ${GetUnitName(unit)}`);
						UnitLagManager.getInstance().trackUnit(unit);
					});
				}

				return false;
			})
		);
	}

	/**
	 * Checks if a transport unit is on invalid terrain.
	 * @param transport - The transport unit to be checked.
	 * @returns True if terrain is invalid, otherwise false.
	 */
	private isTerrainInvalid(transport: unit): boolean {
		return GetTerrainType(GetUnitX(transport), GetUnitY(transport)) != FourCC('Vcbp');
	}

	/**
	 * Handles the activation of the Auto-Load ability.
	 * @param transport - The transport unit with the Auto-Load ability activated.
	 */
	private handleAutoLoadOn(transport: Transport) {
		if (transport.cargo.length >= 10) {
			return;
		}

		transport.autoloadStatus = true;

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

			if (transport.cargo.length >= 10 || !transport.autoloadStatus || this.isTerrainInvalid(transport.unit)) {
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
		transport.autoloadStatus = false;
		DestroyEffect(transport.effect);

		if (transport.event != null) {
			TimedEventManager.getInstance().removeTimedEvent(transport.event);
			transport.event = null;
		}
	}
}
