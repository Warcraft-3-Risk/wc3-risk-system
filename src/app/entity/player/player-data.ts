import { Country } from 'src/app/country/country';
import { PLAYER_SLOTS, NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { Bounty } from '../data/bonus/bounty';
import { FightBonus } from '../data/bonus/fight-bonus';
import { Cities } from '../data/cities';
import { Gold } from '../data/gold';
import { Income } from '../data/income';
import { KillsDeaths } from '../data/kills-death';
import { SingleEntityData } from '../single-entity-data';
import { EntityID } from '../entity-id';
import { Resetable } from 'src/app/interfaces/resettable';
import { TRACKED_UNITS } from 'src/app/configs/tracked-units';

export class PlayerData implements Resetable, SingleEntityData {
	private income: Income;
	private cities: Cities;
	private killsDeaths: Map<EntityID, KillsDeaths>;
	private gold: Gold;
	private bounty: Bounty;
	private bonus: FightBonus;
	private countries: Map<Country, number>;
	private units: Set<unit>;
	private turnDied: number;
	private trainedUnits: Map<number, number>;

	constructor(player: player) {
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
		this.killsDeaths = new Map<EntityID, KillsDeaths>();
		this.bounty = new Bounty();
		this.bonus = new FightBonus(player);
		this.countries = new Map<Country, number>();
		this.units = new Set<unit>();
		this.trainedUnits = new Map<number, number>();
		this.turnDied = -1;
	}

	public reset() {
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
		this.killsDeaths.clear();
		this.bounty.reset();
		this.bonus.reset();
		this.countries.clear();
		this.units.clear();
		this.trainedUnits.clear();
		this.turnDied = 0;
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

	public getKillsDeaths(): Map<EntityID, KillsDeaths> {
		return this.killsDeaths;
	}

	public getBounty(): Bounty {
		return this.bounty;
	}

	public getBonus(): FightBonus {
		return this.bonus;
	}

	public getCountries(): Map<Country, number> {
		return this.countries;
	}

	public getUnits(): Set<unit> {
		return this.units;
	}

	public getTurnDied(): number {
		return this.turnDied;
	}

	public setTurnDied(turn: number): void {
		this.turnDied = turn;
	}

	public getTrainedUnits(): Map<number, number> {
		return this.trainedUnits;
	}

	public setKDMaps() {
		for (let i = 0; i < PLAYER_SLOTS; i++) {
			const player: player = Player(i);

			if (IsPlayerObserver(player)) continue;
			if (!IsPlayerSlotState(player, PLAYER_SLOT_STATE_PLAYING)) continue;
			if (IsPlayerSlotState(player, PLAYER_SLOT_STATE_LEFT)) continue;

			this.killsDeaths.set(player, {
				killValue: 0,
				deathValue: 0,
				kills: 0,
				deaths: 0,
			});
		}

		this.killsDeaths.set(NEUTRAL_HOSTILE, {
			killValue: 0,
			deathValue: 0,
			kills: 0,
			deaths: 0,
		});

		for (const key in TRACKED_UNITS) {
			const val = TRACKED_UNITS[key];

			this.killsDeaths.set(`${val}`, {
				killValue: 0,
				deathValue: 0,
				kills: 0,
				deaths: 0,
			});

			this.trainedUnits.set(val, 0);
		}
	}
}
