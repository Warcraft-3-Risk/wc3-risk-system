import { GlobalGameData } from '../game/state/global-game-state';
import { TimedEventManager } from '../libs/timer/timed-event-manager';
import { PLAYER_SLOTS } from '../utils/utils';
import { Dialog, MapPlayer, Trigger } from 'w3ts';
import { PlayerManager } from '../player/player-manager';
import { EventEmitter } from '../utils/events/event-emitter';
import { EVENT_ON_PLAYER_FORFEIT, EVENT_ON_PLAYER_STFU } from '../utils/events/event-constants';

type AntiSpamData = {
	string: string;
	count: number;
};

// Map to track spam data (string and count)
const SPAM_MAP: Map<player, AntiSpamData> = new Map<player, AntiSpamData>();
// Map to track if a player has already closed the dialog
const HAS_CLOSED_DIALOG: Map<player, boolean> = new Map<player, boolean>();
const SPAM_THRESHOLD: number = 3;
const MINIMUM_MESSAGE_LENGTH: number = 21;
const SPAM_TIMER_DURATION: number = 5;

export const AntiSpam = () => {
	const showDialog = (p: player) => {
		const mapPlayer = MapPlayer.fromHandle(p);
		// Create the dialog
		const simpleDialog = new Dialog();
		// Create click trigger for first button
		const clickTriggerReopen = new Trigger();
		// Create click trigger for second button
		const clickTriggerClose = new Trigger();

		// Set the dialog title
		simpleDialog.setMessage('|c00FF0303Spam Notification|r');

		// Create the dummy button that does nothing, pressing enter will select it
		const reopenButton = simpleDialog.addButton('I will continue spamming');

		// Create the real button to close the dialog
		const stopButton = simpleDialog.addButton('I will stop spamming');

		// Show the dialog to the player
		simpleDialog.display(mapPlayer, true);

		// Set up the click event trigger for the stop button
		clickTriggerClose.registerDialogButtonEvent(stopButton);
		clickTriggerClose.addAction(() => {
			// Mark that this player has closed the dialog
			HAS_CLOSED_DIALOG.set(p, true);
			// Hide and destroy the dialog
			simpleDialog.display(mapPlayer, false);
			simpleDialog.destroy();
		});

		// Set up the click event trigger for the reopen button
		clickTriggerReopen.registerDialogButtonEvent(reopenButton);
		clickTriggerReopen.addAction(() => {
			// Reopen the dialog
			simpleDialog.display(mapPlayer, false);
			simpleDialog.display(mapPlayer, true);
		});
	};

	const t: trigger = CreateTrigger();

	for (let i = 0; i < PLAYER_SLOTS; i++) {
		TriggerRegisterPlayerChatEvent(t, Player(i), '', false);
	}

	TriggerAddCondition(
		t,
		Condition(() => {
			if (GetEventPlayerChatString().length < MINIMUM_MESSAGE_LENGTH) return false;
			if (GlobalGameData.matchState !== 'inProgress') return false;

			const player: player = GetTriggerPlayer();

			if (!SPAM_MAP.has(player)) {
				// Initialize spam data for the player
				SPAM_MAP.set(player, <AntiSpamData>{
					string: GetEventPlayerChatString(),
					count: 1,
				});

				const timedEventManager: TimedEventManager = TimedEventManager.getInstance();

				const timedEvent = timedEventManager.registerTimedEvent(SPAM_TIMER_DURATION, () => {
					if (SPAM_MAP.get(player).count >= SPAM_THRESHOLD) {
						if (HAS_CLOSED_DIALOG.get(player) === true) {
							// Player has already closed the dialog previously, we forfeit him and stfu him now
							EventEmitter.getInstance().emit(EVENT_ON_PLAYER_FORFEIT, PlayerManager.getInstance().players.get(player));
							EventEmitter.getInstance().emit(EVENT_ON_PLAYER_STFU, PlayerManager.getInstance().players.get(player));
							ClearTextMessages();
						} else {
							// Show dialog for the first time
							showDialog(player);
						}
						// Reset the spam count after action
						SPAM_MAP.delete(player);
						timedEvent.duration = -1;
					}

					if (timedEvent.duration <= 1) {
						SPAM_MAP.delete(player);
					}
				});
			} else if (GetEventPlayerChatString().includes(SPAM_MAP.get(player).string)) {
				SPAM_MAP.get(player).count++;
			}

			return false;
		})
	);
};
