import { UNIT_ID } from 'src/configs/unit-id';
import { debugPrint } from 'src/app/utils/debug-print';

export class DummyPoolManager {
	private dummies: unit[] = [];

	constructor(private capacity: number = Infinity) {}

	push(item: unit): void {
		// debugPrint(`DummyPool: Pushing item. Current size: ${this.size()}`);
		if (this.size() === this.capacity) {
			throw Error('Stack has reached max capacity, you cannot add more items');
		}
		this.dummies.push(item);
	}

	pop(newOwner: player, x: number, y: number): unit | undefined {
		// debugPrint(`DummyPool: Popping item. Current size: ${this.size()}`);
		let item = this.dummies.pop();

		if (!item) {
			item = CreateUnit(
				newOwner, // Use the actual owner of the unit
				UNIT_ID.DUMMY_MINIMAP_INDICATOR,
				x,
				y,
				270
			) as unit;
		} else {
			SetUnitPosition(item, x, y);
			SetUnitOwner(item, newOwner, true);
		}

		return item;
	}

	peek(): unit | undefined {
		return this.dummies[this.size() - 1];
	}

	size(): number {
		return this.dummies.length;
	}
}
