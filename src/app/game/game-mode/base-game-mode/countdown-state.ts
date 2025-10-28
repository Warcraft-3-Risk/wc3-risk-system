import { CountdownMessage } from 'src/app/utils/messages';
import { PlayGlobalSound } from 'src/app/utils/utils';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { STARTING_COUNTDOWN } from '../../../../configs/game-settings';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { PlayerManager } from 'src/app/player/player-manager';

export class CountdownState<T extends StateData> extends BaseState<T> {
	private initialDuration: number;
	private shouldSkipToNextState: boolean = false;

	public constructor(duration: number = STARTING_COUNTDOWN) {
		super();
		this.initialDuration = duration;
	}

	onEnterState() {
		try {
			PlayGlobalSound('Sound\\Interface\\ArrangedTeamInvitation.flac');
			const startDelayTimer: timer = CreateTimer();
			let duration: number = this.initialDuration;
			BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), true);
			this.countdownDisplay(duration);
			TimerStart(startDelayTimer, 1, true, () => {
				// Check if we should skip to next state due to forfeit
				if (this.shouldSkipToNextState) {
					PauseTimer(startDelayTimer);
					DestroyTimer(startDelayTimer);
					PlayerManager.getInstance().players.forEach((player) => {
						// foreach active player, enable select and drag select if local player
						if (GetLocalPlayer() == player.getPlayer() && player.status.isActive()) {
							EnableSelect(true, true);
							EnableDragSelect(true, true);
						}
					});

					BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), false);

					PlayGlobalSound('Sound\\Interface\\Hint.flac');
					this.nextState(this.stateData);
					return;
				}

				BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), true);
				this.countdownDisplay(duration);
				if (duration <= 0) {
					PauseTimer(startDelayTimer);
					DestroyTimer(startDelayTimer);
					BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), false);
					PlayerManager.getInstance().players.forEach((player) => {
						// foreach active player, enable select and drag select if local player
						if (GetLocalPlayer() == player.getPlayer() && player.status.isActive()) {
							EnableSelect(true, true);
							EnableDragSelect(true, true);
						}
					});
					PlayGlobalSound('Sound\\Interface\\Hint.flac');

					this.nextState(this.stateData);
				}
				duration--;
			});
		} catch (error) {
			print('Error in Metagame ' + error);
		}
	}

	onPlayerForfeit(player: ActivePlayer): void {
		super.onPlayerForfeit(player);

		// Check how many human players remain after this forfeit
		const humanPlayers = PlayerManager.getInstance().getCurrentActiveHumanPlayers();

		// If only 1 or 2 human players remain, skip countdown and go to next state
		if (humanPlayers.length <= 2) {
			this.shouldSkipToNextState = true;
		}
	}

	countdownDisplay(duration: number): void {
		CountdownMessage(`The Game will start in\n${duration}`);
	}
}
