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
const BOT_MAX_ORDERS_PER_THINK = 20;
const BOT_MAX_REINFORCE_ORDERS_PER_THINK = 10;

export class ComputerPlayer extends ActivePlayer {
	public readonly territory: BotTerritoryTracker = new BotTerritoryTracker();
	private currentTarget: string | null = null; // country name
	private pendingOrders: { unit: unit; x: number; y: number }[] = [];
	private orderedThisTick: Set<unit> = new Set();

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
		this.attackStep(adjacencyGraph);
		this.reinforceStep(adjacencyGraph);
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
				// Skip if we fully own this country (all cities are ours)
				const neighborCountry = StringToCountry.get(neighborName);
				if (!neighborCountry) continue;

				const neighborCities = neighborCountry.getCities();
				let enemyCitiesInCountry = 0;
				for (const c of neighborCities) {
					if (c.getOwner() !== p) enemyCitiesInCountry++;
				}
				if (enemyCitiesInCountry === 0) continue;

				const owner = neighborCountry.getOwner();

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
					// Strong bonus for partial ownership — finishing a country is top priority
					// Scales with completion %: owning 2/3 cities = +133, 1/3 = +66
					score += 200 * (ownedInCountry / countryCities.length);
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

	private attackStep(adjacencyGraph: AdjacencyGraph): void {
		const p = this.getPlayer();
		const id = GetPlayerId(p);
		let ordersIssued = 0;
		this.orderedThisTick = new Set();

		// 1. Drain pending orders from previous tick
		while (this.pendingOrders.length > 0 && ordersIssued < BOT_MAX_ORDERS_PER_THINK) {
			const order = this.pendingOrders.shift()!;
			// Verify unit is still alive and belongs to us
			if (GetUnitState(order.unit, UNIT_STATE_LIFE) > 0 && GetOwningPlayer(order.unit) === p) {
				IssuePointOrder(order.unit, 'attack', order.x, order.y);
				this.orderedThisTick.add(order.unit);
				ordersIssued++;
			}
		}

		if (ordersIssued >= BOT_MAX_ORDERS_PER_THINK) {
			debugPrint(`[Bot] Slot ${id}: drained ${ordersIssued} pending orders, ${this.pendingOrders.length} still queued`, DC.bot);
			return;
		}

		// 2. Issue new attack orders toward current target
		if (!this.currentTarget) {
			return;
		}

		const targetCountry = StringToCountry.get(this.currentTarget);
		if (!targetCountry) return;

		// Find a destination — the first enemy-owned city in the target country
		const targetCities = targetCountry.getCities();
		let destX = 0;
		let destY = 0;
		let foundDest = false;

		for (const tc of targetCities) {
			if (tc.getOwner() !== p) {
				destX = tc.barrack.defaultX;
				destY = tc.barrack.defaultY;
				foundDest = true;
				break;
			}
		}

		if (!foundDest) return; // we own all cities in target already

		// Find idle units in border countries adjacent to the target
		// Also include bot-owned cities inside the target country itself as staging
		const borderCountries = this.territory.getBorderCountries();
		const targetNeighbors = adjacencyGraph.getNeighbors(this.currentTarget);
		const stagingCountryNames = new Set<string>();

		for (const borderName of borderCountries) {
			if (targetNeighbors.indexOf(borderName) >= 0) {
				stagingCountryNames.add(borderName);
			}
		}

		// Bot-owned cities inside the target country are also staging points
		stagingCountryNames.add(this.currentTarget);

		// Fallback: if no adjacency data, use all border countries
		if (!adjacencyGraph.hasData()) {
			for (const borderName of borderCountries) {
				stagingCountryNames.add(borderName);
			}
		}

		// Collect staging city positions for proximity checks
		const stagingCities: City[] = [];
		for (const name of stagingCountryNames) {
			const country = StringToCountry.get(name);
			if (country) {
				for (const city of country.getCities()) {
					if (city.getOwner() === p) {
						stagingCities.push(city);
					}
				}
			}
		}

		if (stagingCities.length === 0) return;

		// Find idle units near staging cities and issue attack orders
		const idleUnits = this.findIdleUnits(stagingCities);

		for (const u of idleUnits) {
			if (ordersIssued >= BOT_MAX_ORDERS_PER_THINK) {
				// Queue remaining for next tick
				this.pendingOrders.push({ unit: u, x: destX, y: destY });
			} else {
				IssuePointOrder(u, 'attack', destX, destY);
				this.orderedThisTick.add(u);
				ordersIssued++;
			}
		}

		if (ordersIssued > 0 || this.pendingOrders.length > 0) {
			debugPrint(
				`[Bot] Slot ${id}: attacking ${this.currentTarget} with ${ordersIssued} units, ${this.pendingOrders.length} orders queued`,
				DC.bot
			);
		}
	}

	private findIdleUnits(nearCities: City[]): unit[] {
		const idle: unit[] = [];
		const p = this.getPlayer();
		const PROXIMITY = 800; // distance threshold to consider a unit "near" a city

		for (const u of this.trackedData.units) {
			// Skip units already ordered this tick
			if (this.orderedThisTick.has(u)) continue;

			// Skip dead units
			if (GetUnitState(u, UNIT_STATE_LIFE) <= 0) continue;

			// Check if idle (no current order)
			if (GetUnitCurrentOrder(u) !== 0) continue;

			// Check proximity to any staging city
			const ux = GetUnitX(u);
			const uy = GetUnitY(u);

			for (const city of nearCities) {
				const dx = ux - city.barrack.defaultX;
				const dy = uy - city.barrack.defaultY;
				const distSq = dx * dx + dy * dy;

				if (distSq <= PROXIMITY * PROXIMITY) {
					idle.push(u);
					break;
				}
			}
		}

		const id = GetPlayerId(p);
		if (idle.length > 0) {
			debugPrint(`[Bot] Slot ${id}: found ${idle.length} idle units near staging cities`, DC.bot);
		}

		return idle;
	}

	private reinforceStep(adjacencyGraph: AdjacencyGraph): void {
		const p = this.getPlayer();
		const id = GetPlayerId(p);
		let ordersIssued = 0;

		const interiorCountries = this.territory.getInteriorCountries();
		if (interiorCountries.size === 0 && !this.currentTarget) return;

		// Step 7.1 — Move interior units toward the nearest border
		for (const interiorName of interiorCountries) {
			if (ordersIssued >= BOT_MAX_REINFORCE_ORDERS_PER_THINK) break;

			// Find the destination: prefer staging countries if we have a target, else nearest border
			const destCountryName = this.findReinforceDestination(interiorName, adjacencyGraph);
			if (!destCountryName) continue;

			const destCountry = StringToCountry.get(destCountryName);
			if (!destCountry) continue;

			// Find a friendly city in the destination to move toward
			let destX = 0;
			let destY = 0;
			let foundDest = false;
			for (const city of destCountry.getCities()) {
				if (city.getOwner() === p) {
					destX = city.barrack.defaultX;
					destY = city.barrack.defaultY;
					foundDest = true;
					break;
				}
			}
			if (!foundDest) {
				// Destination is a border country we own — just pick first city
				const cities = destCountry.getCities();
				if (cities.length > 0) {
					destX = cities[0].barrack.defaultX;
					destY = cities[0].barrack.defaultY;
					foundDest = true;
				}
			}
			if (!foundDest) continue;

			// Collect staging cities in the interior country to find idle units there
			const interiorCountry = StringToCountry.get(interiorName);
			if (!interiorCountry) continue;

			const interiorCities: City[] = [];
			for (const city of interiorCountry.getCities()) {
				if (city.getOwner() === p) {
					interiorCities.push(city);
				}
			}

			const idleUnits = this.findIdleUnits(interiorCities);
			for (const u of idleUnits) {
				if (ordersIssued >= BOT_MAX_REINFORCE_ORDERS_PER_THINK) break;
				IssuePointOrder(u, 'attack', destX, destY);
				this.orderedThisTick.add(u);
				ordersIssued++;
			}
		}

		// Step 7.2 — Concentrate non-staging border units toward the campaign target
		if (this.currentTarget && ordersIssued < BOT_MAX_REINFORCE_ORDERS_PER_THINK) {
			const targetNeighbors = adjacencyGraph.getNeighbors(this.currentTarget);
			const borderCountries = this.territory.getBorderCountries();
			const stagingNames = new Set<string>();

			for (const borderName of borderCountries) {
				if (targetNeighbors.indexOf(borderName) >= 0) {
					stagingNames.add(borderName);
				}
			}

			// Find a destination in a staging country
			let stagingDestX = 0;
			let stagingDestY = 0;
			let foundStaging = false;
			for (const stageName of stagingNames) {
				const stageCountry = StringToCountry.get(stageName);
				if (!stageCountry) continue;
				for (const city of stageCountry.getCities()) {
					if (city.getOwner() === p) {
						stagingDestX = city.barrack.defaultX;
						stagingDestY = city.barrack.defaultY;
						foundStaging = true;
						break;
					}
				}
				if (foundStaging) break;
			}

			if (foundStaging) {
				let concentrateCount = 0;

				for (const borderName of borderCountries) {
					if (ordersIssued >= BOT_MAX_REINFORCE_ORDERS_PER_THINK) break;
					if (stagingNames.has(borderName)) continue; // already at staging

					const borderCountry = StringToCountry.get(borderName);
					if (!borderCountry) continue;

					const borderCities: City[] = [];
					for (const city of borderCountry.getCities()) {
						if (city.getOwner() === p) {
							borderCities.push(city);
						}
					}

					const idleUnits = this.findIdleUnits(borderCities);
					for (const u of idleUnits) {
						if (ordersIssued >= BOT_MAX_REINFORCE_ORDERS_PER_THINK) break;
						IssuePointOrder(u, 'attack', stagingDestX, stagingDestY);
						this.orderedThisTick.add(u);
						ordersIssued++;
						concentrateCount++;
					}
				}

				if (concentrateCount > 0) {
					debugPrint(
						`[Bot] Slot ${id}: concentrating ${concentrateCount} units toward staging for campaign vs ${this.currentTarget}`,
						DC.bot
					);
				}
			}
		}

		if (ordersIssued > 0) {
			debugPrint(`[Bot] Slot ${id}: reinforcing border, moving ${ordersIssued} units from interior/quiet borders`, DC.bot);
		}
	}

	/**
	 * BFS through owned territory to find the best reinforce destination.
	 * Prefers staging countries (adjacent to current target) over generic borders.
	 */
	private findReinforceDestination(fromCountry: string, adjacencyGraph: AdjacencyGraph): string | null {
		if (!adjacencyGraph.hasData()) return null;

		const borderCountries = this.territory.getBorderCountries();
		const ownedNames = this.territory.getOwnedCountryNames();

		// Determine staging countries if we have a target
		const stagingNames = new Set<string>();
		if (this.currentTarget) {
			const targetNeighbors = adjacencyGraph.getNeighbors(this.currentTarget);
			for (const borderName of borderCountries) {
				if (targetNeighbors.indexOf(borderName) >= 0) {
					stagingNames.add(borderName);
				}
			}
		}

		// BFS from the interior country through owned territory
		const visited = new Set<string>();
		const queue: string[] = [fromCountry];
		visited.add(fromCountry);

		let nearestBorder: string | null = null;

		while (queue.length > 0) {
			const current = queue.shift()!;

			// If this is a staging country, return immediately (best destination)
			if (stagingNames.has(current)) return current;

			// If this is any border country, remember it as fallback
			if (borderCountries.has(current) && current !== fromCountry && !nearestBorder) {
				nearestBorder = current;
			}

			for (const neighbor of adjacencyGraph.getNeighbors(current)) {
				if (ownedNames.has(neighbor) && !visited.has(neighbor)) {
					visited.add(neighbor);
					queue.push(neighbor);
				}
			}
		}

		return nearestBorder;
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
