import { GlobalGameData } from '../game/state/global-game-state';
import { ORDER_ID } from 'src/configs/order-id';

export const UnitTrainStartTrigger: trigger = CreateTrigger();

// This trigger is necessary to immediately cancel any unit training that starts after the match has ended, since the UnitTrainedTrigger only fires after the training is complete.
export function UnitTrainStartEvent() {
	TriggerAddCondition(
		UnitTrainStartTrigger,
		Condition(() => {
			if (GlobalGameData.matchState === 'postMatch') {
				const trainedUnit = GetTriggerUnit();
				IssueImmediateOrderById(trainedUnit, ORDER_ID.CANCEL);
			}

			return false;
		})
	);
}
