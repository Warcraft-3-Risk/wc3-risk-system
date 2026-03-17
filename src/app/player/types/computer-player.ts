import { ActivePlayer } from './active-player';
import { debugPrint } from '../../utils/debug-print';
import { DC } from 'src/configs/game-settings';
import { BotTerritoryTracker } from '../../bot/territory-tracker';
import { AdjacencyGraph } from '../../bot/adjacency-graph';
import { GlobalStats } from '../../bot/bot-types';
import { CampaignState } from './bot-functions/bot-skill-context';
import { economyStep } from './bot-functions/bot-economy';
import { selectTarget } from './bot-functions/bot-targeting';
import { attackStep } from './bot-functions/bot-combat';
import { reinforceStep } from './bot-functions/bot-reinforce';

export class ComputerPlayer extends ActivePlayer {
	public readonly territory: BotTerritoryTracker = new BotTerritoryTracker();
	private campaign: CampaignState = {
		currentTarget: null,
		campaignTicks: 0,
		lastOwnedInTarget: 0,
		consolidating: false,
	};
	private pendingOrders: { unit: unit; x: number; y: number }[] = [];

	constructor(player: player) {
		super(player);
		debugPrint(`[Bot] ComputerPlayer created for slot ${GetPlayerId(player)}`, DC.bot);
	}

	public think(adjacencyGraph: AdjacencyGraph, globalStats: GlobalStats): void {
		const p = this.getPlayer();
		const cities = this.trackedData.cities.cities.length;
		const units = this.trackedData.units.size;
		const gold = GetPlayerState(p, PLAYER_STATE_RESOURCE_GOLD);

		this.territory.update(this.trackedData.cities.cities, adjacencyGraph, GetPlayerId(p));

		debugPrint(`[Bot] Slot ${GetPlayerId(p)} THINK — cities=${cities}, units=${units}, gold=${gold}`, DC.bot);

		const ctx = {
			player: p,
			playerId: GetPlayerId(p),
			cities: this.trackedData.cities.cities,
			units: this.trackedData.units,
			territory: this.territory,
			campaign: this.campaign,
			pendingOrders: this.pendingOrders,
			orderedThisTick: new Set<unit>(),
		};

		economyStep(ctx);
		selectTarget(ctx, adjacencyGraph, globalStats);
		attackStep(ctx, adjacencyGraph);
		reinforceStep(ctx, adjacencyGraph);
	}

	public getCurrentTarget(): string | null {
		return this.campaign.currentTarget;
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
