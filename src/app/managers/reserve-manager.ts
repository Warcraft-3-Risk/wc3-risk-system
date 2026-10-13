import { ABILITY_ID } from 'src/configs/ability-id';
import { UNIT_ID } from 'src/configs/unit-id';
import { RESERVE_BUDGET_MAX, RESERVE_BUDGET_MINUTES_TO_MAX, RESERVE_BUDGET_PER_SECOND, RESERVE_DEPLOY_MAX_HEAVY_UNITS, RESERVE_DEPLOY_MAX_UNITS, RESERVE_DEPLOY_RADIUS } from 'src/configs/game-settings';
import { City } from '../city/city';
import { GlobalGameData } from '../game/state/global-game-state';
import { ActivePlayer } from '../player/types/active-player';
import { HexColors } from '../utils/hex-colors';
import { ErrorMsg } from '../utils/messages';
import { UNIT_TYPE } from '../utils/unit-types';
import { MinimapIconManager } from './minimap-icon-manager';
import { debugPrint } from '../utils/debug-print';

/**
 * Unit types that can be sent to the reserves, in the order their deploy buttons appear.
 * Transport ships are left out on purpose - they never receive the ability.
 */
const RESERVABLE_UNIT_TYPES: number[] = [
	UNIT_ID.RIFLEMEN,
	UNIT_ID.MEDIC,
	UNIT_ID.MORTAR,
	UNIT_ID.ROARER,
	UNIT_ID.KNIGHT,
	UNIT_ID.GENERAL,
	UNIT_ID.ARTILLERY,
	UNIT_ID.TANK,
	UNIT_ID.MARINE,
	UNIT_ID.CAPTAIN,
	UNIT_ID.ADMIRAL,
	UNIT_ID.WARSHIP_A,
	UNIT_ID.WARSHIP_B,
	UNIT_ID.BATTLESHIP_SS,
];

/** Reservable ships - these can only be deployed near one of the player's ports. */
const RESERVABLE_SHIP_TYPES: number[] = [UNIT_ID.WARSHIP_A, UNIT_ID.WARSHIP_B, UNIT_ID.BATTLESHIP_SS];

/**
 * Reserve budget each unit uses up when deployed - its gold cost from the object editor (risk_europe.w3x).
 * Map scripts cannot read gold costs at runtime, so they are copied here; keep in sync if costs change.
 */
const DEPLOY_COSTS: Map<number, number> = new Map([
	[UNIT_ID.RIFLEMEN, 1],
	[UNIT_ID.MEDIC, 2],
	[UNIT_ID.MORTAR, 3],
	[UNIT_ID.ROARER, 4],
	[UNIT_ID.KNIGHT, 5],
	[UNIT_ID.GENERAL, 10],
	[UNIT_ID.ARTILLERY, 15],
	[UNIT_ID.TANK, 25],
	[UNIT_ID.MARINE, 1],
	[UNIT_ID.CAPTAIN, 5],
	[UNIT_ID.ADMIRAL, 10],
	[UNIT_ID.WARSHIP_A, 5],
	[UNIT_ID.WARSHIP_B, 20],
	[UNIT_ID.BATTLESHIP_SS, 45],
]);

/** Heavy units: at most {@link RESERVE_DEPLOY_MAX_HEAVY_UNITS} of these come out per deployment. */
const HEAVY_UNIT_TYPES: number[] = [UNIT_ID.GENERAL, UNIT_ID.ADMIRAL, UNIT_ID.ARTILLERY, UNIT_ID.TANK, UNIT_ID.WARSHIP_B, UNIT_ID.BATTLESHIP_SS];

const BUTTON_CONTEXT_OFFSET: number = 600;
const BUTTON_SIZE: number = 0.026;
const BUTTON_GAP: number = 0.003;
// The row is anchored to the minimap's top-right corner so it stays next to the map on every screen size:
// it starts a little right of the minimap's button column, sits on the top edge of the console, and grows
// to the right.
const BUTTON_ROW_X_FROM_MINIMAP: number = 0.07;
const BUTTON_ROW_Y_FROM_MINIMAP: number = -0.006;
const COUNT_BADGE_WIDTH: number = 0.014;
const COUNT_BADGE_HEIGHT: number = 0.011;
const COUNT_TEXT_SCALE: number = 0.85;
// The dark box WC3 itself draws behind item charges, so the count reads on light and dark icons alike
const COUNT_BADGE_TEXTURE: string = 'UI\\Widgets\\Console\\Human\\CommandButton\\human-button-lvls-overlay.blp';
// Border drawn around the armed button. A solid color texture is used for four thin strips, so the middle
// stays empty and the icon shows through. (WC3's own "active button" glow has a black center that is only
// see-through with additive blending, which frames created from code cannot use.)
const ARMED_BORDER_TEXTURE: string = 'ReplaceableTextures\\TeamColor\\TeamColor04.blp';
// Thickness of the border strips
const ARMED_BORDER_THICKNESS: number = 0.0006;
const DIMMED_ALPHA: number = 110;
// How often the budget grows and the buttons are refreshed
const BUDGET_TICK: number = 0.25;
// Budget display: shown in the resource bar at the top right as a fourth "resource", in place of the map
// version (which is the 'mapInfo' frame created in SetConsoleUI)
const MAP_INFO_FRAME: string = 'mapInfo';
// WC3's own food icon from the resource bar - unused, since the map shows an hourglass for the turn instead -
// so it matches the style of the gold coin
const BUDGET_ICON_TEXTURE: string = 'UI\\Feedback\\Resources\\ResourceSupply.blp';
const BUDGET_ICON_SIZE: number = 0.016;
// The budget takes the fourth slot of the resource bar. Positions are relative to the right edge of the turn
// counter (the third slot): the number is right-aligned to BUDGET_TEXT_RIGHT like the native numbers, and the
// icon is centered at BUDGET_ICON_CENTER, matching the spacing of the native slots
const BUDGET_TEXT_RIGHT: number = 0.0815;
const BUDGET_ICON_CENTER: number = 0.0238;
// The tooltip opens at the bottom right, above the command card, growing upwards
const BUDGET_TOOLTIP_X: number = 0.79;
const BUDGET_TOOLTIP_Y: number = 0.17;
const BUDGET_TOOLTIP_WIDTH: number = 0.2;
// F1 arms the leftmost visible reserve button, F2 the next one, and so on
const SLOT_HOTKEYS: oskeytype[] = [OSKEY_F1, OSKEY_F2, OSKEY_F3, OSKEY_F4];
const SLOT_HOTKEY_LABELS: string[] = ['F1', 'F2', 'F3', 'F4'];

// Offset of the barracks rally point from the barracks, as set in City.changeOwner()
const RALLY_OFFSET_X: number = -70;
const RALLY_OFFSET_Y: number = -155;

const TELEPORT_EFFECT: string = 'Abilities\\Spells\\Human\\MassTeleport\\MassTeleportTarget.mdl';
const RESERVE_EFFECT: string = 'Abilities\\Spells\\Human\\MassTeleport\\MassTeleportCaster.mdl';
const CASTING_EFFECT: string = 'Abilities\\Spells\\Human\\DevotionAura\\DevotionAura.mdl';

// Hit points and mana at the moment the unit went into the reserves. Hidden units still regenerate,
// so these are put back on deploy - a unit comes out exactly as it went in.
interface ReservedState {
	life: number;
	mana: number;
}

interface ReserveSlot {
	unitTypeId: number;
	button: framehandle;
	icon: framehandle;
	countText: framehandle;
	armedHighlight: framehandle;
	countBadge: framehandle;
	tooltipText: framehandle;
}

/**
 * Reserves game type.
 *
 * Every reservable unit gets the "Send to Reserves" ability. Its cast time is set in the object editor,
 * so moving (or any other order) interrupts it the normal way; a devotion aura shows under the unit
 * while it casts. Once the cast completes the unit is hidden and parked off the battlefield, keeping the
 * hit points and mana it had. A row of buttons above the console shows one button per unit type in
 * reserve (icon + count). Clicking a button and then left-clicking one of the player's cities (for ships,
 * a port) deploys up to {@link RESERVE_DEPLOY_MAX_UNITS} reserved units of that type at that city - for heavy
 * units, up to {@link RESERVE_DEPLOY_MAX_HEAVY_UNITS}.
 *
 * Deploying is paid for with a reserve budget that grows steadily during a match, from 0 to
 * {@link RESERVE_BUDGET_MAX} in {@link RESERVE_BUDGET_MINUTES_TO_MAX} minutes. Every deployed unit uses up its gold cost.
 *
 * Reserved units keep their spawner slot and stay in the player's tracked units - they are only hidden.
 *
 * Like {@link MinimapIconManager}, nothing happens until {@link activate} is called, so referencing the
 * manager from shared code (trained units, spawners, guards) is free in every other mode.
 *
 * Desync safety: all reserve state is changed only from synced events (spell effects, frame clicks,
 * mouse clicks), and the button frames are created identically on every client. Each client merely
 * renders its own local player's reserves into that shared set of frames.
 */
export class ReserveManager {
	private static instance: ReserveManager;

	private isActive: boolean = false;
	private reserves: Map<player, Map<number, unit[]>> = new Map();
	// The unit type a player has armed for deployment and is now picking a location for
	private pendingDeploy: Map<player, number> = new Map();
	private slots: ReserveSlot[] = [];
	// Devotion aura shown under a unit while it is casting Send to Reserves
	private castingEffects: Map<unit, effect> = new Map();
	private reservedStates: Map<unit, ReservedState> = new Map();
	// Budget a player has to deploy units with - grows on the synced tick, so it is identical on every client
	private budgets: Map<player, number> = new Map();
	// Invisible button covering the budget icon and text - it carries the tooltip
	private budgetDisplay: framehandle;
	private budgetText: framehandle;
	private mapInfo: framehandle;
	private storageX: number;
	private storageY: number;

	public static getInstance(): ReserveManager {
		if (!this.instance) {
			this.instance = new ReserveManager();
		}
		return this.instance;
	}

	private constructor() {}

	public isEnabled(): boolean {
		return this.isActive;
	}

	/**
	 * Switches the reserves on. Called once, from the first match of the Reserves game type; later calls are no-ops.
	 */
	public activate(): void {
		if (this.isActive) return;

		this.isActive = true;

		// Hidden units are parked in a map corner so no city region, transport autoload or other
		// range enumeration ever picks them up
		this.storageX = GetRectMinX(bj_mapInitialPlayableArea) + 64;
		this.storageY = GetRectMinY(bj_mapInitialPlayableArea) + 64;

		this.registerExistingUnits();
		this.buildSlots();
		this.registerCastTriggers();
		this.registerMouseTargeting();
		this.registerSlotHotkeys();

		TimerStart(CreateTimer(), BUDGET_TICK, true, () => this.onBudgetTick());
	}

	/**
	 * Synced tick: grows every match player's budget while the match is running, then refreshes the buttons.
	 */
	private onBudgetTick(): void {
		if (GlobalGameData.matchState == 'inProgress') {
			const players: ActivePlayer[] = GlobalGameData.matchPlayers;

			for (let i = 0; i < players.length; i++) {
				const owner: player = players[i].getPlayer();

				this.budgets.set(owner, Math.min(RESERVE_BUDGET_MAX, this.getBudget(owner) + RESERVE_BUDGET_PER_SECOND * BUDGET_TICK));
			}
		}

		this.render();
	}

	private getBudget(owner: player): number {
		return this.budgets.get(owner) || 0;
	}

	private getDeployCost(typeId: number): number {
		return DEPLOY_COSTS.get(typeId) || 1;
	}

	/** The most units of the type that come out in one deployment. */
	private getDeployLimit(typeId: number): number {
		return HEAVY_UNIT_TYPES.indexOf(typeId) >= 0 ? RESERVE_DEPLOY_MAX_HEAVY_UNITS : RESERVE_DEPLOY_MAX_UNITS;
	}

	/** Whether the player's budget covers at least one unit of the type. */
	private canAfford(owner: player, typeId: number): boolean {
		return this.getBudget(owner) >= this.getDeployCost(typeId);
	}

	private showBudgetError(owner: player, typeId: number): void {
		ErrorMsg(
			owner,
			`Not enough reserve budget: ${GetObjectName(typeId)} costs ${this.getDeployCost(typeId)}, you have ${Math.floor(this.getBudget(owner))}.`
		);
	}

	/**
	 * Gives a unit the "Send to Reserves" ability if it is a reservable type. Safe to call with any unit,
	 * and calling it again for a unit that already has the ability does nothing.
	 *
	 * Guards get it too, even though casting it does nothing for them: a selection containing a unit
	 * without the ability hides its button, so a guard in the selection would otherwise block everyone.
	 */
	public registerUnit(unit: unit): void {
		if (!this.isActive) return;
		if (RESERVABLE_UNIT_TYPES.indexOf(GetUnitTypeId(unit)) < 0) return;

		UnitAddAbility(unit, ABILITY_ID.SEND_TO_RESERVES);
	}

	/**
	 * The city guards are built at map init, before the reserves are switched on, so they are given the
	 * ability here. Every unit created after activation is registered as it appears.
	 */
	private registerExistingUnits(): void {
		const g: group = CreateGroup();

		GroupEnumUnitsInRect(g, bj_mapInitialPlayableArea, null);

		for (let i = 0; i < BlzGroupGetSize(g); i++) {
			this.registerUnit(BlzGroupUnitAt(g, i));
		}

		DestroyGroup(g);
	}

	/**
	 * Called from the spell effect event, i.e. once the cast time finished without being interrupted.
	 */
	public sendToReserves(unit: unit): void {
		if (!this.isActive) return;

		this.removeCastingEffect(unit);

		// The unit may have become a guard during the cast time
		if (!this.canUseReserves(unit)) return;

		const owner: player = GetOwningPlayer(unit);

		this.reservedStates.set(unit, {
			life: GetWidgetLife(unit),
			mana: GetUnitState(unit, UNIT_STATE_MANA),
		});

		const effect: effect = AddSpecialEffect(RESERVE_EFFECT, GetUnitX(unit), GetUnitY(unit));
		DestroyEffect(effect);

		MinimapIconManager.getInstance().unregisterTrackedUnit(unit);
		ShowUnit(unit, false);
		SetUnitX(unit, this.storageX);
		SetUnitY(unit, this.storageY);

		const unitsByType: Map<number, unit[]> = this.getReservesOf(owner);
		const typeId: number = GetUnitTypeId(unit);

		if (!unitsByType.has(typeId)) {
			unitsByType.set(typeId, []);
		}

		// Never list a unit twice - a duplicate would inflate the count shown on the button
		if (unitsByType.get(typeId).indexOf(unit) < 0) {
			unitsByType.get(typeId).push(unit);
		}

		debugPrint(`[Reserves] ${GetUnitName(unit)} sent to reserves, ${unitsByType.get(typeId).length} of this type in reserve`);

		this.render();
	}

	/**
	 * Clears all reserves between matches. The hidden units themselves are removed by removeUnits().
	 */
	public reset(): void {
		if (!this.isActive) return;

		this.castingEffects.forEach((effect) => DestroyEffect(effect));
		this.castingEffects.clear();
		this.reservedStates.clear();
		this.reserves.clear();
		this.pendingDeploy.clear();
		this.budgets.clear();
		this.render();
	}

	private canUseReserves(unit: unit): boolean {
		if (GlobalGameData.matchState != 'inProgress') return false;
		if (!UnitAlive(unit)) return false;
		if (IsUnitType(unit, UNIT_TYPE.GUARD)) return false;
		if (IsUnitType(unit, UNIT_TYPE.TRANSPORT)) return false;

		return true;
	}

	// Looked up through GlobalGameData rather than PlayerManager, so the spawner and guard importing this
	// manager do not pull PlayerManager into their require chain
	private getMatchPlayer(owner: player): ActivePlayer | undefined {
		return GlobalGameData.matchPlayers.find((x) => x.getPlayer() == owner);
	}

	private getReservesOf(owner: player): Map<number, unit[]> {
		if (!this.reserves.has(owner)) {
			this.reserves.set(owner, new Map());
		}

		return this.reserves.get(owner);
	}

	private getReservedCount(owner: player, typeId: number): number {
		const unitsByType: Map<number, unit[]> | undefined = this.reserves.get(owner);
		if (!unitsByType || !unitsByType.has(typeId)) return 0;

		return unitsByType.get(typeId).length;
	}

	private removeCastingEffect(unit: unit): void {
		const effect: effect | undefined = this.castingEffects.get(unit);
		if (!effect) return;

		DestroyEffect(effect);
		this.castingEffects.delete(unit);
	}

	/**
	 * When a cast starts: cancels it right away if the unit is not allowed into the reserves, instead of
	 * letting the player wait out the cast time for nothing, and otherwise shows the devotion aura.
	 * When a cast ends - finished, or interrupted by moving, dying etc. - the aura is removed again.
	 * Taking any damage while casting interrupts the cast, so units cannot escape a fight into the reserves.
	 */
	private registerCastTriggers(): void {
		const channelTrigger: trigger = CreateTrigger();
		const endCastTrigger: trigger = CreateTrigger();
		const damagedTrigger: trigger = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			TriggerRegisterPlayerUnitEvent(channelTrigger, Player(i), EVENT_PLAYER_UNIT_SPELL_CHANNEL, null);
			TriggerRegisterPlayerUnitEvent(endCastTrigger, Player(i), EVENT_PLAYER_UNIT_SPELL_ENDCAST, null);
			TriggerRegisterPlayerUnitEvent(damagedTrigger, Player(i), EVENT_PLAYER_UNIT_DAMAGED, null);
		}

		TriggerAddCondition(
			channelTrigger,
			Condition(() => {
				if (GetSpellAbilityId() != ABILITY_ID.SEND_TO_RESERVES) return false;

				const caster: unit = GetTriggerUnit();

				if (!this.canUseReserves(caster)) {
					this.interruptCast(caster);

					// Guards only carry the ability so it shows for mixed selections - they silently ignore it
					if (!IsUnitType(caster, UNIT_TYPE.GUARD)) {
						ErrorMsg(GetOwningPlayer(caster), 'This unit cannot be sent to the reserves right now.');
					}

					return false;
				}

				this.removeCastingEffect(caster);
				this.castingEffects.set(caster, AddSpecialEffectTarget(CASTING_EFFECT, caster, 'origin'));

				return false;
			})
		);

		TriggerAddCondition(
			endCastTrigger,
			Condition(() => {
				if (GetSpellAbilityId() == ABILITY_ID.SEND_TO_RESERVES) this.removeCastingEffect(GetTriggerUnit());

				return false;
			})
		);

		TriggerAddCondition(
			damagedTrigger,
			Condition(() => {
				const damaged: unit = GetTriggerUnit();

				// Only units currently casting Send to Reserves carry a casting effect. Zero-damage events
				// (e.g. friendly city attacks, which are nulled elsewhere) do not count as being hit.
				if (!this.castingEffects.has(damaged) || GetEventDamage() <= 0) return false;

				this.removeCastingEffect(damaged);
				this.interruptCast(damaged);

				return false;
			})
		);
	}

	private interruptCast(unit: unit): void {
		// Pausing around the stop order is what actually interrupts a cast from within an event
		PauseUnit(unit, true);
		IssueImmediateOrder(unit, 'stop');
		PauseUnit(unit, false);
	}

	/**
	 * Picks the deploy location: after arming a unit type, the player's next left click on the map is
	 * the target and a right click cancels. Mouse events are synced, so this runs on every client.
	 */
	private registerMouseTargeting(): void {
		const t: trigger = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			TriggerRegisterPlayerEvent(t, Player(i), EVENT_PLAYER_MOUSE_DOWN);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				const owner: player = GetTriggerPlayer();
				const typeId: number | undefined = this.pendingDeploy.get(owner);

				if (typeId == undefined) return false;

				if (BlzGetTriggerPlayerMouseButton() == MOUSE_BUTTON_TYPE_RIGHT) {
					this.pendingDeploy.delete(owner);
					this.render();
					return false;
				}

				if (BlzGetTriggerPlayerMouseButton() != MOUSE_BUTTON_TYPE_LEFT) return false;

				const x: number = BlzGetTriggerPlayerMouseX();
				const y: number = BlzGetTriggerPlayerMouseY();

				// Clicks on UI frames report no world position
				if (x == 0 && y == 0) return false;

				this.tryDeploy(owner, typeId, x, y);

				return false;
			})
		);
	}

	/**
	 * The reserve buttons a player currently sees, left to right. Built from synced state only, so it
	 * gives the same answer on every client and is safe to use for hotkeys.
	 */
	private getVisibleSlots(owner: player): ReserveSlot[] {
		const visibleSlots: ReserveSlot[] = [];

		for (let i = 0; i < this.slots.length; i++) {
			if (this.getReservedCount(owner, this.slots[i].unitTypeId) > 0) visibleSlots.push(this.slots[i]);
		}

		return visibleSlots;
	}

	/**
	 * F1-F4 press the first four visible reserve buttons. Key events are synced like frame clicks.
	 *
	 * They act on key down, not key up: with key up, an F1 + left click done quickly delivered the click
	 * before F1 was released, i.e. before anything was armed. Holding a key repeats the key down event,
	 * so further downs are ignored until the key is released - otherwise it would flicker armed/cancelled.
	 */
	private registerSlotHotkeys(): void {
		for (let k = 0; k < SLOT_HOTKEYS.length; k++) {
			// Copied into a per-iteration const: tstl compiles the loop counter to one shared Lua local,
			// so a closure capturing `k` itself would see its final value for every key
			const slotIndex: number = k;
			const heldBy: Set<player> = new Set();
			const keyDown: trigger = CreateTrigger();
			const keyUp: trigger = CreateTrigger();

			for (let i = 0; i < bj_MAX_PLAYERS; i++) {
				BlzTriggerRegisterPlayerKeyEvent(keyDown, Player(i), SLOT_HOTKEYS[slotIndex], 0, true);
				BlzTriggerRegisterPlayerKeyEvent(keyUp, Player(i), SLOT_HOTKEYS[slotIndex], 0, false);
			}

			TriggerAddCondition(
				keyDown,
				Condition(() => {
					const owner: player = GetTriggerPlayer();

					if (heldBy.has(owner)) return false;
					heldBy.add(owner);

					const slot: ReserveSlot | undefined = this.getVisibleSlots(owner)[slotIndex];

					if (slot) this.onSlotPressed(owner, slot);

					return false;
				})
			);

			TriggerAddCondition(
				keyUp,
				Condition(() => {
					heldBy.delete(GetTriggerPlayer());
					return false;
				})
			);
		}
	}

	private onSlotClicked(slot: ReserveSlot): void {
		this.onSlotPressed(GetTriggerPlayer(), slot);
	}

	private onSlotPressed(owner: player, slot: ReserveSlot): void {
		const player: ActivePlayer | undefined = this.getMatchPlayer(owner);

		if (!player || !player.status.isActive()) return;
		if (this.getReservedCount(owner, slot.unitTypeId) == 0) return;

		// Clicking the armed button again cancels
		if (this.pendingDeploy.get(owner) == slot.unitTypeId) {
			this.pendingDeploy.delete(owner);
			this.render();
			return;
		}

		if (!this.canAfford(owner, slot.unitTypeId)) {
			this.showBudgetError(owner, slot.unitTypeId);
			return;
		}

		this.pendingDeploy.set(owner, slot.unitTypeId);
		this.render();
	}

	private tryDeploy(owner: player, typeId: number, x: number, y: number): void {
		const player: ActivePlayer | undefined = this.getMatchPlayer(owner);

		if (GlobalGameData.matchState != 'inProgress' || !player || !player.status.isActive()) {
			this.pendingDeploy.delete(owner);
			this.render();
			return;
		}

		const isShip: boolean = RESERVABLE_SHIP_TYPES.indexOf(typeId) >= 0;

		const city: City | undefined = this.findOwnedCityInRange(player, x, y, isShip);

		if (!city) {
			ErrorMsg(owner, isShip ? 'Click one of your ports to deploy ships.' : 'Click one of your cities to deploy units.');
			return;
		}

		if (!this.canAfford(owner, typeId)) {
			this.showBudgetError(owner, typeId);
			this.pendingDeploy.delete(owner);
			this.render();
			return;
		}

		// Units do not appear at the click but at a fixed spot of the city: land units at the barracks rally
		// point, ships on the port's circle of power, which is always in the water
		const deployX: number = isShip ? city.guard.defaultX : city.barrack.defaultX + RALLY_OFFSET_X;
		const deployY: number = isShip ? city.guard.defaultY : city.barrack.defaultY + RALLY_OFFSET_Y;

		const reserved: unit[] = this.getReservesOf(owner).get(typeId) || [];
		const cost: number = this.getDeployCost(typeId);
		const affordable: number = Math.floor(this.getBudget(owner) / cost);
		// Oldest units first, at most the per-deployment limit of the type and only as many as the budget
		// covers - the rest stay in the reserves
		const units: unit[] = reserved.splice(0, Math.min(this.getDeployLimit(typeId), affordable));

		let deployed: number = 0;

		for (let i = 0; i < units.length; i++) {
			const u: unit = units[i];

			if (!UnitAlive(u)) continue;

			// Moved to the target while still hidden, so the unit never becomes visible in the storage
			// corner - if SetUnitPosition cannot place it, it still ends up at the target, not stranded there
			SetUnitX(u, deployX);
			SetUnitY(u, deployY);
			ShowUnit(u, true);
			SetUnitPosition(u, deployX, deployY);
			deployed++;

			const state: ReservedState | undefined = this.reservedStates.get(u);
			if (state) {
				SetWidgetLife(u, state.life);
				SetUnitState(u, UNIT_STATE_MANA, state.mana);
				this.reservedStates.delete(u);
			}

			IssueImmediateOrder(u, 'stop');
			MinimapIconManager.getInstance().registerIfValid(u, true);
		}

		// Units that died in the reserves are not paid for
		this.budgets.set(owner, this.getBudget(owner) - deployed * cost);

		debugPrint(`[Reserves] Deployed ${deployed} of ${units.length} taken from reserve (${units.length - deployed} were dead), ${reserved.length} left in reserve`);

		if (reserved.length == 0) this.getReservesOf(owner).delete(typeId);
		this.pendingDeploy.delete(owner);

		const effect: effect = AddSpecialEffect(TELEPORT_EFFECT, deployX, deployY);
		DestroyEffect(effect);

		this.render();
	}

	/**
	 * The closest city the player owns whose barracks was clicked, i.e. lies within
	 * {@link RESERVE_DEPLOY_RADIUS} of the click, if any.
	 * @param portsOnly - Only count port cities (ships can only be deployed near a port)
	 */
	private findOwnedCityInRange(player: ActivePlayer, x: number, y: number, portsOnly: boolean): City | undefined {
		const cities: City[] = player.trackedData.cities.cities;
		const rangeSquared: number = RESERVE_DEPLOY_RADIUS * RESERVE_DEPLOY_RADIUS;
		let closest: City | undefined = undefined;
		let closestDistance: number = rangeSquared;

		for (let i = 0; i < cities.length; i++) {
			if (portsOnly && !cities[i].isPort()) continue;

			const dx: number = cities[i].barrack.defaultX - x;
			const dy: number = cities[i].barrack.defaultY - y;
			const distance: number = dx * dx + dy * dy;

			if (distance <= closestDistance) {
				closest = cities[i];
				closestDistance = distance;
			}
		}

		return closest;
	}

	/**
	 * Draws a border just inside the edges of `parent` out of four thin strips (top, bottom, left, right).
	 * Each strip is pinned by two opposite corners, so its size follows the parent exactly.
	 */
	private buildBorderStrips(parent: framehandle, context: number): void {
		const t: number = ARMED_BORDER_THICKNESS;
		// [strip top-left corner relative to, x, y, strip bottom-right corner relative to, x, y]
		const edges: [framepointtype, number, number, framepointtype, number, number][] = [
			[FRAMEPOINT_TOPLEFT, 0, 0, FRAMEPOINT_TOPRIGHT, 0, -t], // top
			[FRAMEPOINT_BOTTOMLEFT, 0, t, FRAMEPOINT_BOTTOMRIGHT, 0, 0], // bottom
			[FRAMEPOINT_TOPLEFT, 0, 0, FRAMEPOINT_BOTTOMLEFT, t, 0], // left
			[FRAMEPOINT_TOPRIGHT, -t, 0, FRAMEPOINT_BOTTOMRIGHT, 0, 0], // right
		];

		for (let i = 0; i < edges.length; i++) {
			const [topLeftAnchor, topLeftX, topLeftY, bottomRightAnchor, bottomRightX, bottomRightY] = edges[i];
			const strip: framehandle = BlzCreateFrameByType('BACKDROP', 'ReserveButtonArmedBorderStrip', parent, '', context);

			BlzFrameSetPoint(strip, FRAMEPOINT_TOPLEFT, parent, topLeftAnchor, topLeftX, topLeftY);
			BlzFrameSetPoint(strip, FRAMEPOINT_BOTTOMRIGHT, parent, bottomRightAnchor, bottomRightX, bottomRightY);
			BlzFrameSetTexture(strip, ARMED_BORDER_TEXTURE, 0, true);
			BlzFrameSetEnable(strip, false);
		}
	}

	/**
	 * Creates one button per reservable unit type. Runs on every client so the frame handles match.
	 */
	private buildSlots(): void {
		const gameUI: framehandle = BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0);

		for (let i = 0; i < RESERVABLE_UNIT_TYPES.length; i++) {
			const unitTypeId: number = RESERVABLE_UNIT_TYPES[i];
			const context: number = BUTTON_CONTEXT_OFFSET + i;

			const button: framehandle = BlzCreateFrameByType('BUTTON', 'ReserveButton', gameUI, 'ScoreScreenTabButtonTemplate', context);
			BlzFrameSetSize(button, BUTTON_SIZE, BUTTON_SIZE);

			const icon: framehandle = BlzCreateFrameByType('BACKDROP', 'ReserveButtonIcon', button, '', context);
			BlzFrameSetAllPoints(icon, button);
			BlzFrameSetTexture(icon, BlzGetAbilityIcon(unitTypeId), 0, true);

			// Border shown while this button is armed, waiting for the deploy click. An empty container holds
			// the four edge strips, so showing or hiding the container toggles the whole border.
			const armedHighlight: framehandle = BlzCreateFrameByType('FRAME', 'ReserveButtonArmedBorder', button, '', context);
			BlzFrameSetAllPoints(armedHighlight, button);
			this.buildBorderStrips(armedHighlight, context);
			BlzFrameSetVisible(armedHighlight, false);

			const countBadge: framehandle = BlzCreateFrameByType('BACKDROP', 'ReserveButtonCountBadge', button, '', context);
			BlzFrameSetSize(countBadge, COUNT_BADGE_WIDTH, COUNT_BADGE_HEIGHT);
			BlzFrameSetPoint(countBadge, FRAMEPOINT_BOTTOMRIGHT, button, FRAMEPOINT_BOTTOMRIGHT, 0, 0);
			BlzFrameSetTexture(countBadge, COUNT_BADGE_TEXTURE, 0, true);

			const countText: framehandle = BlzCreateFrameByType('TEXT', 'ReserveButtonCount', countBadge, '', context);
			BlzFrameSetAllPoints(countText, countBadge);
			BlzFrameSetScale(countText, COUNT_TEXT_SCALE);
			BlzFrameSetTextAlignment(countText, TEXT_JUSTIFY_MIDDLE, TEXT_JUSTIFY_CENTER);
			BlzFrameSetEnable(countText, false);

			const tooltipFrame: framehandle = BlzCreateFrame('EscMenuControlBackdropTemplate', gameUI, 0, context);
			const tooltipText: framehandle = BlzCreateFrameByType('TEXT', 'ReserveButtonToolTip', tooltipFrame, '', context);
			BlzFrameSetTooltip(button, tooltipFrame);
			BlzFrameSetSize(tooltipText, 0.16, 0);
			BlzFrameSetTextAlignment(tooltipText, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
			BlzFrameSetPoint(tooltipFrame, FRAMEPOINT_BOTTOMLEFT, tooltipText, FRAMEPOINT_BOTTOMLEFT, -0.012, -0.01);
			BlzFrameSetPoint(tooltipFrame, FRAMEPOINT_TOPRIGHT, tooltipText, FRAMEPOINT_TOPRIGHT, 0.012, 0.01);
			BlzFrameSetPoint(tooltipText, FRAMEPOINT_BOTTOMLEFT, button, FRAMEPOINT_TOPLEFT, 0, 0.012);
			BlzFrameSetEnable(tooltipText, false);

			const slot: ReserveSlot = { unitTypeId, button, icon, armedHighlight, countText, countBadge, tooltipText };
			this.slots.push(slot);

			const clickTrigger: trigger = CreateTrigger();
			BlzTriggerRegisterFrameEvent(clickTrigger, button, FRAMEEVENT_CONTROL_CLICK);
			TriggerAddCondition(
				clickTrigger,
				Condition(() => {
					this.onSlotClicked(slot);

					// Drop keyboard focus from the clicked button, otherwise Enter re-triggers it instead of opening chat
					if (GetTriggerPlayer() == GetLocalPlayer()) {
						BlzFrameSetEnable(button, false);
						BlzFrameSetEnable(button, true);
					}

					return false;
				})
			);

			BlzFrameSetVisible(button, false);
		}

		this.buildBudgetDisplay(gameUI);
	}

	/**
	 * The budget in the resource bar: the food icon and the current budget in the fourth slot, with a
	 * tooltip at the bottom right. It replaces the map version text, which is hidden
	 * while the budget is shown.
	 */
	private buildBudgetDisplay(gameUI: framehandle): void {
		const context: number = BUTTON_CONTEXT_OFFSET + RESERVABLE_UNIT_TYPES.length;
		const supplyText: framehandle = BlzGetFrameByName('ResourceBarSupplyText', 0);

		// The frame exists on every client (SetConsoleUI runs for everyone), so this lookup cannot desync
		this.mapInfo = BlzGetFrameByName(MAP_INFO_FRAME, 0);

		// A button without a template is invisible but still receives the mouse, which tooltips need.
		// It spans the slot from the icon to the end of the number.
		this.budgetDisplay = BlzCreateFrameByType('BUTTON', 'ReserveBudgetDisplay', gameUI, '', context);
		BlzFrameSetSize(this.budgetDisplay, BUDGET_TEXT_RIGHT - BUDGET_ICON_CENTER + BUDGET_ICON_SIZE / 2, BUDGET_ICON_SIZE);
		BlzFrameSetPoint(this.budgetDisplay, FRAMEPOINT_RIGHT, supplyText, FRAMEPOINT_RIGHT, BUDGET_TEXT_RIGHT, 0);
		BlzFrameSetLevel(this.budgetDisplay, 2);

		const icon: framehandle = BlzCreateFrameByType('BACKDROP', 'ReserveBudgetIcon', this.budgetDisplay, '', context);
		BlzFrameSetSize(icon, BUDGET_ICON_SIZE, BUDGET_ICON_SIZE);
		BlzFrameSetPoint(icon, FRAMEPOINT_CENTER, supplyText, FRAMEPOINT_RIGHT, BUDGET_ICON_CENTER, 0);
		BlzFrameSetTexture(icon, BUDGET_ICON_TEXTURE, 0, true);
		BlzFrameSetEnable(icon, false);

		// No size on purpose: the frame then shrinks to fit its text, so anchoring its right edge right-aligns
		// the number regardless of the template's text justification
		this.budgetText = BlzCreateFrameByType('TEXT', 'ReserveBudgetText', this.budgetDisplay, 'EscMenuLabelTextTemplate', context);
		BlzFrameSetPoint(this.budgetText, FRAMEPOINT_RIGHT, supplyText, FRAMEPOINT_RIGHT, BUDGET_TEXT_RIGHT, 0);
		BlzFrameSetEnable(this.budgetText, false);

		const tooltipFrame: framehandle = BlzCreateFrame('EscMenuControlBackdropTemplate', gameUI, 0, context);
		const tooltipText: framehandle = BlzCreateFrameByType('TEXT', 'ReserveBudgetToolTip', tooltipFrame, '', context);
		BlzFrameSetTooltip(this.budgetDisplay, tooltipFrame);
		BlzFrameSetSize(tooltipText, BUDGET_TOOLTIP_WIDTH, 0);
		BlzFrameSetTextAlignment(tooltipText, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
		BlzFrameSetPoint(tooltipFrame, FRAMEPOINT_TOPLEFT, tooltipText, FRAMEPOINT_TOPLEFT, -0.012, 0.01);
		BlzFrameSetPoint(tooltipFrame, FRAMEPOINT_BOTTOMRIGHT, tooltipText, FRAMEPOINT_BOTTOMRIGHT, 0.012, -0.01);
		// Grows upwards from its bottom right corner, like the native tooltips
		BlzFrameSetAbsPoint(tooltipText, FRAMEPOINT_BOTTOMRIGHT, BUDGET_TOOLTIP_X, BUDGET_TOOLTIP_Y);
		BlzFrameSetEnable(tooltipText, false);
		BlzFrameSetText(
			tooltipText,
			`${HexColors.TANGERINE}Reserve Budget|r\nUsed to deploy units from the reserves - each unit uses up its gold cost.\nGrows steadily during the match and is full (${RESERVE_BUDGET_MAX}) after ${RESERVE_BUDGET_MINUTES_TO_MAX} minutes.`
		);

		BlzFrameSetVisible(this.budgetDisplay, false);
	}

	/**
	 * Shows the local player's reserves: one button per unit type in reserve, in a left-aligned row above
	 * the console. Only touches existing frames, so the local-only branch cannot desync.
	 */
	private render(): void {
		const local: player = GetLocalPlayer();
		const armedType: number | undefined = this.pendingDeploy.get(local);
		const budget: number = Math.floor(this.getBudget(local));
		const visibleSlots: ReserveSlot[] = [];

		for (let i = 0; i < this.slots.length; i++) {
			const slot: ReserveSlot = this.slots[i];
			const count: number = this.getReservedCount(local, slot.unitTypeId);

			if (count == 0) {
				BlzFrameSetVisible(slot.button, false);
				continue;
			}

			const hotkeyLabel: string = visibleSlots.length < SLOT_HOTKEY_LABELS.length ? ` (${SLOT_HOTKEY_LABELS[visibleSlots.length]})` : '';

			visibleSlots.push(slot);

			const name: string = GetObjectName(slot.unitTypeId);
			const cost: number = this.getDeployCost(slot.unitTypeId);
			const affordable: boolean = budget >= cost;

			BlzFrameSetText(slot.countText, `${count}`);
			BlzFrameSetText(
				slot.tooltipText,
				`${HexColors.TANGERINE}Deploy ${name}${hotkeyLabel}|r\nClick once to activate, then click one of your ${RESERVABLE_SHIP_TYPES.indexOf(slot.unitTypeId) >= 0 ? 'ports' : 'cities'}.\n${affordable ? HexColors.GREEN : HexColors.RED}Cost: ${cost} budget per unit|r\nUp to ${this.getDeployLimit(slot.unitTypeId)} per deployment.`
			);

			const dimmed: boolean = !affordable || (armedType != undefined && armedType != slot.unitTypeId);
			BlzFrameSetAlpha(slot.icon, dimmed ? DIMMED_ALPHA : 255);
			BlzFrameSetVisible(slot.armedHighlight, armedType == slot.unitTypeId);
			BlzFrameSetVisible(slot.button, true);
		}

		const minimap: framehandle = BlzGetOriginFrame(ORIGIN_FRAME_MINIMAP, 0);

		for (let i = 0; i < visibleSlots.length; i++) {
			const button: framehandle = visibleSlots[i].button;

			BlzFrameClearAllPoints(button);
			BlzFrameSetPoint(
				button,
				FRAMEPOINT_BOTTOMLEFT,
				minimap,
				FRAMEPOINT_TOPRIGHT,
				BUTTON_ROW_X_FROM_MINIMAP + i * (BUTTON_SIZE + BUTTON_GAP),
				BUTTON_ROW_Y_FROM_MINIMAP
			);
		}

		// Shown to everyone playing the match, with or without units in reserve
		const isMatchPlayer: boolean = this.getMatchPlayer(local) != undefined;

		// Green once full, as a hint that the budget stopped growing
		// Like gold, seconds and turn, the number stays empty until the start countdown is over. Colored
		// explicitly: disabled text frames otherwise draw grey.
		const matchStarted: boolean = GlobalGameData.matchState == 'inProgress' || GlobalGameData.matchState == 'postMatch';

		BlzFrameSetText(this.budgetText, matchStarted ? `${budget >= RESERVE_BUDGET_MAX ? HexColors.GREEN : HexColors.WHITE}${budget}|r` : '');
		BlzFrameSetVisible(this.budgetDisplay, isMatchPlayer);
		// Observers keep seeing the map version
		BlzFrameSetVisible(this.mapInfo, !isMatchPlayer);
	}
}
