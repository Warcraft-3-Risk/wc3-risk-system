import { Cities } from './data/cities';
import { Gold } from './data/gold';
import { Income } from './data/income';

export interface EntityData<T> {
	getIncome(): Income;
	getCities(): Cities;
	getGold(): Gold;
	getKillsDeaths(): T;
}
