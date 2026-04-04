import { TimedEvent } from 'src/app/libs/timer/timed-event';
import { TimedEventManager } from 'src/app/libs/timer/timed-event-manager';
import { NameManager } from 'src/app/managers/names/name-manager';
import { PlayerManager } from 'src/app/player/player-manager';
import { PLAYER_STATUS } from 'src/app/player/status/status-enum';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { RatingManager } from 'src/app/rating/rating-manager';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { HexColors } from 'src/app/utils/hex-colors';
import { GlobalMessage } from 'src/app/utils/messages';
import { CHAOS_STARTING_INCOME, NOMAD_DURATION, STARTING_INCOME, STFU_DURATION } from 'src/configs/game-settings';
import { SharedSlotManager } from 'src/app/game/services/shared-slot-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { TeamManager } from 'src/app/teams/team-manager';
import { UNIT_TYPE } from 'src/app/utils/unit-types';
import { Quests } from '../../../quests/quests';
import { UNIT_ID } from '../../../../configs/unit-id';
import { ABILITY_ID } from '../../../../configs/ability-id';

export function onPlayerAliveHandle(player: ActivePlayer): void {
	player.status.status = PLAYER_STATUS.ALIVE;
	player.trackedData.income.income = SettingsContext.getInstance().isChaosPromode() ? CHAOS_STARTING_INCOME : STARTING_INCOME;

	if (player.trackedData.income.max == 0) {
		player.trackedData.income.max = SettingsContext.getInstance().isChaosPromode() ? CHAOS_STARTING_INCOME : STARTING_INCOME;
	}
	ScoreboardManager.getInstance().updatePartial();
}

export function onPlayerDeadHandle(player: ActivePlayer, forfeit?: boolean): void {
	if (player.status.isEliminated()) {
		return;
	}

	player.status.status = PLAYER_STATUS.DEAD;
	player.killedBy = player.trackedData.lastUnitKilledBy;

	const isFFA = SettingsContext.getInstance().isFFA();

	// Always disable controls; only reveal name immediately in FFA
	player.setEndData(isFFA);

	// In team mode, reveal names for all members when entire team is eliminated
	if (!isFFA) {
		const team = TeamManager.getInstance().getTeamFromPlayer(player.getPlayer());
		if (team && !team.getMembers().find((m) => m.status.isActive())) {
			team.getMembers().forEach((member) => {
				NameManager.getInstance().setName(member.getPlayer(), 'obs');
			});
		}
	}

	player.trackedData.income.income = 1;

	// Build display name with optional rating (local player check for display customization)
	const ratingManager = RatingManager.getInstance();
	const localPlayer = GetLocalPlayer();
	const localBtag = NameManager.getInstance().getBtag(localPlayer);
	const showRatings =
		ratingManager.isRankedGame() && ratingManager.isRatingSystemEnabled() && ratingManager.getShowRatingPreference(localBtag);

	let playerDisplayName = NameManager.getInstance().getDisplayName(player.getPlayer());
	if (showRatings) {
		const defeatedBtag = NameManager.getInstance().getBtag(player.getPlayer());
		const defeatedRating = ratingManager.getInitialPlayerRating(defeatedBtag);
		const ratingResult = ratingManager.getRatingResults().get(defeatedBtag);

		if (ratingResult) {
			// Show initial rating + effective change (accounting for floor)
			const effectiveChange = ratingResult.newRating - ratingResult.oldRating;
			// If effective change is 0 but total change was negative, player was protected by floor
			const wasFloorProtected = effectiveChange === 0 && ratingResult.totalChange < 0;
			const changeColor = effectiveChange > 0 || (effectiveChange === 0 && !wasFloorProtected) ? HexColors.GREEN : HexColors.RED;
			const changeSign = wasFloorProtected ? '-' : effectiveChange >= 0 ? '+' : '';
			playerDisplayName = `${playerDisplayName} ${HexColors.TANGERINE}(${defeatedRating})|r ${changeColor}(${changeSign}${effectiveChange})|r`;
		} else {
			playerDisplayName = `${playerDisplayName} ${HexColors.TANGERINE}(${defeatedRating})|r`;
		}
	}

	if (forfeit) {
		GlobalMessage(`${playerDisplayName} has forfeited!`, 'Sound\\Interface\\SecretFound.flac');
	} else if (player.killedBy) {
		GlobalMessage(
			`${playerDisplayName} has been defeated by ${NameManager.getInstance().getDisplayName(player.killedBy)}!`,
			'Sound\\Interface\\SecretFound.flac'
		);
	} else {
		GlobalMessage(`${playerDisplayName} has been defeated!`, 'Sound\\Interface\\SecretFound.flac');
	}

	Quests.getInstance().updatePlayersQuest();
	ScoreboardManager.getInstance().updatePartial();
}

export function onPlayerNomadHandle(player: ActivePlayer): void {
	if (player.trackedData.units.size <= 0) {
		player.status.set(PLAYER_STATUS.DEAD);
		return;
	}

	player.status.status = PLAYER_STATUS.NOMAD;
	player.trackedData.income.income = 4;

	const tick: number = 1;
	const nomadTimer: timer = CreateTimer();
	player.status.statusDuration = NOMAD_DURATION;

	TimerStart(nomadTimer, tick, true, () => {
		if (!player.status.isAlive() && player.trackedData.cities.cities.length >= 1) {
			if (GetPlayerSlotState(player.getPlayer()) == PLAYER_SLOT_STATE_LEFT) {
				player.status.set(PLAYER_STATUS.LEFT);
			} else {
				player.status.set(PLAYER_STATUS.ALIVE);
				player.trackedData.countries.forEach((val, country) => {
					if (country.getOwner() == player.getPlayer()) {
						player.trackedData.income.income += country.getCities().length;
					}
				});
			}

			PauseTimer(nomadTimer);
			DestroyTimer(nomadTimer);
		} else if (player.trackedData.cities.cities.length <= 0 && player.trackedData.units.size <= 0) {
			if (GetPlayerSlotState(player.getPlayer()) == PLAYER_SLOT_STATE_LEFT) {
				player.status.set(PLAYER_STATUS.LEFT);
			} else {
				player.status.set(PLAYER_STATUS.DEAD);
			}

			PauseTimer(nomadTimer);
			DestroyTimer(nomadTimer);
		} else if (player.status.isNomad()) {
			player.status.statusDuration--;

			if (player.status.statusDuration <= 0 || player.trackedData.units.size <= 0) {
				player.status.set(PLAYER_STATUS.DEAD);
				PauseTimer(nomadTimer);
				DestroyTimer(nomadTimer);
			}
		}
	});

	ScoreboardManager.getInstance().updatePartial();
}

export function onPlayerLeftHandle(player: ActivePlayer): void {
	const playerStatus = PlayerManager.getInstance().getPlayerStatus(player.getPlayer());
	if (playerStatus.isLeft()) return;

	player.status.status = PLAYER_STATUS.LEFT;
	player.setEndData();
	player.trackedData.income.income = 0;

	// Build display name with optional rating (local player check for display customization)
	const ratingManager = RatingManager.getInstance();
	const localPlayer = GetLocalPlayer();
	const localBtag = NameManager.getInstance().getBtag(localPlayer);
	const showRatings =
		ratingManager.isRankedGame() && ratingManager.isRatingSystemEnabled() && ratingManager.getShowRatingPreference(localBtag);

	let playerDisplayName = NameManager.getInstance().getDisplayName(player.getPlayer());
	if (showRatings) {
		const leftBtag = NameManager.getInstance().getBtag(player.getPlayer());
		const leftRating = ratingManager.getInitialPlayerRating(leftBtag);
		const ratingResult = ratingManager.getRatingResults().get(leftBtag);

		if (ratingResult) {
			// Show initial rating + effective change (accounting for floor)
			const effectiveChange = ratingResult.newRating - ratingResult.oldRating;
			// If effective change is 0 but total change was negative, player was protected by floor
			const wasFloorProtected = effectiveChange === 0 && ratingResult.totalChange < 0;
			const changeColor = effectiveChange > 0 || (effectiveChange === 0 && !wasFloorProtected) ? HexColors.GREEN : HexColors.RED;
			const changeSign = wasFloorProtected ? '-' : effectiveChange >= 0 ? '+' : '';
			playerDisplayName = `${playerDisplayName} ${HexColors.TANGERINE}(${leftRating})|r ${changeColor}(${changeSign}${effectiveChange})|r`;
		} else {
			playerDisplayName = `${playerDisplayName} ${HexColors.TANGERINE}(${leftRating})|r`;
		}
	}

	GlobalMessage(`${playerDisplayName} has left the game!`, 'Sound\\Interface\\SecretFound.flac');

	PlayerManager.getInstance().setPlayerStatus(player.getPlayer(), PLAYER_STATUS.LEFT);
	ScoreboardManager.getInstance().updatePartial();

	if (player.status.isDead() || player.status.isSTFU()) {
		player.status.status = PLAYER_STATUS.LEFT;
		return;
	}
}

export function onPlayerSTFUHandle(player: ActivePlayer): void {
	const oldStatus = player.status.status;
	player.status.status = PLAYER_STATUS.STFU;
	SetPlayerState(player.getPlayer(), PLAYER_STATE_OBSERVER, 1);
	player.status.statusDuration = STFU_DURATION;

	const timedEventManager: TimedEventManager = TimedEventManager.getInstance();

	const event: TimedEvent = timedEventManager.registerTimedEvent(player.status.statusDuration, () => {
		// Decrement first
		player.status.statusDuration--;

		// Then check exit conditions
		if (GetPlayerSlotState(player.getPlayer()) == PLAYER_SLOT_STATE_LEFT) {
			player.status.set(PLAYER_STATUS.LEFT);
			timedEventManager.removeTimedEvent(event);
		} else if (player.status.statusDuration <= 0) {
			SetPlayerState(player.getPlayer(), PLAYER_STATE_OBSERVER, 0);
			player.status.status = oldStatus;
			player.status.statusDuration = -1;
			timedEventManager.removeTimedEvent(event);
		} else if (player.status.isAlive()) {
			SetPlayerState(player.getPlayer(), PLAYER_STATE_OBSERVER, 0);
			player.status.statusDuration = -1;
			timedEventManager.removeTimedEvent(event);
		}

		ScoreboardManager.getInstance().updatePartial();
	});

	ScoreboardManager.getInstance().updatePartial();
}

/** Maps unit type IDs to their corresponding eliminated player buff ability. */
export const ELIMINATED_BUFF_MAP: Map<number, number> = new Map([
	[UNIT_ID.ARTILLERY, ABILITY_ID.ELIMINATED_ARTILLERY],
	[UNIT_ID.BATTLESHIP_SS, ABILITY_ID.ELIMINATED_BATTLESHIP_SS],
	[UNIT_ID.GENERAL, ABILITY_ID.ELIMINATED_GENERAL],
	[UNIT_ID.ARMORED_TRANSPORT_SHIP, ABILITY_ID.ELIMINATED_ARMORED_TRANSPORT_SHIP],
	[UNIT_ID.KNIGHT, ABILITY_ID.ELIMINATED_KNIGHT],
	[UNIT_ID.MAJOR, ABILITY_ID.ELIMINATED_MAJOR],
	[UNIT_ID.MARINE, ABILITY_ID.ELIMINATED_MARINE],
	[UNIT_ID.MEDIC, ABILITY_ID.ELIMINATED_MEDIC],
	[UNIT_ID.MORTAR, ABILITY_ID.ELIMINATED_MORTAR],
	[UNIT_ID.RIFLEMEN, ABILITY_ID.ELIMINATED_RIFLEMEN],
	[UNIT_ID.ROARER, ABILITY_ID.ELIMINATED_ROARER],
	[UNIT_ID.TANK, ABILITY_ID.ELIMINATED_TANK],
	[UNIT_ID.TRANSPORT_SHIP, ABILITY_ID.ELIMINATED_TRANSPORT_SHIP],
	[UNIT_ID.WARSHIP_A, ABILITY_ID.ELIMINATED_WARSHIP_A],
	[UNIT_ID.WARSHIP_B, ABILITY_ID.ELIMINATED_WARSHIP_B],
]);

/**
 * Removes any eliminated player buff from the given unit.
 */
export function removeEliminatedBuff(u: unit): void {
	const buffAbility = ELIMINATED_BUFF_MAP.get(GetUnitTypeId(u));
	if (buffAbility && GetUnitAbilityLevel(u, buffAbility) > 0) {
		UnitRemoveAbility(u, buffAbility);
	}
}

/**
 * Returns true if the unit has an eliminated player buff applied.
 */
export function hasEliminatedBuff(u: unit): boolean {
	const buffAbility = ELIMINATED_BUFF_MAP.get(GetUnitTypeId(u));
	return buffAbility != null && GetUnitAbilityLevel(u, buffAbility) > 0;
}

/**
 * Applies the eliminated player buff to all living units that belong
 * to the given player (own slot + shared slots), after a 60-second delay.
 * Each unit type receives its own specific buff ability.
 */
export function applyEliminatedBuff(playerHandle: player): void {
	const delayTimer = CreateTimer();
	const delay = 60;

	// Snapshot the slots NOW, before redistribution can reassign them.
	// After 60s, slots may have been reassigned to active players — querying
	// getSharedSlotsByPlayer at that point would miss already-freed slots,
	// and enumerating playerHandle could hit an active player's redistributed units.
	const cm = SharedSlotManager.getInstance();
	const sharedSlots = cm.getSharedSlotsByPlayer(playerHandle);
	const snapshotSlots = [playerHandle, ...sharedSlots];

	TimerStart(delayTimer, delay, false, () => {
		for (const slot of snapshotSlots) {
			// After the 60s delay, this slot may have been reassigned to an active player
			// via evaluateAndRedistribute(). Only debuff slots whose resolved owner is
			// still the eliminated player — skip slots that now belong to an active player.
			const resolvedOwner = SharedSlotManager.getInstance().getOwner(slot);
			if (resolvedOwner !== playerHandle) continue;

			const g = CreateGroup();
			GroupEnumUnitsOfPlayer(g, slot, null);
			ForGroup(g, () => {
				const u = GetEnumUnit();
				if (IsUnitType(u, UNIT_TYPE_DEAD) || IsUnitType(u, UNIT_TYPE_STRUCTURE) || IsUnitType(u, UNIT_TYPE.GUARD)) return;

				// Remove heal ability and all active buffs before applying the debuff
				UnitRemoveAbility(u, ABILITY_ID.HEAL);
				UnitRemoveBuffs(u, true, true);

				const buffAbility = ELIMINATED_BUFF_MAP.get(GetUnitTypeId(u));
				if (buffAbility && GetUnitAbilityLevel(u, buffAbility) === 0) {
					UnitAddAbility(u, buffAbility);
				}
			});
			DestroyGroup(g);
		}
		DestroyTimer(delayTimer);
	});
}
