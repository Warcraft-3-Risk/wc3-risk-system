import { CameraManager } from '../../camera-manager';
import { ChatManager } from '../chat-manager';

export function CamCommand(chatManager: ChatManager) {
	chatManager.addCmd(['-cam', '-zoom'], () => CameraManager.getInstance().update(GetTriggerPlayer()));
}
