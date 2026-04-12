import { UNIT_TYPE } from 'src/app/utils/unit-types';
import { UnitLagManager } from '../../services/unit-lag-manager';
import { SharedSlotManager } from '../../services/shared-slot-manager';
import { debugPrint } from 'src/app/utils/debug-print';
import { DC, DEBUG_PRINTS } from 'src/configs/game-settings';
import { Wait } from 'src/app/utils/wait';

export async function removeUnits(batchSize = 50, intervalSeconds = 0.2): Promise<void> {
	// Fast path: skip enumeration entirely when no tracked field units exist.
	let totalUnits = 0;
	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
		totalUnits += SharedSlotManager.getInstance().getUnitCount(Player(i));
	}

	if (totalUnits === 0) {
		if (DEBUG_PRINTS.master) debugPrint('[ResetState] No tracked units — skipping removeUnits', DC.gameMode);
		return;
	}

	let removedCount = 0;

	while (true) {
		const batch: unit[] = [];

		for (let i = 0; i < bj_MAX_PLAYERS && batch.length < batchSize; i++) {
			const player = Player(i);
			if (DEBUG_PRINTS.master) debugPrint(`Scanning units for player ${GetPlayerName(player)} index ${i}`, DC.gameMode);

			const group: group = CreateGroup();
			GroupEnumUnitsOfPlayer(group, player, undefined);

			for (let unit = FirstOfGroup(group); unit !== undefined; unit = FirstOfGroup(group)) {
				GroupRemoveUnit(group, unit);
				if (!IsUnitType(unit, UNIT_TYPE.BUILDING) && !IsUnitType(unit, UNIT_TYPE.GUARD)) {
					batch.push(unit);
					if (batch.length >= batchSize) {
						break;
					}
				}
			}

			GroupClear(group);
			DestroyGroup(group);
		}

		if (batch.length === 0) {
			break;
		}

		for (const unit of batch) {
			if (unit !== undefined && GetUnitTypeId(unit) !== 0) {
				UnitLagManager.getInstance().untrackUnit(unit);
				RemoveUnit(unit);
				removedCount++;
			}
		}

		await Wait.forSeconds(intervalSeconds);
	}

	if (DEBUG_PRINTS.master) {
		debugPrint(`[ResetState] Removed ${removedCount} units in batches of ${batchSize} every ${intervalSeconds}s`, DC.gameMode);
	}
}
