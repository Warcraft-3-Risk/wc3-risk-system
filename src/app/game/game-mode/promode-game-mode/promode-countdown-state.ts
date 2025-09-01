import { StateData } from '../state/state-data';
import { CountdownState } from '../base-game-mode/countdown-state';
import { CountdownMessage } from 'src/app/utils/messages';
import { ParticipantEntityManager } from 'src/app/utils/participant-entity';
import { VictoryManager } from 'src/app/managers/victory-manager';
import { STARTING_COUNTDOWN } from '../../../../configs/game-settings';

export class PromodeCountdownState extends CountdownState<StateData> {
	public constructor() {
		super(STARTING_COUNTDOWN);
	}

	override countdownDisplay(duration: number): void {
		const info = VictoryManager.getInstance().getPromodeInfo();
		const participantNames = `${ParticipantEntityManager.getDisplayName(ParticipantEntityManager.getParticipantByPlayer(info.leader))} ${info.leaderScore} - ${info.otherScore} ${ParticipantEntityManager.getDisplayName(ParticipantEntityManager.getParticipantByPlayer(info.other))}`;
		CountdownMessage(`${participantNames}\n\nThe Game will start in:\n${duration}`);
	}
}
