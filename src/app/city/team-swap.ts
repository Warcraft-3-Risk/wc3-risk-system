import { ABILITY_ID } from 'src/configs/ability-id';
import { UNIT_ID } from 'src/configs/unit-id';
import { SettingsContext } from '../settings/settings-context';
import { TeamManager } from '../teams/team-manager';
import { EventEmitter } from '../utils/events/event-emitter';
import { EVENT_ON_SWAP_GUARD } from '../utils/events/event-constants';
import { LocalMessage } from '../utils/messages';
import { UNIT_TYPE } from '../utils/unit-types';
import { City } from './city';
import { UnitToCity } from './city-map';

/**
 * Team swap: in Lobby Teams without shared control, players cannot use an ally's barracks, so they
 * cannot swap a guard into an allied city. Instead every unit gets the TEAM_SWAP ability, cast by
 * the unit that should become the guard, targeting the barracks of an own or allied city.
 *
 * The ability is only given to units in that mode, every other mode never sees it.
 */

const ERROR_SOUND: string = 'Sound\\Interface\\Error.flac';

function isEnabled(): boolean {
	return SettingsContext.getInstance().isSharedControlDisabled();
}

function canHaveTeamSwap(u: unit): boolean {
	if (GetPlayerId(GetOwningPlayer(u)) >= bj_MAX_PLAYERS) return false;
	if (IsUnitType(u, UNIT_TYPE_STRUCTURE)) return false;
	if (IsUnitType(u, UNIT_TYPE.TRANSPORT)) return false;

	const typeId: number = GetUnitTypeId(u);

	return typeId != UNIT_ID.DUMMY_GUARD && typeId != UNIT_ID.DUMMY_CASTER && typeId != UNIT_ID.CAMERA_LOCK_UNIT;
}

function addTeamSwap(u: unit): void {
	if (!isEnabled() || !canHaveTeamSwap(u)) return;

	if (GetUnitAbilityLevel(u, ABILITY_ID.TEAM_SWAP) == 0) UnitAddAbility(u, ABILITY_ID.TEAM_SWAP);
}

/**
 * Gives new units the ability while the mode is active. Registered once at map start.
 */
export function TeamSwapEnterMapEvent(): void {
	// Bottom right command card slot
	BlzSetAbilityPosX(ABILITY_ID.TEAM_SWAP, 3);
	BlzSetAbilityPosY(ABILITY_ID.TEAM_SWAP, 2);

	const t: trigger = CreateTrigger();
	const worldRegion: region = CreateRegion();

	RegionAddRect(worldRegion, GetWorldBounds());
	TriggerRegisterEnterRegion(t, worldRegion, null);

	TriggerAddCondition(
		t,
		Condition(() => {
			addTeamSwap(GetTriggerUnit());
			return false;
		})
	);
}

/**
 * Adds the ability to every existing unit when the mode is active, and removes it otherwise.
 * Called whenever the diplomacy setting is applied, so units from an earlier match follow the current mode.
 */
export function syncTeamSwapAbility(): void {
	const enabled: boolean = isEnabled();
	const g: group = CreateGroup();

	GroupEnumUnitsInRect(g, GetWorldBounds(), null);
	ForGroup(g, () => {
		const u: unit = GetEnumUnit();

		if (enabled) {
			addTeamSwap(u);
		} else if (GetUnitAbilityLevel(u, ABILITY_ID.TEAM_SWAP) > 0) {
			UnitRemoveAbility(u, ABILITY_ID.TEAM_SWAP);
		}
	});

	DestroyGroup(g);
}

/**
 * Handles a TEAM_SWAP cast: the casting unit becomes the guard of the targeted city.
 * A rejected cast gets its cooldown refunded.
 */
export function onTeamSwapCast(caster: unit, target: unit, triggerPlayer: player): void {
	const city: City = UnitToCity.get(target);

	if (!isValidTeamSwap(caster, target, city, triggerPlayer)) {
		BlzEndUnitAbilityCooldown(caster, ABILITY_ID.TEAM_SWAP);
		return;
	}

	// Same path as the barracks swap, so it only works while a match is running and keeps the capital rules
	EventEmitter.getInstance().emit(EVENT_ON_SWAP_GUARD, caster, city, triggerPlayer);

	if (city.guard.unit != caster) BlzEndUnitAbilityCooldown(caster, ABILITY_ID.TEAM_SWAP);
}

function isValidTeamSwap(caster: unit, target: unit, city: City | undefined, triggerPlayer: player): boolean {
	// Only the barracks counts as the city, not the guard or circle of power
	if (!city || city.barrack.unit != target) return false;
	// Already guarding this city, nothing to swap
	if (city.guard.unit == caster) return false;

	const casterOwner: player = GetOwningPlayer(caster);
	const cityOwner: player = city.getOwner();

	if (casterOwner != cityOwner) {
		const team = TeamManager.getInstance().getTeamFromPlayer(casterOwner);

		if (!team || !team.playerIsInTeam(cityOwner)) {
			LocalMessage(triggerPlayer, 'You can only swap into your own or allied cities!', ERROR_SOUND);
			return false;
		}
	}

	if (!city.isValidGuard(caster)) {
		LocalMessage(triggerPlayer, 'This unit can not guard that city!', ERROR_SOUND);
		return false;
	}

	// The city's own swap cooldown applies too, so the team swap can not bypass it
	if (BlzGetUnitAbilityCooldownRemaining(city.barrack.unit, ABILITY_ID.SWAP) > 0) {
		LocalMessage(triggerPlayer, 'That city can not swap its guard yet!', ERROR_SOUND);
		return false;
	}

	return true;
}
