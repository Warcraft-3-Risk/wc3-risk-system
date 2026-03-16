import { ComputerPlayer } from 'src/app/player/types/computer-player';
import { PlayerManager } from 'src/app/player/player-manager';
import { debugPrint } from 'src/app/utils/debug-print';
import { DC } from 'src/configs/game-settings';
import { TICK_DURATION_IN_SECONDS } from 'src/configs/game-settings';
import { GlobalGameData } from 'src/app/game/state/global-game-state';

const BOT_THINK_INTERVAL = 2; // seconds between thinks

export class BotManager {
	private static instance: BotManager;

	private bots: ComputerPlayer[] = [];
	private thinkCounters: Map<ComputerPlayer, number> = new Map();
	private started: boolean = false;

	private constructor() {
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

	public start(): void {
		if (this.started || this.bots.length === 0) return;
		this.started = true;

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

			for (const [bot, counter] of this.thinkCounters) {
				if (!bot.status.isAlive() && !bot.status.isNomad()) continue;

				if (counter <= 0) {
					bot.think();
					this.thinkCounters.set(bot, BOT_THINK_INTERVAL);
				} else {
					this.thinkCounters.set(bot, counter - 1);
				}
			}
		});

		debugPrint(`[BotManager] Think loop started. ${this.bots.length} bots, interval=${BOT_THINK_INTERVAL}s`, DC.bot);
	}
}
