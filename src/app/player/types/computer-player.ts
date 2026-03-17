import { ActivePlayer } from './active-player';
import { debugPrint } from '../../utils/debug-print';
import { DC } from 'src/configs/game-settings';
import { UNIT_ID } from 'src/configs/unit-id';
import { BotTerritoryTracker } from '../../bot/territory-tracker';
import { AdjacencyGraph } from '../../bot/adjacency-graph';
import { GlobalStats } from '../../bot/bot-types';
import { CityToCountry, StringToCountry } from '../../country/country-map';
import { City } from '../../city/city';

const BOT_MAX_TRAINS_PER_THINK = 5;

export class ComputerPlayer extends ActivePlayer {
	public readonly territory: BotTerritoryTracker = new BotTerritoryTracker();
	private currentTarget: string | null = null; // country name

	constructor(player: player) {
		super(player);
		debugPrint(`[Bot] ComputerPlayer created for slot ${GetPlayerId(player)}`, DC.bot);
	}

	public think(adjacencyGraph: AdjacencyGraph, globalStats: GlobalStats): void {
		const p = this.getPlayer();
		const cities = this.trackedData.cities.cities.length;
		const units = this.trackedData.units.size;
		const gold = GetPlayerState(p, PLAYER_STATE_RESOURCE_GOLD);

		// Update territory awareness before any decisions
		this.territory.update(this.trackedData.cities.cities, adjacencyGraph, GetPlayerId(p));

		debugPrint(`[Bot] Slot ${GetPlayerId(p)} THINK — cities=${cities}, units=${units}, gold=${gold}`, DC.bot);

		this.economyStep();
		this.selectTarget(adjacencyGraph, globalStats);
	}

	private economyStep(): void {
		const p = this.getPlayer();
		const id = GetPlayerId(p);
		let trainCount = 0;

		for (const city of this.trackedData.cities.cities) {
			if (trainCount >= BOT_MAX_TRAINS_PER_THINK) break;
			if (GetPlayerState(p, PLAYER_STATE_RESOURCE_GOLD) <= 0) break;

			const trainId = city.isPort() ? UNIT_ID.MARINE : UNIT_ID.RIFLEMEN;

			if (IssueImmediateOrderById(city.barrack.unit, trainId)) {
				trainCount++;
			}
		}

		debugPrint(
			`[Bot] Slot ${id} economy: gold=${GetPlayerState(p, PLAYER_STATE_RESOURCE_GOLD)}, trained=${trainCount}/${BOT_MAX_TRAINS_PER_THINK}`,
			DC.bot
		);
		debugPrint(`[Bot] Slot ${id} unit count: ${this.trackedData.units.size}`, DC.bot);
	}

	private selectTarget(adjacencyGraph: AdjacencyGraph, globalStats: GlobalStats): void {
		const p = this.getPlayer();
		const id = GetPlayerId(p);
		const borderCountries = this.territory.getBorderCountries();

		if (!adjacencyGraph.hasData()) {
			// Fallback: pick a random enemy neighbor from any border city
			this.selectTargetFallback(id);
			return;
		}

		let bestTarget: string | null = null;
		let bestScore = -1;
		let bestOwnerId = -1;

		for (const borderName of borderCountries) {
			const neighbors = adjacencyGraph.getNeighbors(borderName);

			for (const neighborName of neighbors) {
				// Skip if we already own this country
				if (this.territory.getOwnedCountryNames().has(neighborName)) continue;

				const neighborCountry = StringToCountry.get(neighborName);
				if (!neighborCountry) continue;

				const owner = neighborCountry.getOwner();
				if (owner === p) continue; // safety check

				let score = 100; // base score

				// Prefer weaker neighbors: targets owned by players with fewer cities
				const ownerStats = globalStats.playerStats.get(owner);
				if (ownerStats) {
					// Invert strength: weaker players get higher score bonus
					score += (1 - ownerStats.strength) * 50;

					// Penalize attacking the strongest player
					if (owner === globalStats.largestPlayer && globalStats.totalActivePlayers > 2) {
						score -= 30;
					}
				}

				// Prefer targets with fewer visible defending units
				const defenderCount = this.countVisibleDefenders(neighborCountry.getCities());
				score -= defenderCount * 10;

				// Prefer completing a country: if we own some cities in this country already
				const countryCities = neighborCountry.getCities();
				let ownedInCountry = 0;
				for (const city of countryCities) {
					if (city.getOwner() === p) ownedInCountry++;
				}
				if (ownedInCountry > 0) {
					// Bonus for partial ownership — completing the country
					score += 25 * (ownedInCountry / countryCities.length);
				}

				if (score > bestScore) {
					bestScore = score;
					bestTarget = neighborName;
					bestOwnerId = GetPlayerId(owner);
				}
			}
		}

		this.currentTarget = bestTarget;

		if (bestTarget) {
			debugPrint(`[Bot] Slot ${id} target: ${bestTarget} (score=${math.floor(bestScore)}, owner=slot ${bestOwnerId})`, DC.bot);
		} else {
			debugPrint(`[Bot] Slot ${id} target: none (no valid targets)`, DC.bot);
		}
	}

	private selectTargetFallback(slotId: number): void {
		// No adjacency data — pick an enemy city neighbor from any border city
		for (const city of this.trackedData.cities.cities) {
			const country = CityToCountry.get(city);
			if (!country) continue;

			for (const neighborCity of country.getCities()) {
				if (neighborCity.getOwner() !== this.getPlayer()) {
					const neighborCountry = CityToCountry.get(neighborCity);
					if (neighborCountry) {
						this.currentTarget = neighborCountry.getName();
						debugPrint(`[Bot] Slot ${slotId} target (fallback): ${this.currentTarget}`, DC.bot);
						return;
					}
				}
			}
		}

		this.currentTarget = null;
		debugPrint(`[Bot] Slot ${slotId} target: none (fallback, no neighbors)`, DC.bot);
	}

	private countVisibleDefenders(cities: City[]): number {
		let count = 0;
		for (const city of cities) {
			const guardUnit = city.guard.unit;
			if (IsUnitVisible(guardUnit, this.getPlayer())) {
				if (GetUnitState(guardUnit, UNIT_STATE_LIFE) > 0) {
					count++;
				}
			}
		}
		return count;
	}

	public getCurrentTarget(): string | null {
		return this.currentTarget;
	}

	onKill(victim: player, unit: unit, isPlayerCombat: boolean): void {
		if (!this.status.isAlive() && !this.status.isNomad()) return;

		const killer: player = this.getPlayer();

		if (victim == killer) {
			this.trackedData.denies++;
			return;
		}
		if (IsPlayerAlly(victim, killer)) return;

		const val: number = GetUnitPointValue(unit);
		const kdData = this.trackedData.killsDeaths;
		kdData.get(killer).killValue += val;
		kdData.get(victim).killValue += val;
		kdData.get(`${GetUnitTypeId(unit)}`).killValue += val;
		kdData.get(killer).kills++;
		kdData.get(victim).kills++;
		kdData.get(`${GetUnitTypeId(unit)}`).kills++;

		this.giveGold(val);
	}

	onDeath(killer: player, unit: unit, isPlayerCombat: boolean): void {
		this.trackedData.units.delete(unit);

		if (!this.status.isAlive() && !this.status.isNomad()) return;

		const victim: player = this.getPlayer();
		const val: number = GetUnitPointValue(unit);

		if (victim == killer) return;
		if (IsPlayerAlly(victim, killer)) return;

		const kdData = this.trackedData.killsDeaths;
		kdData.get(killer).deathValue += val;
		kdData.get(victim).deathValue += val;
		kdData.get(`${GetUnitTypeId(unit)}`).deathValue += val;
		kdData.get(killer).deaths++;
		kdData.get(victim).deaths++;
		kdData.get(`${GetUnitTypeId(unit)}`).deaths++;
	}
}
