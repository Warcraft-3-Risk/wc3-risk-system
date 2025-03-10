import { ChatManager } from '../chat/chat-manager';
import { CameraManager } from '../libs/camera-manager';

export function CamCommand(chatManager: ChatManager) {
	chatManager.addCmd(['-cam', '-zoom'], () => CameraManager.getInstance().update(GetTriggerPlayer()));
}
