import { Resetable } from 'src/app/interfaces/resettable';
import { Cities } from '../data/cities';
import { Gold } from '../data/gold';
import { Income } from '../data/income';
import { KillsDeaths } from '../data/kills-death';
import { EntityData } from '../entity-data';

export class TeamData implements Resetable, EntityData<KillsDeaths> {
	private income: Income;
	private cities: Cities;
	private gold: Gold;
	private killsDeaths: KillsDeaths;

	constructor() {
		this.income = {
			income: 0,
			max: 0,
			end: 0,
			delta: 0,
		};
		this.cities = {
			cities: [],
			max: 0,
			end: 0,
		};
		this.gold = {
			earned: 0,
			max: 0,
			end: 0,
		};
		this.killsDeaths = {
			killValue: 0,
			deathValue: 0,
			kills: 0,
			deaths: 0,
		};
	}

	public reset(): void {
		this.income.income = 0;
		this.income.max = 0;
		this.income.end = 0;
		this.income.delta = 0;
		this.gold.earned = 0;
		this.gold.max = 0;
		this.gold.end = 0;
		this.cities.cities = [];
		this.cities.max = 0;
		this.cities.end = 0;
		this.killsDeaths.killValue = 0;
		this.killsDeaths.deathValue = 0;
		this.killsDeaths.kills = 0;
		this.killsDeaths.deaths = 0;
	}

	public getIncome(): Income {
		return this.income;
	}

	public getCities(): Cities {
		return this.cities;
	}

	public getGold(): Gold {
		return this.gold;
	}

	public getKillsDeaths(): KillsDeaths {
		return this.killsDeaths;
	}
}
