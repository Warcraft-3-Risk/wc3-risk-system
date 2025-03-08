import { UNIT_TYPE } from 'src/app/utils/unit-types';
import { PLAYER_SLOTS } from 'src/app/utils/utils';

export function removeUnits(): void {
	for (let i = 0; i < PLAYER_SLOTS; i++) {
		const player = Player(i);

		const group: group = CreateGroup();
		GroupEnumUnitsOfPlayer(
			group,
			player,
			Filter(() => {
				const unit: unit = GetFilterUnit();

				if (!IsUnitType(unit, UNIT_TYPE.BUILDING) && !IsUnitType(unit, UNIT_TYPE.GUARD)) {
					RemoveUnit(unit);
				}
			})
		);

		GroupClear(group);
		DestroyGroup(group);
	}
}
