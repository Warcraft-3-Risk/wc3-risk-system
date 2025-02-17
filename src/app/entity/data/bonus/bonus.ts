import { Resetable } from '../../../interfaces/resettable';

export interface Bonus extends Resetable {
	add(val: number): void;
	getTotal(): number;
}
