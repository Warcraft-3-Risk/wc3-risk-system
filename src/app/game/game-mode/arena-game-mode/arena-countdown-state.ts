import { HexColors } from 'src/app/utils/hex-colors';
import { CountdownMessage } from 'src/app/utils/messages';
import { PlayGlobalSound } from 'src/app/utils/utils';
import { ARENA_COUNTDOWN } from 'src/configs/game-settings';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';

/**
 * Short countdown before an Arena round. Unlike CountdownState it has no ranked-game handling - arena
 * rounds are never rated.
 */
export class ArenaCountdownState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		const countdownTimer: timer = CreateTimer();
		let duration: number = ARENA_COUNTDOWN;

		PlayGlobalSound('Sound\\Interface\\ArrangedTeamInvitation.flac');
		BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), true);
		this.countdownDisplay(duration);

		TimerStart(countdownTimer, 1, true, () => {
			duration--;

			if (duration <= 0) {
				PauseTimer(countdownTimer);
				DestroyTimer(countdownTimer);
				BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), false);
				PlayGlobalSound('Sound\\Interface\\Hint.flac');
				this.nextState(this.stateData);
				return;
			}

			if (duration <= 3) {
				PlayGlobalSound('Sound\\Interface\\BattleNetTick.flac');
			}

			this.countdownDisplay(duration);
		});
	}

	private countdownDisplay(duration: number): void {
		const durationText = duration <= 3 ? `${HexColors.TANGERINE}${duration}|r` : `${duration}`;
		CountdownMessage(`Round starts in\n${durationText}`);
	}
}
