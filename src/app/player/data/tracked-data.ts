import { Country } from 'src/app/country/country';
import { Cities } from './cities';
import { Gold } from './gold';
import { Income } from './income';
import { Bounty } from '../bonus/bounty';
import { FightBonus } from '../bonus/fight-bonus';
import { KillsDeaths } from './kills-death';
import { TRACKED_UNITS } from 'src/configs/tracked-units';
import { NEUTRAL_HOSTILE, PLAYER_SLOTS } from 'src/app/utils/utils';

export class TrackedData {
	private _income: Income;
	private _gold: Gold;
	private _bounty: Bounty;
	private _bonus: FightBonus;
	private _cities: Cities;
	private _countries: Map<Country, number>;
	private _killsDeaths: Map<string | player, KillsDeaths>;
	private _denies: number;
	private _lastCombat: number;

	private _lastUnitKilledBy: player;
	private _units: Set<unit>;
	private _turnDied: number;
	private _trainedUnits: Map<number, number>;

	constructor(player: player) {
		this._income = {
			income: 0,
			max: 0,
			end: 0,
			delta: 0,
		};
		this._gold = {
			earned: 0,
			max: 0,
			end: 0,
		};
		this._bounty = new Bounty();
		this._bonus = new FightBonus(player);
		this._lastCombat = 0;
		this._cities = {
			cities: [],
			max: 0,
			end: 0,
		};
		this._countries = new Map<Country, number>();
		this._killsDeaths = new Map<string | player, KillsDeaths>();
		this._denies = 0;
		this._units = new Set<unit>();
		this._trainedUnits = new Map<number, number>();
		this._turnDied = -1;
		this._lastUnitKilledBy = null;
	}

	public reset() {
		this.income.income = 0;
		this.income.max = 0;
		this.income.end = 0;
		this.income.delta = 0;
		this.gold.earned = 0;
		this.gold.max = 0;
		this.gold.end = 0;
		this.bounty.reset();
		this.bonus.reset();
		this.cities.cities = [];
		this.cities.max = 0;
		this.cities.end = 0;
		this.countries.clear();
		this.killsDeaths.clear();
		this.denies = 0;
		this.units.clear();
		this._trainedUnits.clear();
		this.turnDied = 0;
		this._lastUnitKilledBy = null;
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

			this._trainedUnits.set(val, 0);
		}
	}

	public get income(): Income {
		return this._income;
	}

	public get gold(): Gold {
		return this._gold;
	}

	public get bounty(): Bounty {
		return this._bounty;
	}

	public get bonus(): FightBonus {
		return this._bonus;
	}

	public get cities(): Cities {
		return this._cities;
	}

	public get countries(): Map<Country, number> {
		return this._countries;
	}

	public get killsDeaths(): Map<string | player, KillsDeaths> {
		return this._killsDeaths;
	}

	public get units(): Set<unit> {
		return this._units;
	}

	public get denies(): number {
		return this._denies;
	}

	public set denies(value: number) {
		this._denies = value;
	}

	public get turnDied(): number {
		return this._turnDied;
	}

	public set turnDied(value: number) {
		this._turnDied = value;
	}

	public get trainedUnits(): Map<number, number> {
		return this._trainedUnits;
	}

	public get lastUnitKilledBy(): player {
		return this._lastUnitKilledBy;
	}

	public set lastUnitKilledBy(value: player) {
		this._lastUnitKilledBy = value;
	}

	public get lastCombat(): number {
		return this._lastCombat;
	}

	public set lastCombat(lastCombat: number) {
		this._lastCombat = lastCombat;
	}
}
