import { ARENA_ARMIES, ArenaData, getArenas } from 'src/configs/arenas';
import {
	ARENA_BOUNDARY_CHECK_INTERVAL,
	ARENA_MAX_RADIUS,
	ARENA_SESSION_MINUTES,
	ARENA_SPAWN_OFFSET,
} from 'src/configs/game-settings';
import { UNIT_GOLD_COSTS } from 'src/configs/unit-costs';
import { UNIT_ID } from 'src/configs/unit-id';
import { City } from '../city/city';
import { Country } from '../country/country';
import { StringToCountry } from '../country/country-map';
import { ActivePlayer } from '../player/types/active-player';
import { NameManager } from './names/name-manager';
import { debugPrint } from '../utils/debug-print';
import { HexColors } from '../utils/hex-colors';
import { ErrorMsg } from '../utils/messages';
import { ShuffleArray } from '../utils/utils';

/** Terrain tiles are 128x128 - the resolution of GetTerrainType and of the arena area. */
const CELL_SIZE: number = 128;
/** Cells this close to one of the country's cities or its spawner always count as arena, whatever terrain is painted there. */
const ANCHOR_RADIUS: number = 384;
/**
 * Ports stand on their own pebble ground instead of the country's terrain. Pebble ground counts as arena within this
 * distance of one of the country's ports - far enough to cover its coastal strip, but not a neighbour's harbour.
 */
const PORT_GROUND_RADIUS: number = 1500;
/** Distance around each city sampled to work out which terrain the country is painted with. */
const TERRAIN_SAMPLE_RADIUS: number = 384;
/** Spacing between units in a spawned army formation. */
const FORMATION_SPACING: number = 90;
const FORMATION_COLUMNS: number = 6;
/** Helper units a player may own that never take part in the fight. */
const NON_ARMY_UNIT_TYPES: number[] = [UNIT_ID.DUMMY_GUARD, UNIT_ID.DUMMY_CASTER, UNIT_ID.CAMERA_LOCK_UNIT, UNIT_ID.PLAYER_TOOLS];
/** Seconds between "units cannot leave the arena" messages to the same player. */
const LEAVE_WARNING_COOLDOWN: number = 3;

/** One fight of a round: two players in one arena. */
export interface ArenaMatch {
	/** Ladder position of the arena, 0 is the top arena. */
	slot: number;
	arena: ArenaData;
	country: Country;
	players: [ActivePlayer, ActivePlayer];
	/** Both players of a match get exactly this army - other matches can have a different one. */
	army: number[];
	cities: Map<player, City>;
	allowedCells: Set<number>;
	decided: boolean;
	/** Undefined after a draw. */
	winner?: ActivePlayer;
}

export interface ArenaRound {
	number: number;
	/** A deciding round after the session time ran out - only the players tied for the most wins fight. */
	decider: boolean;
	matches: ArenaMatch[];
	/** Players without a fight this round - an odd player out, more pairs than there are arenas, or everyone not in a deciding round. */
	waiting: ActivePlayer[];
}

/**
 * Runs the Arena game type.
 *
 * Players stand on a ladder of arenas (multi-arena style): each round the two players of an arena fight with
 * the same random army (each arena can get a different one), the winner moves an arena up and the loser an arena down. A player without an
 * opponent waits a round and moves up afterwards.
 *
 * The playing area is found from the map itself: every country is painted with its own terrain and
 * neighbouring countries always use a different one, so an arena is a flood fill over its country's terrain
 * starting at its cities. Units are kept inside it for the whole round.
 */
export class ArenaManager {
	private static instance: ArenaManager;
	private static roundActive: boolean = false;

	/** Player handles from the top arena down. Persists for the whole session. */
	private ladder: player[] = [];
	/** Ladder slots of the round in progress (one or two players each), used to move players afterwards. */
	private slots: ActivePlayer[][] = [];
	private regionRotation: number = -1;
	/** Index into ARENA_ARMIES each player fought with last round, so nobody gets the same army twice in a row. */
	private lastArmyIndex: Map<player, number> = new Map();
	/** Counts up from the first round - the session ends at the first round end after ARENA_SESSION_MINUTES. */
	private sessionClock: timer = undefined;
	/** Players tied for the most wins once the session time is up; set, the next round is a deciding round. */
	private deciders: player[] = undefined;
	private roundNumber: number = 0;
	private round: ArenaRound = undefined;

	private roundKillValue: Map<player, number> = new Map();
	private roundDeathValue: Map<player, number> = new Map();

	private cellsPerRow: number;
	private worldMinX: number;
	private worldMinY: number;
	private lastValidPosition: Map<unit, [number, number]> = new Map();
	private lastLeaveWarning: Map<player, number> = new Map();
	private elapsed: number = 0;
	private boundaryTimer: timer = undefined;
	private usedCities: City[] = [];

	public static getInstance(): ArenaManager {
		if (this.instance == null) {
			this.instance = new ArenaManager();
		}

		return this.instance;
	}

	private constructor() {
		const world: rect = GetWorldBounds();
		this.worldMinX = GetRectMinX(world);
		this.worldMinY = GetRectMinY(world);
		this.cellsPerRow = math.ceil((GetRectMaxX(world) - this.worldMinX) / CELL_SIZE) + 1;
		RemoveRect(world);
	}

	/** True if the current terrain has at least one arena configured. */
	public static hasArenas(): boolean {
		return getArenas().length > 0;
	}

	/** True while arena armies are on the field - from round setup until the round is over. */
	public static isRoundActive(): boolean {
		return ArenaManager.roundActive;
	}

	public getRoundNumber(): number {
		return this.roundNumber;
	}

	public getCurrentRound(): ArenaRound {
		return this.round;
	}

	/** Seconds of session time left - the full session before the first round, 0 once it has run out. */
	public getSessionSecondsLeft(): number {
		const total = ARENA_SESSION_MINUTES * 60;

		if (!this.sessionClock) return total;

		return math.max(0, total - TimerGetElapsed(this.sessionClock));
	}

	/** Session board title: the round and the session time left, e.g. "Arena - Round 4 - 11:32 left". */
	public getSessionTitle(): string {
		if (this.round && this.round.decider) return 'Arena - Deciding round';

		const secondsLeft = math.ceil(this.getSessionSecondsLeft());

		if (secondsLeft <= 0) return `Arena - Round ${this.roundNumber} - last round`;

		const minutes = math.floor(secondsLeft / 60);
		const seconds = secondsLeft % 60;

		return `Arena - Round ${this.roundNumber} - ${minutes}:${seconds < 10 ? '0' : ''}${seconds} left`;
	}

	/** Players of the coming deciding round, or undefined while the session time is still running. */
	public getDeciders(): player[] {
		return this.deciders;
	}

	public isSessionTimeUp(): boolean {
		return this.sessionClock != undefined && this.getSessionSecondsLeft() <= 0;
	}

	/** Makes the next round a deciding round between these players (tied for the most wins). */
	public setDeciders(players: ActivePlayer[]): void {
		this.deciders = players.map((p) => p.getPlayer());
	}

	public getRoundKillValue(p: player): number {
		return this.roundKillValue.get(p) || 0;
	}

	public getRoundDeathValue(p: player): number {
		return this.roundDeathValue.get(p) || 0;
	}

	/**
	 * Prepares the next round: pairs the players along the ladder, gives every fighting player their city and
	 * their match's random army, hides every other city and starts confining units to their arena.
	 */
	public startRound(players: ActivePlayer[]): ArenaRound {
		this.roundNumber++;
		this.regionRotation++;
		this.syncLadder(players);
		this.roundKillValue.clear();
		this.roundDeathValue.clear();

		if (!this.sessionClock) {
			// The session clock starts with the first round and only ever counts up
			this.sessionClock = CreateTimer();
			TimerStart(this.sessionClock, 86400, false, () => {});
		}

		const byHandle = new Map<player, ActivePlayer>();
		players.forEach((p) => byHandle.set(p.getPlayer(), p));

		// In a deciding round only the tied leaders are paired (in ladder order) - everyone else watches
		const decider = this.deciders != undefined;
		const order = decider ? this.ladder.filter((h) => this.deciders.indexOf(h) >= 0) : this.ladder;
		const waiting: ActivePlayer[] = decider ? players.filter((p) => this.deciders.indexOf(p.getPlayer()) < 0) : [];

		// Slot i holds positions 2i and 2i+1 - the last slot has one player when the count is odd
		this.slots = [];
		for (let i = 0; i < order.length; i += 2) {
			const slot = [byHandle.get(order[i])];
			if (i + 1 < order.length) slot.push(byHandle.get(order[i + 1]));
			this.slots.push(slot);
		}

		const arenas = getArenas();
		const matches: ArenaMatch[] = [];

		this.slots.forEach((slot, index) => {
			// Only as many fights as there are arenas - the lower slots wait
			if (slot.length < 2 || matches.length >= arenas.length) {
				waiting.push(...slot);
				return;
			}

			// Arenas rotate between the slots every round, so the same opponents never meet in the same country twice in a row
			const arena = arenas[(matches.length + this.regionRotation) % arenas.length];
			const match = this.setupMatch(index, arena, [slot[0], slot[1]]);

			if (match) {
				matches.push(match);
			} else {
				waiting.push(...slot);
			}
		});

		this.disableCities();

		this.round = { number: this.roundNumber, decider, matches, waiting };
		ArenaManager.roundActive = true;
		this.startBoundaryCheck();

		return this.round;
	}

	/** Credits the gold value of a killed enemy unit to the killer's owner (and the loss to the victim). */
	public onUnitKilled(killingUnit: unit, dyingUnit: unit): void {
		if (!this.round) return;

		const killer = GetOwningPlayer(killingUnit);
		const victim = GetOwningPlayer(dyingUnit);
		const match = this.getMatchOf(victim);

		if (!match || killer == victim || !match.cities.has(killer)) return;

		const value = this.getCost(GetUnitTypeId(dyingUnit));
		this.roundKillValue.set(killer, this.getRoundKillValue(killer) + value);
		this.roundDeathValue.set(victim, this.getRoundDeathValue(victim) + value);
	}

	/**
	 * Decides a match if it is over: a side without units (or that left/forfeited) loses. When time is up, or
	 * both sides are wiped out, the higher kill value wins. Both armies start the same, so equal kill values mean
	 * equal unit value left - then the higher combined HP of the remaining units wins, and equal HP is a draw.
	 * @returns true if the match is decided (now or earlier)
	 */
	public tryDecide(match: ArenaMatch, timeUp: boolean): boolean {
		if (match.decided) return true;

		const [a, b] = match.players;
		const aStanding = !a.status.isEliminated() && this.countArmy(a.getPlayer()) > 0;
		const bStanding = !b.status.isEliminated() && this.countArmy(b.getPlayer()) > 0;

		if (aStanding && bStanding && !timeUp) return false;

		if (aStanding != bStanding) {
			match.winner = aStanding ? a : b;
		} else {
			const aValue = this.getRoundKillValue(a.getPlayer());
			const bValue = this.getRoundKillValue(b.getPlayer());

			if (aValue != bValue) {
				match.winner = aValue > bValue ? a : b;
			} else {
				const aHp = this.getArmyHp(a.getPlayer());
				const bHp = this.getArmyHp(b.getPlayer());
				match.winner = aHp > bHp ? a : bHp > aHp ? b : undefined;
			}
		}

		match.decided = true;
		match.players.forEach((p) => this.freezeUnits(p.getPlayer()));

		return true;
	}

	/** Stops confining units and freezes every unit left until the reset removes them. */
	public endRound(): void {
		this.stopBoundaryCheck();
		ArenaManager.roundActive = false;

		this.round?.matches.forEach((match) => match.players.forEach((p) => this.freezeUnits(p.getPlayer())));

		this.lastValidPosition.clear();
		this.lastLeaveWarning.clear();
	}

	/**
	 * Moves players along the ladder after a round: winners go an arena up, losers an arena down, and a player
	 * who waited moves up. Draws and pairs that did not fight keep their order.
	 *
	 * With W/L the winner/loser of each slot: top = [W0, W1], slot i = [L(i-1), W(i+1)], bottom = [L(n-2), L(n-1)].
	 */
	public advanceLadder(): void {
		const winners: ActivePlayer[] = [];
		const losers: ActivePlayer[] = [];

		this.slots.forEach((slot) => {
			const match = this.round?.matches.find((m) => m.players[0] == slot[0]);

			if (match && match.winner) {
				winners.push(match.winner);
				losers.push(match.winner == slot[0] ? slot[1] : slot[0]);
			} else {
				winners.push(slot[0]);
				losers.push(slot[1]);
			}
		});

		const count = this.slots.length;
		const order: ActivePlayer[] = [];

		if (count == 1) {
			order.push(winners[0], losers[0]);
		} else {
			order.push(winners[0], winners[1]);
			for (let i = 1; i < count - 1; i++) {
				order.push(losers[i - 1], winners[i + 1]);
			}
			order.push(losers[count - 2], losers[count - 1]);
		}

		this.ladder = order.filter((p) => p != undefined).map((p) => p.getPlayer());
	}

	/** Gives the arena cities back to neutral, ready for the next round. */
	public resetCities(): void {
		// Cities stay disarmed and paused (see disableCities) - an arena session never goes back to a normal game
		this.usedCities.forEach((city) => city.reset());
		this.usedCities = [];
		this.round = undefined;
	}

	/** Ladder position (1 = top arena) of a match slot, for messages. */
	public static arenaLabel(slot: number): string {
		return `Arena ${slot + 1}`;
	}

	/** Combined current HP of a player's remaining units, in whole points so tiny rounding differences never decide. */
	private getArmyHp(p: player): number {
		let hp = 0;
		this.forEachArmyUnit(p, (u) => (hp += GetWidgetLife(u)));
		return math.floor(hp);
	}

	/** Number of living units a player still fights with. Arena cities have no guard, so this is just the army. */
	public countArmy(p: player): number {
		let count = 0;
		this.forEachArmyUnit(p, () => count++);
		return count;
	}

	/** "Name1 won against Name2", or "Name1 and Name2 drew" for a draw. */
	public describeResult(match: ArenaMatch): string {
		const names = NameManager.getInstance();

		if (!match.winner) {
			const [a, b] = match.players;
			return `${names.getDisplayName(a.getPlayer())} and ${names.getDisplayName(b.getPlayer())} drew`;
		}

		const loser = match.players.find((p) => p != match.winner);
		return `${names.getDisplayName(match.winner.getPlayer())} won against ${names.getDisplayName(loser.getPlayer())}`;
	}

	/** Victory sound for the match winner, defeat sound for the loser and for both players after a draw. */
	public static resultSound(match: ArenaMatch, player: ActivePlayer): string {
		return match.winner == player ? 'Sound\\Interface\\QuestCompleted.flac' : 'Sound\\Interface\\QuestFailed.flac';
	}

	/** Readable army list, e.g. "10 Riflemen, 1 Medic, 1 Roarer". */
	public describeArmy(army: number[]): string {
		const counts = new Map<number, number>();
		const order: number[] = [];

		army.forEach((typeId) => {
			if (!counts.has(typeId)) order.push(typeId);
			counts.set(typeId, (counts.get(typeId) || 0) + 1);
		});

		return order.map((typeId) => `${HexColors.TANGERINE}${counts.get(typeId)}|r ${GetObjectName(typeId)}`).join(', ');
	}

	public getMatchOf(p: player): ArenaMatch {
		return this.round?.matches.find((m) => m.cities.has(p));
	}

	/** Drops players that are gone and adds new ones at the bottom (in random order on the first round). */
	private syncLadder(players: ActivePlayer[]): void {
		const handles = players.map((p) => p.getPlayer());
		this.ladder = this.ladder.filter((h) => handles.indexOf(h) >= 0);

		const newcomers = handles.filter((h) => this.ladder.indexOf(h) < 0);
		ShuffleArray(newcomers);
		this.ladder.push(...newcomers);
	}

	private setupMatch(slot: number, arena: ArenaData, players: [ActivePlayer, ActivePlayer]): ArenaMatch {
		const country = StringToCountry.get(arena.country);

		if (!country) {
			print(`[Arena] Unknown arena country: ${arena.country}`);
			return undefined;
		}

		const spawnCities = this.resolveCities(country, arena);
		const allowedCells = this.computeArenaArea(country);
		// Random sides, so neither player always starts in the same corner
		const sides = [...players];
		if (GetRandomInt(0, 1) == 1) sides.reverse();

		const cities = new Map<player, City>();
		const army = this.pickArmy(players);
		const match: ArenaMatch = { slot, arena, country, players, army, cities, allowedCells, decided: false };

		sides.forEach((activePlayer, index) => {
			const city = spawnCities[index];

			cities.set(activePlayer.getPlayer(), city);
			this.giveCity(activePlayer, city);
			const cityName = arena.cities.find((name) => GetUnitName(city.barrack.unit) == name);
			const spawnDirection = cityName && arena.spawnDirections ? arena.spawnDirections[cityName] : undefined;

			this.spawnArmy(activePlayer, army, city, spawnCities[1 - index], allowedCells, spawnDirection);
		});

		return match;
	}

	/** Finds the configured spawn cities by name, falling back to the country's west-most and east-most cities. */
	private resolveCities(country: Country, arena: ArenaData): [City, City] {
		const byName = arena.cities.map((name) => country.getCities().find((city) => GetUnitName(city.barrack.unit) == name));

		if (byName[0] && byName[1] && byName[0] != byName[1]) {
			return [byName[0], byName[1]];
		}

		print(`[Arena] Could not find cities ${arena.cities.join(' and ')} in ${arena.country} - using its west-most and east-most cities`);
		const sorted = [...country.getCities()].sort((a, b) => a.barrack.defaultX - b.barrack.defaultX);

		return [sorted[0], sorted[sorted.length - 1]];
	}

	/**
	 * Picks one of the predefined ARENA_ARMIES for a match - both players get it, so the fight is fair. Armies either
	 * player had last round are avoided. Units are listed cheapest first so the most expensive end up in the back rows.
	 */
	private pickArmy(players: ActivePlayer[]): number[] {
		const recent = players.map((p) => this.lastArmyIndex.get(p.getPlayer()));
		const candidates: number[] = [];

		ARENA_ARMIES.forEach((_, i) => {
			if (recent.indexOf(i) < 0) candidates.push(i);
		});

		const index = candidates.length > 0 ? candidates[GetRandomInt(0, candidates.length - 1)] : GetRandomInt(0, ARENA_ARMIES.length - 1);

		players.forEach((p) => this.lastArmyIndex.set(p.getPlayer(), index));

		const army: number[] = [];
		ARENA_ARMIES[index].forEach((entry) => {
			for (let i = 0; i < entry.count; i++) army.push(entry.typeId);
		});
		army.sort((a, b) => this.getCost(a) - this.getCost(b));

		return army;
	}

	private getCost(typeId: number): number {
		return UNIT_GOLD_COSTS.get(typeId) || 1;
	}

	/** Hands the city to the player - it only marks their side of the arena (see disableCities). */
	private giveCity(activePlayer: ActivePlayer, city: City): void {
		city.setOwner(activePlayer.getPlayer());
		this.usedCities.push(city);
	}

	/**
	 * Only the arena cities exist during a round, and they are "dead" cities: every other city (building, circle of
	 * power and guard) and every spawner is hidden, and so are the guards and circles of power of the arena cities.
	 *
	 * Hiding alone is not enough - a hidden building can still attack - so every one of these units on the map is also
	 * disarmed and paused: no base can attack, train or swap guards. Nothing is undone, since an arena session never
	 * goes back to a normal game; this runs every round to cover the guards that city resets rebuild.
	 */
	private disableCities(): void {
		StringToCountry.forEach((country) => {
			this.disableUnit(country.getSpawn().unit);
			ShowUnit(country.getSpawn().unit, false);

			country.getCities().forEach((city) => {
				[city.barrack.unit, city.cop, city.guard.unit].forEach((u) => this.disableUnit(u));

				ShowUnit(city.barrack.unit, this.usedCities.indexOf(city) >= 0);
				ShowUnit(city.cop, false);
				ShowUnit(city.guard.unit, false);
			});
		});
	}

	private disableUnit(u: unit): void {
		BlzSetUnitWeaponBooleanField(u, UNIT_WEAPON_BF_ATTACKS_ENABLED, 0, false);
		BlzSetUnitWeaponBooleanField(u, UNIT_WEAPON_BF_ATTACKS_ENABLED, 1, false);
		IssueImmediateOrder(u, 'stop');
		PauseUnit(u, true);
	}

	/**
	 * Spawns the army in rows in front of the city, facing the enemy city. With a spawn direction (degrees) the rows
	 * are laid out on that side of the city instead, growing away from it.
	 */
	private spawnArmy(
		activePlayer: ActivePlayer,
		army: number[],
		city: City,
		enemyCity: City,
		allowedCells: Set<number>,
		spawnDirection?: number
	): void {
		const p = activePlayer.getPlayer();
		const cityX = city.barrack.defaultX;
		const cityY = city.barrack.defaultY;
		const enemyAngle = Atan2(enemyCity.barrack.defaultY - cityY, enemyCity.barrack.defaultX - cityX);
		const facing = enemyAngle * bj_RADTODEG;
		const angle = spawnDirection != undefined ? spawnDirection * bj_DEGTORAD : enemyAngle;
		// Forward points away from the city (at the enemy by default), side runs along each row
		const forwardX = Cos(angle);
		const forwardY = Sin(angle);
		const sideX = -forwardY;
		const sideY = forwardX;
		const centerX = cityX + forwardX * ARENA_SPAWN_OFFSET;
		const centerY = cityY + forwardY * ARENA_SPAWN_OFFSET;
		// Towards the enemy the back rows fill in towards the city; on a custom side they grow away from the city
		const rowDirection = spawnDirection != undefined ? 1 : -1;

		army.forEach((typeId, index) => {
			const row = math.floor(index / FORMATION_COLUMNS);
			const column = index % FORMATION_COLUMNS;
			const sideOffset = (column - (FORMATION_COLUMNS - 1) / 2) * FORMATION_SPACING;
			// The most expensive units are last in the list, so they end up in the back rows
			const backOffset = row * FORMATION_SPACING;
			let x = centerX + sideX * sideOffset + rowDirection * forwardX * backOffset;
			let y = centerY + sideY * sideOffset + rowDirection * forwardY * backOffset;

			if (!this.isInside(allowedCells, x, y)) {
				x = centerX;
				y = centerY;
			}

			const u = CreateUnit(p, typeId, x, y, facing);
			activePlayer.trackedData.units.add(u);
			this.lastValidPosition.set(u, [GetUnitX(u), GetUnitY(u)]);
		});
	}

	private getCountryCenter(country: Country): [number, number] {
		let x = 0;
		let y = 0;
		const cities = country.getCities();

		cities.forEach((city) => {
			x += city.barrack.defaultX;
			y += city.barrack.defaultY;
		});

		return [x / cities.length, y / cities.length];
	}

	/**
	 * Flood fills the country's ground outwards from its cities and spawner. That is the country's own terrain
	 * (see detectCountryTerrain), plus the pebble ground its ports stand on near those ports. Cells right next
	 * to a city or the spawner always count, since those spots can have a different decorative tile under them.
	 */
	private computeArenaArea(country: Country): Set<number> {
		const allowedCells = new Set<number>();
		const anchors: [number, number][] = country.getCities().map((city) => [city.barrack.defaultX, city.barrack.defaultY] as [number, number]);
		anchors.push([GetUnitX(country.getSpawn().unit), GetUnitY(country.getSpawn().unit)]);

		const ports: [number, number][] = country
			.getCities()
			.filter((city) => city.isPort())
			.map((city) => [city.barrack.defaultX, city.barrack.defaultY] as [number, number]);
		const portGroundTypes = ports.map(([x, y]) => GetTerrainType(x, y));

		const terrainType = this.detectCountryTerrain(country);
		const [centerX, centerY] = this.getCountryCenter(country);
		const queue: number[] = [];
		const visited = new Set<number>();

		const tryVisit = (cellX: number, cellY: number) => {
			const key = this.cellKey(cellX, cellY);
			if (visited.has(key)) return;
			visited.add(key);

			const x = this.worldMinX + cellX * CELL_SIZE;
			const y = this.worldMinY + cellY * CELL_SIZE;
			const dx = x - centerX;
			const dy = y - centerY;

			if (dx * dx + dy * dy > ARENA_MAX_RADIUS * ARENA_MAX_RADIUS) return;
			const type = GetTerrainType(x, y);
			const isPortGround = portGroundTypes.indexOf(type) >= 0 && this.isWithin(x, y, ports, PORT_GROUND_RADIUS);

			if (type != terrainType && !isPortGround && !this.isWithin(x, y, anchors, ANCHOR_RADIUS)) return;

			allowedCells.add(key);
			queue.push(cellX, cellY);
		};

		anchors.forEach(([x, y]) => tryVisit(this.toCellX(x), this.toCellY(y)));

		let head = 0;
		while (head < queue.length) {
			const cellX = queue[head];
			const cellY = queue[head + 1];
			head += 2;

			tryVisit(cellX + 1, cellY);
			tryVisit(cellX - 1, cellY);
			tryVisit(cellX, cellY + 1);
			tryVisit(cellX, cellY - 1);
		}

		debugPrint(`[Arena] ${country.getName()} arena area: ${allowedCells.size} cells`);

		return allowedCells;
	}

	/**
	 * The most common terrain type around the country's land cities and its spawner. Ports are left out - they
	 * stand on pebble ground, which would otherwise out-vote the real terrain in countries with several ports.
	 */
	private detectCountryTerrain(country: Country): number {
		const samplePoints: [number, number][] = country
			.getCities()
			.filter((city) => !city.isPort())
			.map((city) => [city.barrack.defaultX, city.barrack.defaultY] as [number, number]);
		samplePoints.push([GetUnitX(country.getSpawn().unit), GetUnitY(country.getSpawn().unit)]);

		const votes = new Map<number, number>();
		let best = 0;
		let bestVotes = 0;

		samplePoints.forEach(([x, y]) => {
			for (let i = 0; i < 8; i++) {
				const angle = (i * bj_PI) / 4;
				const type = GetTerrainType(x + Cos(angle) * TERRAIN_SAMPLE_RADIUS, y + Sin(angle) * TERRAIN_SAMPLE_RADIUS);
				const count = (votes.get(type) || 0) + 1;

				votes.set(type, count);

				if (count > bestVotes) {
					best = type;
					bestVotes = count;
				}
			}
		});

		return best;
	}

	private isWithin(x: number, y: number, points: [number, number][], radius: number): boolean {
		for (const [px, py] of points) {
			const dx = x - px;
			const dy = y - py;
			if (dx * dx + dy * dy <= radius * radius) return true;
		}

		return false;
	}

	private toCellX(x: number): number {
		return math.floor((x - this.worldMinX) / CELL_SIZE + 0.5);
	}

	private toCellY(y: number): number {
		return math.floor((y - this.worldMinY) / CELL_SIZE + 0.5);
	}

	private cellKey(cellX: number, cellY: number): number {
		return cellY * this.cellsPerRow + cellX;
	}

	private isInside(allowedCells: Set<number>, x: number, y: number): boolean {
		return allowedCells.has(this.cellKey(this.toCellX(x), this.toCellY(y)));
	}

	private startBoundaryCheck(): void {
		this.stopBoundaryCheck();
		this.elapsed = 0;
		this.boundaryTimer = CreateTimer();

		TimerStart(this.boundaryTimer, ARENA_BOUNDARY_CHECK_INTERVAL, true, () => {
			this.elapsed += ARENA_BOUNDARY_CHECK_INTERVAL;
			this.round?.matches.forEach((match) => {
				if (match.decided) return;

				match.cities.forEach((city, p) => this.forEachArmyUnit(p, (u) => this.confineUnit(u, match.allowedCells, city)));
			});
		});
	}

	private stopBoundaryCheck(): void {
		if (this.boundaryTimer) {
			PauseTimer(this.boundaryTimer);
			DestroyTimer(this.boundaryTimer);
			this.boundaryTimer = undefined;
		}
	}

	/** Remembers where a unit last stood inside its arena and puts it back there when it steps out. */
	private confineUnit(u: unit, allowedCells: Set<number>, city: City): void {
		const x = GetUnitX(u);
		const y = GetUnitY(u);

		if (this.isInside(allowedCells, x, y)) {
			this.lastValidPosition.set(u, [x, y]);
			return;
		}

		const last = this.lastValidPosition.get(u);
		const owner = GetOwningPlayer(u);

		if (last) {
			SetUnitPosition(u, last[0], last[1]);
		} else {
			SetUnitPosition(u, city.barrack.defaultX, city.barrack.defaultY);
		}

		IssueImmediateOrder(u, 'stop');

		const lastWarning = this.lastLeaveWarning.get(owner);
		if (lastWarning == undefined || this.elapsed - lastWarning >= LEAVE_WARNING_COOLDOWN) {
			this.lastLeaveWarning.set(owner, this.elapsed);
			ErrorMsg(owner, 'Units cannot leave the arena!');
		}
	}

	private freezeUnits(p: player): void {
		this.forEachArmyUnit(p, (u) => {
			IssueImmediateOrder(u, 'stop');
			PauseUnit(u, true);
		});
	}

	/** Runs the callback for every living, visible, non-structure unit of the player. */
	private forEachArmyUnit(p: player, callback: (u: unit) => void): void {
		const group: group = CreateGroup();
		GroupEnumUnitsOfPlayer(group, p, null);

		ForGroup(group, () => {
			const u = GetEnumUnit();

			if (!UnitAlive(u)) return;
			if (IsUnitHidden(u)) return;
			if (IsUnitType(u, UNIT_TYPE_STRUCTURE)) return;
			if (NON_ARMY_UNIT_TYPES.indexOf(GetUnitTypeId(u)) >= 0) return;
			if (GetUnitAbilityLevel(u, FourCC('Aloc')) > 0) return;

			callback(u);
		});

		DestroyGroup(group);
	}
}
