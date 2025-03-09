import { TimedEvent } from './timed-event';
import { TimerEventType } from './timed-event-type';

export class TimedEventManager {
	private static instance: TimedEventManager;
	private timer: timer;
	private tickInterval: number;
	private events: Map<TimerEventType, TimedEvent> = new Map();

	private constructor(tickInterval: number = 1.0) {
		this.timer = CreateTimer();
		this.tickInterval = tickInterval;

		TimerStart(this.timer, this.tickInterval, true, () => {
			this.update();
		});
	}

	public static getInstance(): TimedEventManager {
		if (!TimedEventManager.instance) {
			TimedEventManager.instance = new TimedEventManager();
		}
		return TimedEventManager.instance;
	}

	public addEvent(event: TimedEvent): void {
		this.events.set(event.id, event);
	}

	public getEvent(eventId: TimerEventType): TimedEvent | undefined {
		return this.events.get(eventId);
	}

	public stopEvent(id: TimerEventType): void {
		this.events.delete(id);
	}

	public stopAll(): void {
		this.events.clear();
	}

	private update(): void {
		for (const [id, event] of this.events.entries()) {
			if (!event.update(this.tickInterval)) {
				this.events.delete(id);
			}
		}
	}
}
