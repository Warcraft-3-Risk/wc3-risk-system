import { ChatManager } from '../managers/chat-manager';
import { EventEmitter } from '../utils/events/event-emitter';
import { EVENT_ON_SKIP_COUNTDOWN } from '../utils/events/event-constants';
import { ErrorMsg } from '../utils/messages';
import { isSingleplayer } from '../utils/singleplayer';

/**
 * Testing command that skips the starting countdown.
 * Only available in single-player games (same rule as the -g sandbox gold).
 */
export function SkipCommand(chatManager: ChatManager) {
	chatManager.addCmd(['-skip'], () => {
		if (!isSingleplayer()) {
			ErrorMsg(GetTriggerPlayer(), '-skip is only available in single-player games.');
			return;
		}

		EventEmitter.getInstance().emit(EVENT_ON_SKIP_COUNTDOWN);
	});
}
