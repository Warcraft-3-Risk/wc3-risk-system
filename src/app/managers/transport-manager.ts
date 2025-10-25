import { ABILITY_ID } from '../../configs/ability-id';
import { ClientManager } from '../game/services/client-manager';
import { UnitLagManager } from '../game/services/unit-lag-manager';
import { TimedEvent } from '../libs/timer/timed-event';
import { TimedEventManager } from '../libs/timer/timed-event-manager';
import { debugPrint } from '../utils/debug-print';
import { ErrorMsg } from '../utils/messages';
import { UNIT_TYPE } from '../utils/unit-types';

type Transport = {
	unit: unit;
	cargo: unit[];
	effect: effect | null;
	duration: number;
	autoloadStatus: boolean;
	event: TimedEvent | null;
	floatingText: texttag | null;
};

const AUTO_LOAD_DISTANCE: number = 350;
const AUTO_LOAD_DURATION: number = 600;
const MAX_CARGO_CAPACITY: number = 10;
const FLOATING_TEXT_OFFSET_X: number = -100;
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
		this.onLoad();
		this.orderUnloadHandler();
		this.spellCastHandler();
		this.spellEffectHandler();
		this.spellEndCastHandler();
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
			autoloadStatus: false,
			event: null,
			floatingText: null,
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

		if (transportData.floatingText != null) {
			DestroyTextTag(transportData.floatingText);
			transportData.floatingText = null;
		}

		transportData.autoloadStatus = false;

		this.transports.delete(unit);
	}

	/**
	 * Initializes the trigger for units being loaded into transports using the generic load event
	 */
	private onLoad() {
		const t: trigger = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			debugPrint(`Registering unit loaded event for player ${i}`);
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_LOADED, null);
			debugPrint(`Registered unit loaded event for player ${i}`);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				debugPrint(`Transport Load Event Triggered for unit: ${GetUnitName(GetTriggerUnit())}`);
				let transport: unit = GetTransportUnit();

				if (!transport) return false;

				let loadedUnit: unit = GetLoadedUnit();

				debugPrint(`Unit Loaded Event Triggered for unit: ${GetUnitName(loadedUnit)} into transport: ${GetUnitName(transport)}`);

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

	/**
	 * Initializes the trigger for the unload order for transports.
	 */
	private orderUnloadHandler() {
		const t = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			debugPrint(`Registering unit issued target order event for player ${i}`);
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_ISSUED_TARGET_ORDER, null);
			debugPrint(`Registered unit issued target order event for player ${i}`);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				if (GetIssuedOrderId() == 852047) {
					const transport: Transport = this.transports.get(GetTriggerUnit());

					if (!transport) return false;

					this.handleAutoLoadOff(transport);

					if (this.isTerrainInvalid(transport.unit)) {
						BlzPauseUnitEx(transport.unit, true);
						BlzPauseUnitEx(transport.unit, false);
						IssueImmediateOrder(transport.unit, 'stop');
						ErrorMsg(ClientManager.getInstance().getOwnerOfUnit(transport.unit), 'You may only unload on pebble terrain!');
					} else {
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
					}
				}

				return false;
			})
		);
	}

	private spellCastHandler() {
		const t = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			debugPrint(`Registering transport spell cast event for player ${i}`);
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SPELL_CAST, null);
			debugPrint(`Registered transport spell cast event for player ${i}`);
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

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			debugPrint(`Registering transport spell effect event for player ${i}`);
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SPELL_EFFECT, null);
			debugPrint(`Registered transport spell effect event for player ${i}`);
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
					ErrorMsg(ClientManager.getInstance().getOwnerOfUnit(transport.unit), 'You may only load on pebble terrain!');
				} else if (GetSpellAbilityId() == ABILITY_ID.UNLOAD) {
					IssueImmediateOrder(transport.unit, 'stop');
					ErrorMsg(ClientManager.getInstance().getOwnerOfUnit(transport.unit), 'You may only unload on pebble terrain!');
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

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			debugPrint(`Registering transport spell end cast event for player ${i}`);
			TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SPELL_ENDCAST, null);
			debugPrint(`Registered transport spell end cast event for player ${i}`);
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

					// Update floating text after unloading
					this.updateFloatingText(transport);
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
	 * Updates the floating text display above a transport unit showing cargo count.
	 * Only visible to observers.
	 * @param transport - The transport data to update the floating text for.
	 */
	private updateFloatingText(transport: Transport) {
		const cargoCount = transport.cargo.length;

		// If there's no cargo, hide/destroy the floating text
		if (cargoCount === 0) {
			if (transport.floatingText != null) {
				// Only destroy for observers
				if (IsPlayerObserver(GetLocalPlayer())) {
					DestroyTextTag(transport.floatingText);
				}
				transport.floatingText = null;
			}
			return;
		}

		// Create floating text if it doesn't exist
		if (transport.floatingText == null) {
			transport.floatingText = CreateTextTag();
			SetTextTagPermanent(transport.floatingText, true);
			SetTextTagLifespan(transport.floatingText, 0);
			SetTextTagFadepoint(transport.floatingText, 0);
		}

		// Update the text content
		const text = cargoCount + '/' + MAX_CARGO_CAPACITY;
		SetTextTagText(transport.floatingText, text, 0.017);
		SetTextTagPos(
			transport.floatingText,
			GetUnitX(transport.unit) + FLOATING_TEXT_OFFSET_X,
			GetUnitY(transport.unit),
			FLOATING_TEXT_HEIGHT_OFFSET
		);
		SetTextTagColor(transport.floatingText, 255, 255, 255, 255);

		// Show only to observers using GetLocalPlayer
		if (IsPlayerObserver(GetLocalPlayer())) {
			SetTextTagVisibility(transport.floatingText, true);
		} else {
			SetTextTagVisibility(transport.floatingText, false);
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
					if (transport.floatingText != null && transport.cargo.length > 0) {
						// Update position to follow the unit
						SetTextTagPos(transport.floatingText, GetUnitX(transport.unit) + FLOATING_TEXT_OFFSET_X, GetUnitY(transport.unit), 100);
					}
				});
			}
		});
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
