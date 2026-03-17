import { BotSkillContext } from './bot-skill-context';
import { AdjacencyGraph } from '../../../bot/adjacency-graph';
import { StringToCountry } from '../../../country/country-map';
import { City } from '../../../city/city';
import { debugPrint } from '../../../utils/debug-print';
import { DC } from 'src/configs/game-settings';

const BOT_MAX_ORDERS_PER_THINK = 20;
const PROXIMITY = 800;

export function attackStep(ctx: BotSkillContext, adjacencyGraph: AdjacencyGraph): void {
	const { player: p, playerId: id, campaign, pendingOrders, orderedThisTick, territory } = ctx;
	let ordersIssued = 0;

	// 1. Drain pending orders from previous tick
	while (pendingOrders.length > 0 && ordersIssued < BOT_MAX_ORDERS_PER_THINK) {
		const order = pendingOrders.shift()!;
		if (GetUnitState(order.unit, UNIT_STATE_LIFE) > 0 && GetOwningPlayer(order.unit) === p) {
			IssuePointOrder(order.unit, 'attack', order.x, order.y);
			orderedThisTick.add(order.unit);
			ordersIssued++;
		}
	}

	if (ordersIssued >= BOT_MAX_ORDERS_PER_THINK) {
		debugPrint(`[Bot] Slot ${id}: drained ${ordersIssued} pending orders, ${pendingOrders.length} still queued`, DC.bot);
		return;
	}

	// 2. Issue new attack orders toward current target
	if (!campaign.currentTarget) return;

	if (campaign.consolidating) {
		debugPrint(`[Bot] Slot ${id}: consolidating (rebuilding forces), skipping new attack orders`, DC.bot);
		return;
	}

	const targetCountry = StringToCountry.get(campaign.currentTarget);
	if (!targetCountry) return;

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

	if (!foundDest) return;

	// Find idle units in border countries adjacent to the target
	const borderCountries = territory.getBorderCountries();
	const targetNeighbors = adjacencyGraph.getNeighbors(campaign.currentTarget);
	const stagingCountryNames = new Set<string>();

	for (const borderName of borderCountries) {
		if (targetNeighbors.indexOf(borderName) >= 0) {
			stagingCountryNames.add(borderName);
		}
	}

	stagingCountryNames.add(campaign.currentTarget);

	if (!adjacencyGraph.hasData()) {
		for (const borderName of borderCountries) {
			stagingCountryNames.add(borderName);
		}
	}

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

	const idleUnits = findIdleUnits(ctx, stagingCities);

	for (const u of idleUnits) {
		if (ordersIssued >= BOT_MAX_ORDERS_PER_THINK) {
			pendingOrders.push({ unit: u, x: destX, y: destY });
		} else {
			IssuePointOrder(u, 'attack', destX, destY);
			orderedThisTick.add(u);
			ordersIssued++;
		}
	}

	if (ordersIssued > 0 || pendingOrders.length > 0) {
		debugPrint(
			`[Bot] Slot ${id}: attacking ${campaign.currentTarget} with ${ordersIssued} units, ${pendingOrders.length} orders queued`,
			DC.bot
		);
	}
}

export function findIdleUnits(ctx: BotSkillContext, nearCities: City[]): unit[] {
	const idle: unit[] = [];
	const { player: p, playerId: id, units, orderedThisTick } = ctx;

	for (const u of units) {
		if (orderedThisTick.has(u)) continue;
		if (GetUnitState(u, UNIT_STATE_LIFE) <= 0) continue;
		if (GetUnitCurrentOrder(u) !== 0) continue;

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

	if (idle.length > 0) {
		debugPrint(`[Bot] Slot ${id}: found ${idle.length} idle units near staging cities`, DC.bot);
	}

	return idle;
}
