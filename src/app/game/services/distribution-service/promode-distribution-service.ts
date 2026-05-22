import { City } from 'src/app/city/city';
import { CityToCountry } from 'src/app/country/country-map';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { Wait } from 'src/app/utils/wait';
import { RegionToCity } from 'src/app/city/city-map';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { TeamManager } from 'src/app/teams/team-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { debugPrint } from 'src/app/utils/debug-print';
import { DC, DEBUG_PRINTS } from 'src/configs/game-settings';
import { SharedSlotManager } from '../shared-slot-manager';
import { StandardDistributionService } from './standard-distribution-service';
import {
	distributeEvenlyWithCaps,
	normalizeQualityTier,
	QualityTier,
	scaleTopTierCap,
	TOP_QUALITY_TIERS,
	QUALITY_TIERS,
} from './distribution-logic';

type TierCounts = Record<QualityTier, number>;

interface FallbackCounters {
	topTierMisses: number;
	preferredTierMisses: number;
	unrestrictedMisses: number;
}

/**
 * Promode-only distribution service that uses city quality tiers when available.
 * Falls back to standard distribution on maps without quality metadata.
 */
export class PromodeDistributionService extends StandardDistributionService {
	private static readonly BASELINE_CITIES_PER_PLAYER = 22;
	private static readonly BASE_TOP_TIER_CAP = 4;

	protected async distribute() {
		const players = this.getPlayerList();
		const maxCitiesPerPlayer = this.getMaxCitiesPerPlayer();

		if (players.length === 0 || maxCitiesPerPlayer <= 0) {
			await super.distribute();
			return;
		}

		const cities = [...this.getCities()];
		const hasSupportedQuality = cities.some((city) => normalizeQualityTier(city.quality) !== undefined);
		if (!hasSupportedQuality) {
			await super.distribute();
			return;
		}

		const topTierCap = scaleTopTierCap(
			PromodeDistributionService.BASE_TOP_TIER_CAP,
			maxCitiesPerPlayer,
			PromodeDistributionService.BASELINE_CITIES_PER_PLAYER
		);

		const allocations = new Map<ActivePlayer, City[]>();
		const playerTierCounts = new Map<ActivePlayer, TierCounts>();
		for (const player of players) {
			allocations.set(player, []);
			playerTierCounts.set(player, this.createTierCounts());
		}

		const remainingCities = [...cities];
		const fallbackCounters: FallbackCounters = {
			topTierMisses: 0,
			preferredTierMisses: 0,
			unrestrictedMisses: 0,
		};

		const teams = this.buildTeams(players);
		const playerTopTierTargets = this.buildTopTierTargets(teams, remainingCities, topTierCap);

		for (const tier of TOP_QUALITY_TIERS) {
			let madeProgress = true;
			while (madeProgress) {
				madeProgress = false;
				for (const player of players) {
					const target = playerTopTierTargets.get(player)[tier];
					const current = playerTierCounts.get(player)[tier];
					if (current >= target) continue;

					const city = this.takeValidCity(remainingCities, player, (candidateTier) => candidateTier === tier, playerTierCounts, topTierCap);
					if (!city) {
						fallbackCounters.topTierMisses++;
						continue;
					}

					this.fakeAllocateCity(player, city, allocations, playerTierCounts);
					madeProgress = true;
				}
			}
		}

		const preferredLowerTiers: QualityTier[] = ['D', 'E', 'F'];
		let fillProgress = true;
		while (fillProgress) {
			fillProgress = false;

			for (const player of players) {
				if (allocations.get(player).length >= maxCitiesPerPlayer) continue;

				let city = this.takeValidCity(
					remainingCities,
					player,
					(tier) => tier !== undefined && preferredLowerTiers.includes(tier),
					playerTierCounts,
					topTierCap
				);

				if (!city) {
					fallbackCounters.preferredTierMisses++;
					city = this.takeValidCity(remainingCities, player, () => true, playerTierCounts, topTierCap);
				}

				if (!city) {
					fallbackCounters.unrestrictedMisses++;
					continue;
				}

				this.fakeAllocateCity(player, city, allocations, playerTierCounts);
				fillProgress = true;
			}
		}

		for (const player of players) {
			player.trackedData.cities.cities.length = 0;
			player.trackedData.countries.clear();
		}

		await this.applyAllocations(allocations);
		await this.processNeutralCities();
		this.logDistributionSummary(players, teams, allocations, playerTierCounts, fallbackCounters);
	}

	private buildTeams(players: ActivePlayer[]): ActivePlayer[][] {
		if (!SettingsContext.getInstance().isTeamMatch()) {
			return players.map((player) => [player]);
		}

		const teams = TeamManager.getInstance()
			.getTeams()
			.map((team) => team.getMembers().filter((member) => players.includes(member)))
			.filter((members) => members.length > 0);

		if (teams.length === 0) {
			return players.map((player) => [player]);
		}

		return teams;
	}

	private buildTopTierTargets(teams: ActivePlayer[][], remainingCities: City[], topTierCap: number): Map<ActivePlayer, TierCounts> {
		const targets = new Map<ActivePlayer, TierCounts>();
		for (const team of teams) {
			for (const player of team) {
				targets.set(player, this.createTierCounts());
			}
		}

		for (const tier of TOP_QUALITY_TIERS) {
			const available = remainingCities.filter((city) => normalizeQualityTier(city.quality) === tier).length;
			const teamCaps = teams.map((team) => team.length * topTierCap);
			const teamBudgets = distributeEvenlyWithCaps(Math.min(available, teamCaps.reduce((sum, cap) => sum + cap, 0)), teamCaps);

			for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
				const team = teams[teamIndex];
				const playerCaps = team.map(() => topTierCap);
				const playerBudgets = distributeEvenlyWithCaps(teamBudgets[teamIndex], playerCaps);

				for (let i = 0; i < team.length; i++) {
					targets.get(team[i])[tier] = playerBudgets[i];
				}
			}
		}

		return targets;
	}

	private takeValidCity(
		remainingCities: City[],
		player: ActivePlayer,
		tierPredicate: (tier: QualityTier | undefined) => boolean,
		playerTierCounts: Map<ActivePlayer, TierCounts>,
		topTierCap: number
	): City | undefined {
		const matchingIndices: number[] = [];
		const counts = playerTierCounts.get(player);

		for (let index = 0; index < remainingCities.length; index++) {
			const city = remainingCities[index];
			const tier = normalizeQualityTier(city.quality);
			if (!tierPredicate(tier)) continue;

			if (tier && TOP_QUALITY_TIERS.includes(tier) && counts[tier] >= topTierCap) {
				continue;
			}

			const country = CityToCountry.get(city);
			if (!this.isCityValidForPlayer(player, country)) {
				continue;
			}

			matchingIndices.push(index);
		}

		if (matchingIndices.length === 0) {
			return undefined;
		}

		const randomMatchIndex = matchingIndices[Math.floor(Math.random() * matchingIndices.length)];
		const [selected] = remainingCities.splice(randomMatchIndex, 1);
		return selected;
	}

	private fakeAllocateCity(
		player: ActivePlayer,
		city: City,
		allocations: Map<ActivePlayer, City[]>,
		playerTierCounts: Map<ActivePlayer, TierCounts>
	): void {
		allocations.get(player).push(city);
		const tier = normalizeQualityTier(city.quality);
		if (tier) {
			playerTierCounts.get(player)[tier]++;
		}

		const country = CityToCountry.get(city);
		if (!player.trackedData.countries.has(country)) {
			player.trackedData.countries.set(country, 0);
		}
		player.trackedData.countries.set(country, player.trackedData.countries.get(country) + 1);
		player.trackedData.cities.cities.push(city);
	}

	private async applyAllocations(allocations: Map<ActivePlayer, City[]>): Promise<void> {
		const players = Array.from(allocations.keys());
		const queue: { player: ActivePlayer; city: City }[] = [];

		let hasMore = true;
		while (hasMore) {
			hasMore = false;
			for (const player of players) {
				const city = allocations.get(player).pop();
				if (!city) continue;
				queue.push({ player, city });
				hasMore = true;
			}
		}

		let batchCount = 0;
		for (const assignment of queue) {
			this.changeCityOwner(assignment.city, assignment.player);
			batchCount++;
			if (batchCount >= 3) {
				batchCount = 0;
				await Wait.forSeconds(0.2);
			}
		}
	}

	private async processNeutralCities(): Promise<void> {
		let neutralProcessed = 0;
		for (const [_, city] of RegionToCity) {
			if (SharedSlotManager.getInstance().getOwnerOfUnit(city.guard.unit) === NEUTRAL_HOSTILE) {
				city.guard.reposition();
				IssueImmediateOrder(city.guard.unit, 'stop');
				SetUnitInvulnerable(city.guard.unit, false);

				neutralProcessed++;
				if (neutralProcessed % 10 === 0) {
					await Wait.forSeconds(0.1);
				}
			}
		}
	}

	private logDistributionSummary(
		players: ActivePlayer[],
		teams: ActivePlayer[][],
		allocations: Map<ActivePlayer, City[]>,
		playerTierCounts: Map<ActivePlayer, TierCounts>,
		fallbackCounters: FallbackCounters
	): void {
		if (!DEBUG_PRINTS.master) return;

		for (const player of players) {
			const counts = playerTierCounts.get(player);
			const total = QUALITY_TIERS.reduce((sum, tier) => sum + counts[tier], 0);
			debugPrint(
				`[Distribution][Quality] Player ${GetPlayerId(player.getPlayer())}: total=${total} S=${counts.S} A=${counts.A} B=${counts.B} C=${counts.C} D=${counts.D} E=${counts.E} F=${counts.F}`,
				DC.distribution
			);
		}

		for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
			const teamTotals = this.createTierCounts();
			for (const player of teams[teamIndex]) {
				const counts = playerTierCounts.get(player);
				for (const tier of QUALITY_TIERS) {
					teamTotals[tier] += counts[tier];
				}
			}
			debugPrint(
				`[Distribution][Quality] Team ${teamIndex + 1}: S=${teamTotals.S} A=${teamTotals.A} B=${teamTotals.B} C=${teamTotals.C} D=${teamTotals.D} E=${teamTotals.E} F=${teamTotals.F}`,
				DC.distribution
			);
		}

		for (const tier of TOP_QUALITY_TIERS) {
			const values = teams.map((team) =>
				team.reduce((sum, player) => {
					return sum + playerTierCounts.get(player)[tier];
				}, 0)
			);
			const max = values.length > 0 ? Math.max(...values) : 0;
			const min = values.length > 0 ? Math.min(...values) : 0;
			debugPrint(`[Distribution][Quality] Team balance tier ${tier}: delta=${max - min}`, DC.distribution);
		}

		debugPrint(
			`[Distribution][Quality] Fallbacks: topTierMisses=${fallbackCounters.topTierMisses}, preferredTierMisses=${fallbackCounters.preferredTierMisses}, unrestrictedMisses=${fallbackCounters.unrestrictedMisses}`,
			DC.distribution
		);
	}

	private createTierCounts(): TierCounts {
		return { S: 0, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
	}
}
