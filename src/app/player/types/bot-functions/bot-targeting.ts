import { BotSkillContext, CampaignState } from './bot-skill-context';
import { AdjacencyGraph } from '../../../bot/adjacency-graph';
import { GlobalStats } from '../../../bot/bot-types';
import { CityToCountry, StringToCountry } from '../../../country/country-map';
import { City } from '../../../city/city';
import { debugPrint } from '../../../utils/debug-print';
import { DC } from 'src/configs/game-settings';

const CAMPAIGN_STALL_THRESHOLD = 10;

export function selectTarget(ctx: BotSkillContext, adjacencyGraph: AdjacencyGraph, globalStats: GlobalStats): void {
	const { playerId: id, player: p, territory, campaign } = ctx;
	const borderCountries = territory.getBorderCountries();

	if (!adjacencyGraph.hasData()) {
		selectTargetFallback(ctx);
		return;
	}

	// --- Campaign lifecycle: check if existing campaign is still valid ---
	if (campaign.currentTarget) {
		const targetCountry = StringToCountry.get(campaign.currentTarget);

		if (targetCountry) {
			const targetCities = targetCountry.getCities();
			let ownedInTarget = 0;
			for (const c of targetCities) {
				if (c.getOwner() === p) ownedInTarget++;
			}

			// Campaign complete — we own all cities in the target country
			if (ownedInTarget === targetCities.length) {
				debugPrint(`[Bot] Slot ${id}: campaign COMPLETE! ${campaign.currentTarget} fully captured`, DC.bot);
				resetCampaign(campaign);
				// Fall through to pick a new target
			} else {
				// Check progress: did we capture a new city since last think?
				if (ownedInTarget > campaign.lastOwnedInTarget) {
					debugPrint(
						`[Bot] Slot ${id}: captured city in ${campaign.currentTarget} (${ownedInTarget}/${targetCities.length}), continuing push`,
						DC.bot
					);
					campaign.campaignTicks = 0;
					campaign.consolidating = false;
				}
				campaign.lastOwnedInTarget = ownedInTarget;

				// Check if we can still reach the target
				const targetNeighbors = adjacencyGraph.getNeighbors(campaign.currentTarget);
				let canReach = false;
				for (const borderName of borderCountries) {
					if (targetNeighbors.indexOf(borderName) >= 0) {
						canReach = true;
						break;
					}
				}
				if (ownedInTarget > 0) canReach = true;

				if (!canReach) {
					debugPrint(`[Bot] Slot ${id}: campaign vs ${campaign.currentTarget} UNREACHABLE, picking new target`, DC.bot);
					resetCampaign(campaign);
				} else {
					campaign.campaignTicks++;

					if (!campaign.consolidating && campaign.campaignTicks >= math.floor(CAMPAIGN_STALL_THRESHOLD / 2)) {
						campaign.consolidating = true;
						debugPrint(
							`[Bot] Slot ${id}: campaign vs ${campaign.currentTarget} — consolidating (no progress for ${campaign.campaignTicks} ticks)`,
							DC.bot
						);
					}

					if (campaign.campaignTicks >= CAMPAIGN_STALL_THRESHOLD) {
						debugPrint(
							`[Bot] Slot ${id}: campaign vs ${campaign.currentTarget} STALLED (${campaign.campaignTicks} ticks), picking new target`,
							DC.bot
						);
						resetCampaign(campaign);
					} else {
						debugPrint(
							`[Bot] Slot ${id}: campaign vs ${campaign.currentTarget} — tick ${campaign.campaignTicks}/${CAMPAIGN_STALL_THRESHOLD}`,
							DC.bot
						);
						return;
					}
				}
			}
		} else {
			resetCampaign(campaign);
		}
	}

	// --- Pick a new target ---
	let bestTarget: string | null = null;
	let bestScore = -1;
	let bestOwnerId = -1;

	for (const borderName of borderCountries) {
		const neighbors = adjacencyGraph.getNeighbors(borderName);

		for (const neighborName of neighbors) {
			const neighborCountry = StringToCountry.get(neighborName);
			if (!neighborCountry) continue;

			const neighborCities = neighborCountry.getCities();
			let enemyCitiesInCountry = 0;
			for (const c of neighborCities) {
				if (c.getOwner() !== p) enemyCitiesInCountry++;
			}
			if (enemyCitiesInCountry === 0) continue;

			const owner = neighborCountry.getOwner();

			let score = 100;

			const ownerStats = globalStats.playerStats.get(owner);
			if (ownerStats) {
				score += (1 - ownerStats.strength) * 50;

				if (owner === globalStats.largestPlayer && globalStats.totalActivePlayers > 2) {
					score -= 30;
				}
			}

			const defenderCount = countVisibleDefenders(neighborCountry.getCities(), p);
			score -= defenderCount * 10;

			const countryCities = neighborCountry.getCities();
			let ownedInCountry = 0;
			for (const city of countryCities) {
				if (city.getOwner() === p) ownedInCountry++;
			}
			if (ownedInCountry > 0) {
				score += 200 * (ownedInCountry / countryCities.length);
			}

			if (score > bestScore) {
				bestScore = score;
				bestTarget = neighborName;
				bestOwnerId = GetPlayerId(owner);
			}
		}
	}

	startCampaign(campaign, bestTarget, p);

	if (bestTarget) {
		debugPrint(`[Bot] Slot ${id} NEW campaign: ${bestTarget} (score=${math.floor(bestScore)}, owner=slot ${bestOwnerId})`, DC.bot);
	} else {
		debugPrint(`[Bot] Slot ${id} target: none (no valid targets)`, DC.bot);
	}
}

function selectTargetFallback(ctx: BotSkillContext): void {
	const { playerId: id, player: p, cities, campaign } = ctx;

	for (const city of cities) {
		const country = CityToCountry.get(city);
		if (!country) continue;

		for (const neighborCity of country.getCities()) {
			if (neighborCity.getOwner() !== p) {
				const neighborCountry = CityToCountry.get(neighborCity);
				if (neighborCountry) {
					campaign.currentTarget = neighborCountry.getName();
					debugPrint(`[Bot] Slot ${id} target (fallback): ${campaign.currentTarget}`, DC.bot);
					return;
				}
			}
		}
	}

	campaign.currentTarget = null;
	debugPrint(`[Bot] Slot ${id} target: none (fallback, no neighbors)`, DC.bot);
}

function resetCampaign(campaign: CampaignState): void {
	campaign.currentTarget = null;
	campaign.campaignTicks = 0;
	campaign.lastOwnedInTarget = 0;
	campaign.consolidating = false;
}

function startCampaign(campaign: CampaignState, target: string | null, p: player): void {
	campaign.currentTarget = target;
	campaign.campaignTicks = 0;
	campaign.consolidating = false;

	if (target) {
		const targetCountry = StringToCountry.get(target);
		if (targetCountry) {
			let owned = 0;
			for (const c of targetCountry.getCities()) {
				if (c.getOwner() === p) owned++;
			}
			campaign.lastOwnedInTarget = owned;
		}
	} else {
		campaign.lastOwnedInTarget = 0;
	}
}

function countVisibleDefenders(cities: City[], p: player): number {
	let count = 0;
	for (const city of cities) {
		const guardUnit = city.guard.unit;
		if (IsUnitVisible(guardUnit, p)) {
			if (GetUnitState(guardUnit, UNIT_STATE_LIFE) > 0) {
				count++;
			}
		}
	}
	return count;
}
