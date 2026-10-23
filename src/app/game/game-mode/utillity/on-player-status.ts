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
import { PlayLocalSound } from 'src/app/utils/utils';
import { CHAOS_STARTING_INCOME, NOMAD_DURATION, STARTING_INCOME, STFU_DURATION } from 'src/configs/game-settings';
import { SettingsContext } from 'src/app/settings/settings-context';
import { Quests } from '../../../quests/quests';
import { keepsEconomyWhenEliminated } from 'src/app/utils/dead-player-economy';
import { TeamManager } from 'src/app/teams/team-manager';

export function onPlayerAliveHandle(player: ActivePlayer): void {
	player.status.status = PLAYER_STATUS.ALIVE;
	player.trackedData.income.income = SettingsContext.getInstance().isChaosPromode() ? CHAOS_STARTING_INCOME : STARTING_INCOME;

	if (player.trackedData.income.max == 0) {
		player.trackedData.income.max = SettingsContext.getInstance().isChaosPromode() ? CHAOS_STARTING_INCOME : STARTING_INCOME;
	}
	ScoreboardManager.getInstance().updatePartial();
}

/**
 * In team games names stay hidden while any teammate is still alive.
 * Once the whole team is eliminated, every member's btag is revealed at once.
 */
function revealTeamNamesIfEliminated(player: ActivePlayer): void {
	if (SettingsContext.getInstance().isFFA()) return;

	const team = TeamManager.getInstance().getTeamFromPlayer(player.getPlayer());

	// No team to wait for - reveal right away
	if (!team) {
		NameManager.getInstance().setName(player.getPlayer(), 'btag');
		return;
	}

	if (team.getMembers().find((member) => member.status.isActive())) return;

	team.getMembers().forEach((member) => {
		NameManager.getInstance().setName(member.getPlayer(), 'btag');
	});
}

export function onPlayerDeadHandle(player: ActivePlayer, forfeit?: boolean): void {
	if (player.status.isEliminated()) {
		return;
	}

	player.status.status = PLAYER_STATUS.DEAD;
	player.killedBy = player.trackedData.lastUnitKilledBy;
	player.setEndData(SettingsContext.getInstance().isFFA());
	revealTeamNamesIfEliminated(player);

	// In team games a dead player keeps their real income - see keepsEconomyWhenEliminated()
	if (!keepsEconomyWhenEliminated(player)) {
		player.trackedData.income.income = 1;
	}

	// Disable player controls
	if (player.getPlayer() == GetLocalPlayer()) {
		EnableSelect(false, false);
		EnableDragSelect(false, false);
	}

	// Build display name with optional rating (local player check for display customization)
	const ratingManager = RatingManager.getInstance();
	const localPlayer = GetLocalPlayer();
	const localBtag = NameManager.getInstance().getBtag(localPlayer);
	const showRatings = ratingManager.isRankedGame() && ratingManager.isRatingSystemEnabled() && ratingManager.getShowRatingPreference(localBtag);

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
			const changeSign = wasFloorProtected ? '-' : (effectiveChange >= 0 ? '+' : '');
			playerDisplayName = `${playerDisplayName} ${HexColors.TANGERINE}(${defeatedRating})|r ${changeColor}(${changeSign}${effectiveChange})|r`;
		} else {
			playerDisplayName = `${playerDisplayName} ${HexColors.TANGERINE}(${defeatedRating})|r`;
		}
	}

	if (forfeit) {
		GlobalMessage(`${playerDisplayName} has forfeited!`);
	} else if (player.killedBy) {
		GlobalMessage(`${playerDisplayName} has been defeated by ${NameManager.getInstance().getDisplayName(player.killedBy)}!`);
	} else {
		GlobalMessage(`${playerDisplayName} has been defeated!`);
	}

	// QuestFailed for the defeated player, SecretFound for everyone else
	PlayLocalSound('Sound\\Interface\\QuestFailed.flac', player.getPlayer());

	let announceSound = CreateSound('Sound\\Interface\\SecretFound.flac', false, false, true, 10, 10, '');
	if (GetLocalPlayer() === player.getPlayer()) SetSoundVolume(announceSound, 0);
	StartSound(announceSound);
	KillSoundWhenDone(announceSound);
	announceSound = undefined;

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
	player.setEndData(SettingsContext.getInstance().isFFA());
	revealTeamNamesIfEliminated(player);

	// In team games a player who left keeps their real income - see keepsEconomyWhenEliminated()
	if (!keepsEconomyWhenEliminated(player)) {
		player.trackedData.income.income = 0;
	}

	// Build display name with optional rating (local player check for display customization)
	const ratingManager = RatingManager.getInstance();
	const localPlayer = GetLocalPlayer();
	const localBtag = NameManager.getInstance().getBtag(localPlayer);
	const showRatings = ratingManager.isRankedGame() && ratingManager.isRatingSystemEnabled() && ratingManager.getShowRatingPreference(localBtag);

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
			const changeSign = wasFloorProtected ? '-' : (effectiveChange >= 0 ? '+' : '');
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
