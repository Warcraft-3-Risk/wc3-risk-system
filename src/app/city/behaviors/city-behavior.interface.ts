import { City } from '../city';

export interface ICityBehavior {
	isValidGuard(city: City, unit: unit): boolean;
	onUnitTrain(city: City, unit: unit): void;
	onCast(city: City): void;
}
