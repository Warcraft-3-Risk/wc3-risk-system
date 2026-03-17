import { BotSkillContext } from './bot-skill-context';
import { AdjacencyGraph } from '../../../bot/adjacency-graph';
import { StringToCountry } from '../../../country/country-map';
import { City } from '../../../city/city';
import { findIdleUnits } from './bot-combat';
import { debugPrint } from '../../../utils/debug-print';
import { DC } from 'src/configs/game-settings';

const BOT_MAX_REINFORCE_ORDERS_PER_THINK = 10;

export function reinforceStep(ctx: BotSkillContext, adjacencyGraph: AdjacencyGraph): void {
	const { player: p, playerId: id, territory, campaign, orderedThisTick } = ctx;
	let ordersIssued = 0;

	const interiorCountries = territory.getInteriorCountries();
	if (interiorCountries.size === 0 && !campaign.currentTarget) return;

	// Step 1 — Move interior units toward the nearest border
	for (const interiorName of interiorCountries) {
		if (ordersIssued >= BOT_MAX_REINFORCE_ORDERS_PER_THINK) break;

		const destCountryName = findReinforceDestination(ctx, interiorName, adjacencyGraph);
		if (!destCountryName) continue;

		const destCountry = StringToCountry.get(destCountryName);
		if (!destCountry) continue;

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
			const cities = destCountry.getCities();
			if (cities.length > 0) {
				destX = cities[0].barrack.defaultX;
				destY = cities[0].barrack.defaultY;
				foundDest = true;
			}
		}
		if (!foundDest) continue;

		const interiorCountry = StringToCountry.get(interiorName);
		if (!interiorCountry) continue;

		const interiorCities: City[] = [];
		for (const city of interiorCountry.getCities()) {
			if (city.getOwner() === p) {
				interiorCities.push(city);
			}
		}

		const idleUnits = findIdleUnits(ctx, interiorCities);
		for (const u of idleUnits) {
			if (ordersIssued >= BOT_MAX_REINFORCE_ORDERS_PER_THINK) break;
			IssuePointOrder(u, 'attack', destX, destY);
			orderedThisTick.add(u);
			ordersIssued++;
		}
	}

	// Step 2 — Concentrate non-staging border units toward the campaign target
	if (campaign.currentTarget && ordersIssued < BOT_MAX_REINFORCE_ORDERS_PER_THINK) {
		const targetNeighbors = adjacencyGraph.getNeighbors(campaign.currentTarget);
		const borderCountries = territory.getBorderCountries();
		const stagingNames = new Set<string>();

		for (const borderName of borderCountries) {
			if (targetNeighbors.indexOf(borderName) >= 0) {
				stagingNames.add(borderName);
			}
		}

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
				if (stagingNames.has(borderName)) continue;

				const borderCountry = StringToCountry.get(borderName);
				if (!borderCountry) continue;

				const borderCities: City[] = [];
				for (const city of borderCountry.getCities()) {
					if (city.getOwner() === p) {
						borderCities.push(city);
					}
				}

				const idleUnits = findIdleUnits(ctx, borderCities);
				for (const u of idleUnits) {
					if (ordersIssued >= BOT_MAX_REINFORCE_ORDERS_PER_THINK) break;
					IssuePointOrder(u, 'attack', stagingDestX, stagingDestY);
					orderedThisTick.add(u);
					ordersIssued++;
					concentrateCount++;
				}
			}

			if (concentrateCount > 0) {
				debugPrint(
					`[Bot] Slot ${id}: concentrating ${concentrateCount} units toward staging for campaign vs ${campaign.currentTarget}`,
					DC.bot
				);
			}
		}
	}

	if (ordersIssued > 0) {
		debugPrint(`[Bot] Slot ${id}: reinforcing border, moving ${ordersIssued} units from interior/quiet borders`, DC.bot);
	}
}

function findReinforceDestination(ctx: BotSkillContext, fromCountry: string, adjacencyGraph: AdjacencyGraph): string | null {
	if (!adjacencyGraph.hasData()) return null;

	const borderCountries = ctx.territory.getBorderCountries();
	const ownedNames = ctx.territory.getOwnedCountryNames();

	const stagingNames = new Set<string>();
	if (ctx.campaign.currentTarget) {
		const targetNeighbors = adjacencyGraph.getNeighbors(ctx.campaign.currentTarget);
		for (const borderName of borderCountries) {
			if (targetNeighbors.indexOf(borderName) >= 0) {
				stagingNames.add(borderName);
			}
		}
	}

	const visited = new Set<string>();
	const queue: string[] = [fromCountry];
	visited.add(fromCountry);

	let nearestBorder: string | null = null;

	while (queue.length > 0) {
		const current = queue.shift()!;

		if (stagingNames.has(current)) return current;

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
