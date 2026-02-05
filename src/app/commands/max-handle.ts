import { ChatManager } from '../managers/chat-manager';

export function MaxHandleCommand(chatManager: ChatManager) {
	chatManager.addCmd(['-maxhandle'], () => {
		const loc = Location(0, 0);
		const watermark = GetHandleId(loc) - 0x100000;
		RemoveLocation(loc);

		DisplayTimedTextToPlayer(GetTriggerPlayer(), 0, 0, 60, `Current handle ID watermark (max): ${watermark}`);
	});
}
