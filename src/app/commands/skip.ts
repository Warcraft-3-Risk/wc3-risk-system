import { ChatManager } from '../managers/chat-manager';
import { EventEmitter } from '../utils/events/event-emitter';
import { EVENT_ON_SKIP_COUNTDOWN } from '../utils/events/event-constants';
import { isSingleplayer } from '../utils/singleplayer';

/**
 * Testing command that skips the starting countdown.
 * Only available in single-player games (same rule as the -g sandbox gold).
 */
export function SkipCommand(chatManager: ChatManager) {
	chatManager.addCmd(['-skip'], () => {
		// Silently ignored in real games so the testing command is not advertised
		if (!isSingleplayer()) return;

		EventEmitter.getInstance().emit(EVENT_ON_SKIP_COUNTDOWN);
	});
}
