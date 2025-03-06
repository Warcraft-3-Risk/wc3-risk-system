import { MatchData } from '../game/state/game-state';
import { TimedEventManager } from '../libs/timer/timed-event-manager';
import { PLAYER_SLOTS } from '../utils/utils';

type AntiSpamData = {
	string: string;
	count: number;
};

const SPAM_MAP: Map<player, AntiSpamData> = new Map<player, AntiSpamData>();
const SPAM_THRESHOLD: number = 3;
const MINIMUM_MESSAGE_LENGTH: number = 21;
const SPAM_TIMER_DURATION: number = 5;

export const AntiSpam = () => {
	const t: trigger = CreateTrigger();

	for (let i = 0; i < PLAYER_SLOTS; i++) {
		TriggerRegisterPlayerChatEvent(t, Player(i), '', false);
	}

	TriggerAddCondition(
		t,
		Condition(() => {
			if (GetEventPlayerChatString().length < MINIMUM_MESSAGE_LENGTH) return false;
			if (MatchData.matchState != 'inProgress') return false;

			const player: player = GetTriggerPlayer();

			if (!SPAM_MAP.has(player)) {
				SPAM_MAP.set(player, <AntiSpamData>{
					string: GetEventPlayerChatString(),
					count: 1,
				});

				const timedEventManager: TimedEventManager = TimedEventManager.getInstance();

				const timedEvent = timedEventManager.registerTimedEvent(SPAM_TIMER_DURATION, () => {
					if (SPAM_MAP.get(player).count >= SPAM_THRESHOLD) {
						CustomVictoryBJ(player, false, false);
						ClearTextMessages();

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
