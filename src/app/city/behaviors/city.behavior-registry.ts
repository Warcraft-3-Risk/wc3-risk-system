import { ICityBehavior } from './city-behavior.interface';
import { CityType } from '../city-type';

export class CityBehaviorRegistry {
	private static behaviorMap: Map<CityType, ICityBehavior> = new Map();

	public static registerBehavior(cityType: CityType, behavior: ICityBehavior): void {
		this.behaviorMap.set(cityType, behavior);
	}

	public static getBehavior(cityType: CityType): ICityBehavior {
		const behavior = this.behaviorMap.get(cityType);

		if (!behavior) {
			print(`No behavior registered for CityType: ${cityType}`);
		}

		return behavior;
	}
}
