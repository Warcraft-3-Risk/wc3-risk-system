import { GlobalGameData } from '../game/state/global-game-state';
import { ORDER_ID } from 'src/configs/order-id';

export const UnitTrainStartTrigger: trigger = CreateTrigger();

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
