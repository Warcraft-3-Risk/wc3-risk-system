import { EventCategory, RandomEvent } from './random-event';
import { isPreviewTurn, selectEvent, shouldTriggerEvent } from './random-event-logic';
import { RANDOM_EVENT_HISTORY_SIZE, RANDOM_EVENT_INTERVAL } from 'src/configs/game-settings';
import { GlobalMessage } from 'src/app/utils/messages';
import { HexColors } from 'src/app/utils/hex-colors';
import { debugPrint } from 'src/app/utils/debug-print';
import { DC, DEBUG_PRINTS } from 'src/configs/game-settings';

export interface EventLogEntry {
	turn: number;
	name: string;
	description: string;
}

export class RandomEventManager {
	private static instance: RandomEventManager;

	private pool: RandomEvent[] = [];
	private recentHistory: string[] = [];
	private lastCategory: EventCategory | undefined;
	private activeEvent: RandomEvent | undefined;
	private turnsRemaining: number = 0;
	private pendingEvent: RandomEvent | undefined;

	private _incomeMultiplier: number = 1.0;
	private _bountyMultiplier: number = 1.0;
	private eventLog: EventLogEntry[] = [];

	private constructor() {}

	public static getInstance(): RandomEventManager {
		if (this.instance === undefined) {
			this.instance = new RandomEventManager();
		}
		return this.instance;
	}

	public static resetInstance(): void {
		this.instance = undefined as unknown as RandomEventManager;
	}

	public registerEvent(event: RandomEvent): void {
		this.pool.push(event);
	}

	public getPool(): readonly RandomEvent[] {
		return this.pool;
	}

	public getActiveEvent(): RandomEvent | undefined {
		return this.activeEvent;
	}

	public getEventLog(): readonly EventLogEntry[] {
		return this.eventLog;
	}

	public get incomeMultiplier(): number {
		return this._incomeMultiplier;
	}

	public set incomeMultiplier(value: number) {
		this._incomeMultiplier = value;
	}

	public get bountyMultiplier(): number {
		return this._bountyMultiplier;
	}

	public set bountyMultiplier(value: number) {
		this._bountyMultiplier = value;
	}

	public onStartTurn(turn: number): void {
		// Tick down active event duration
		if (this.activeEvent && this.turnsRemaining > 0) {
			this.turnsRemaining--;

			if (this.turnsRemaining <= 0) {
				if (DEBUG_PRINTS.master) debugPrint(`[RandomEvents] Deactivating: ${this.activeEvent.name}`, DC.randomEvents);
				this.activeEvent.deactivate();
				GlobalMessage(`${HexColors.TANGERINE}${this.activeEvent.name}|r has ended.`);
				this.activeEvent = undefined;
			}
		}

		// Check for activation of pending event
		if (shouldTriggerEvent(turn, RANDOM_EVENT_INTERVAL) && this.pendingEvent) {
			this.activateEvent(this.pendingEvent, turn);
			this.pendingEvent = undefined;
		}

		// Check for preview of next event
		if (isPreviewTurn(turn, RANDOM_EVENT_INTERVAL)) {
			const selected = selectEvent(this.pool, this.recentHistory, this.lastCategory, (min, max) =>
				GetRandomInt(min, max)
			);

			if (selected) {
				this.pendingEvent = selected;
				if (DEBUG_PRINTS.master) debugPrint(`[RandomEvents] Preview: ${selected.name}`, DC.randomEvents);
				GlobalMessage(
					`${HexColors.TANGERINE}EVENT INCOMING:|r ${selected.name} activates next turn! ${selected.announce()}`,
					'Sound\\Interface\\Hint.flac',
					5
				);
			}
		}
	}

	private activateEvent(event: RandomEvent, turn: number): void {
		// Deactivate current event if one is still running
		if (this.activeEvent) {
			this.activeEvent.deactivate();
			this.activeEvent = undefined;
		}

		if (DEBUG_PRINTS.master) debugPrint(`[RandomEvents] Activating: ${event.name} for ${event.duration} turns`, DC.randomEvents);

		this.activeEvent = event;
		this.turnsRemaining = event.duration;
		this.lastCategory = event.category;

		// Update history ring buffer
		this.recentHistory.push(event.id);
		if (this.recentHistory.length > RANDOM_EVENT_HISTORY_SIZE) {
			this.recentHistory.shift();
		}

		event.activate();

		this.eventLog.push({
			turn,
			name: event.name,
			description: event.announce(),
		});

		GlobalMessage(
			`${HexColors.TANGERINE}${event.name}|r is now active! ${event.duration} turns remaining.`,
			'Sound\\Interface\\ItemReceived.flac',
			5
		);
	}
}
