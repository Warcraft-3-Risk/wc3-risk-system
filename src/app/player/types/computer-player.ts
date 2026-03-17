import { ActivePlayer } from './active-player';
import { debugPrint } from '../../utils/debug-print';
import { DC } from 'src/configs/game-settings';
import { UNIT_ID } from 'src/configs/unit-id';
import { BotTerritoryTracker } from '../../bot/territory-tracker';
import { AdjacencyGraph } from '../../bot/adjacency-graph';

const BOT_MAX_TRAINS_PER_THINK = 5;

export class ComputerPlayer extends ActivePlayer {
	public readonly territory: BotTerritoryTracker = new BotTerritoryTracker();

	constructor(player: player) {
		super(player);
		debugPrint(`[Bot] ComputerPlayer created for slot ${GetPlayerId(player)}`, DC.bot);
	}

	public think(adjacencyGraph: AdjacencyGraph): void {
		const p = this.getPlayer();
		const cities = this.trackedData.cities.cities.length;
		const units = this.trackedData.units.size;
		const gold = GetPlayerState(p, PLAYER_STATE_RESOURCE_GOLD);

		// Update territory awareness before any decisions
		this.territory.update(this.trackedData.cities.cities, adjacencyGraph, GetPlayerId(p));

		debugPrint(`[Bot] Slot ${GetPlayerId(p)} THINK — cities=${cities}, units=${units}, gold=${gold}`, DC.bot);

		this.economyStep();
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
