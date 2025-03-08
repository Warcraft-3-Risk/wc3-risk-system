import { CountdownMessage } from 'src/app/utils/messages';
import { PlayGlobalSound } from 'src/app/utils/utils';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';

export class CountdownState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		try {
			PlayGlobalSound('Sound\\Interface\\ArrangedTeamInvitation.flac');
			const startDelayTimer: timer = CreateTimer();
			let duration: number = 3;
			TimerStart(startDelayTimer, 1, true, () => {
				CountdownMessage(`The Game will start in:\n${duration}`);
				if (duration == 3) {
					BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), true);
				}
				if (duration <= 0) {
					PauseTimer(startDelayTimer);
					DestroyTimer(startDelayTimer);
					BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), false);
					EnableSelect(true, true);
					EnableDragSelect(true, true);
					PlayGlobalSound('Sound\\Interface\\Hint.flac');

					this.nextState(this.stateData);
				}
				duration--;
			});
		} catch (error) {
			print('Error in Metagame ' + error);
		}
	}
}
