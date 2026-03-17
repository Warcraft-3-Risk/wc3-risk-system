import { ComputerPlayer } from 'src/app/player/types/computer-player';
import { PlayerManager } from 'src/app/player/player-manager';
import { debugPrint } from 'src/app/utils/debug-print';
import { DC, TICK_DURATION_IN_SECONDS } from 'src/configs/game-settings';
import { GlobalGameData } from 'src/app/game/state/global-game-state';
import { AdjacencyGraph } from 'src/app/bot/adjacency-graph';
import { AdjacencyMap } from 'src/configs/adjacency/adjacency-types';
import { MAP_TYPE } from 'src/app/utils/map-info';
import { EUROPE_ADJACENCY } from 'src/configs/adjacency/europe-adjacency';
import { GlobalStats } from 'src/app/bot/bot-types';

const BOT_THINK_INTERVAL = 2; // seconds between thinks

function getAdjacencyForMap(): AdjacencyMap | null {
	switch (MAP_TYPE) {
		case 'europe':
			return EUROPE_ADJACENCY;
		default:
			return null;
	}
}

export class BotManager {
	private static instance: BotManager;

	private bots: ComputerPlayer[] = [];
	private thinkCounters: Map<ComputerPlayer, number> = new Map();
	private started: boolean = false;
	public adjacencyGraph: AdjacencyGraph;
	public globalStats: GlobalStats = {
		largestPlayer: null,
		largestCityCount: 0,
		totalActivePlayers: 0,
		totalCities: 0,
		playerStats: new Map(),
	};

	private constructor() {
		// Load adjacency data for the current map
		this.adjacencyGraph = new AdjacencyGraph(getAdjacencyForMap());

		// Discover computer players from PlayerManager
		const pm = PlayerManager.getInstance();
		for (const [handle, activePlayer] of pm.players) {
			if (pm.isComputerPlayer(handle)) {
				this.bots.push(activePlayer as ComputerPlayer);
			}
		}

		debugPrint(`[BotManager] Initialized with ${this.bots.length} bots`, DC.bot);
	}

	public static getInstance(): BotManager {
		if (!BotManager.instance) {
			BotManager.instance = new BotManager();
		}
		return BotManager.instance;
	}

	public getBots(): ComputerPlayer[] {
		return this.bots;
	}

	public updateGlobalStats(): void {
		const pm = PlayerManager.getInstance();
		const stats = this.globalStats;
		stats.playerStats.clear();
		stats.largestPlayer = null;
		stats.largestCityCount = 0;
		stats.totalCities = 0;
		stats.totalActivePlayers = 0;

		for (const [handle, ap] of pm.activePlayersThatAreAlive) {
			const cityCount = ap.trackedData.cities.cities.length;
			stats.totalCities += cityCount;
			stats.totalActivePlayers++;

			stats.playerStats.set(handle, {
				player: handle,
				activePlayer: ap,
				cityCount,
				strength: 0, // computed after totals
			});

			if (cityCount > stats.largestCityCount) {
				stats.largestCityCount = cityCount;
				stats.largestPlayer = handle;
			}
		}

		// Compute relative strength
		if (stats.totalCities > 0) {
			for (const [, ps] of stats.playerStats) {
				ps.strength = ps.cityCount / stats.totalCities;
			}
		}

		const largestId = stats.largestPlayer !== null ? GetPlayerId(stats.largestPlayer) : -1;
		const pct = stats.totalCities > 0 ? math.floor((stats.largestCityCount / stats.totalCities) * 100) : 0;
		debugPrint(
			`[Stats] Largest: slot ${largestId} with ${stats.largestCityCount} cities (${pct}%), active=${stats.totalActivePlayers}`,
			DC.bot
		);
	}

	public start(): void {
		if (this.started || this.bots.length === 0) return;
		this.started = true;

		debugPrint(`[BotManager] Adjacency data loaded: ${this.adjacencyGraph.hasData() ? 'yes' : 'NO — bots will play suboptimally'}`, DC.bot);

		// Stagger: bot 0 starts at 0, bot 1 starts at 1, etc.
		this.bots.forEach((bot, index) => {
			this.thinkCounters.set(bot, index % BOT_THINK_INTERVAL);
		});

		// Log initial bot state
		for (const bot of this.bots) {
			const p = bot.getPlayer();
			const cities = bot.trackedData.cities.cities.length;
			const gold = GetPlayerState(p, PLAYER_STATE_RESOURCE_GOLD);
			debugPrint(`[Bot] Slot ${GetPlayerId(p)} starting state — cities: ${cities}, gold: ${gold}`, DC.bot);
		}

		const botTimer = CreateTimer();
		TimerStart(botTimer, TICK_DURATION_IN_SECONDS, true, () => {
			if (GlobalGameData.matchState !== 'inProgress') return;

			// Update global stats once per tick, before any bot thinks
			this.updateGlobalStats();

			for (const [bot, counter] of this.thinkCounters) {
				if (!bot.status.isAlive() && !bot.status.isNomad()) continue;

				if (counter <= 0) {
					bot.think(this.adjacencyGraph, this.globalStats);
					this.thinkCounters.set(bot, BOT_THINK_INTERVAL);
				} else {
					this.thinkCounters.set(bot, counter - 1);
				}
			}
		});

		debugPrint(`[BotManager] Think loop started. ${this.bots.length} bots, interval=${BOT_THINK_INTERVAL}s`, DC.bot);
	}
}
