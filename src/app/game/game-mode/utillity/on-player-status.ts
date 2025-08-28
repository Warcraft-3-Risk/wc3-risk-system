import { TimedEvent } from 'src/app/libs/timer/timed-event';
import { TimedEventManager } from 'src/app/libs/timer/timed-event-manager';
import { NameManager } from 'src/app/managers/names/name-manager';
import { PlayerManager } from 'src/app/player/player-manager';
import { PLAYER_STATUS } from 'src/app/player/status/status-enum';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { GlobalMessage } from 'src/app/utils/messages';
import { NOMAD_DURATION, STARTING_INCOME, STFU_DURATION } from 'src/configs/game-settings';
import { Quests } from '../../../quests/quests';

export function onPlayerAliveHandle(player: ActivePlayer): void {
	player.status.status = PLAYER_STATUS.ALIVE;
	player.trackedData.income.income = STARTING_INCOME;

	if (player.trackedData.income.max == 0) {
		player.trackedData.income.max = STARTING_INCOME;
	}
	ScoreboardManager.getInstance().updatePartial();
}

export function onPlayerDeadHandle(player: ActivePlayer): void {
	player.status.status = PLAYER_STATUS.DEAD;

	player.killedBy = player.trackedData.lastUnitKilledBy;
	player.setEndData();
	player.trackedData.income.income = 1;

	if (player.killedBy) {
		GlobalMessage(
			`${NameManager.getInstance().getDisplayName(player.getPlayer())} has been defeated by ${NameManager.getInstance().getDisplayName(player.killedBy)}!`,
			'Sound\\Interface\\SecretFound.flac'
		);
	} else {
		GlobalMessage(
			`${NameManager.getInstance().getDisplayName(player.getPlayer())} has been defeated!`,
			'Sound\\Interface\\SecretFound.flac'
		);
	}

	Quests.getInstance().UpdateShuffledPlayerListQuest();
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
	GlobalMessage(`${NameManager.getInstance().getDisplayName(player.getPlayer())} has left the game!`, 'Sound\\Interface\\SecretFound.flac');

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
		if (GetPlayerSlotState(player.getPlayer()) == PLAYER_SLOT_STATE_LEFT) {
			player.status.set(PLAYER_STATUS.LEFT);
			timedEventManager.removeTimedEvent(event);
		} else if (player.status.statusDuration <= 1) {
			SetPlayerState(player.getPlayer(), PLAYER_STATE_OBSERVER, 0);
			player.status.status = oldStatus;
			timedEventManager.removeTimedEvent(event);
		} else if (player.status.isAlive()) {
			SetPlayerState(player.getPlayer(), PLAYER_STATE_OBSERVER, 0);
			timedEventManager.removeTimedEvent(event);
		}

		player.status.statusDuration--;
	});

	ScoreboardManager.getInstance().updatePartial();
}

export function onPlayerForfeitHandle(player: ActivePlayer): void {
	const playerStatus = PlayerManager.getInstance().getPlayerStatus(player.getPlayer());
	if (playerStatus.isEliminated()) return;

	PlayerManager.getInstance().setPlayerStatus(player.getPlayer(), PLAYER_STATUS.DEAD);
	ScoreboardManager.getInstance().updatePartial();
}
