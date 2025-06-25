import { LocalMessage } from 'src/app/utils/messages';
import { W3CTipsService } from '../../services/w3c-tips-service';
import { GlobalGameData } from '../../state/global-game-state';
import { CountdownState } from '../base-game-mode/countdown-state';
import { W3CData } from '../mode/w3c-mode';

export class W3CTipsState extends CountdownState<W3CData> {
	onEnterState(): void {
		if (GlobalGameData.matchCount > 1) {
			const tip = W3CTipsService.getRandomTip();
			LocalMessage(GetLocalPlayer(), tip, 'Sound\\Interface\\ItemReceived.flac', 10);
		}
		this.nextState(this.stateData);
	}
}
