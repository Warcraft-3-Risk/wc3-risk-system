import { TimerEvent } from './TimerEvent';
import { TimerEventType } from './TimerEventType';

export class EventTimer {
	private static instance: EventTimer;
	private timer: timer;
	private tickInterval: number;
	private events: Map<TimerEventType, TimerEvent> = new Map();

	private constructor(tickInterval: number = 1.0) {
		this.timer = CreateTimer();
		this.tickInterval = tickInterval;

		TimerStart(this.timer, this.tickInterval, true, () => {
			this.update();
		});
	}

	public static getInstance(): EventTimer {
		if (!EventTimer.instance) {
			EventTimer.instance = new EventTimer();
		}
		return EventTimer.instance;
	}

	public addEvent(event: TimerEvent): void {
		this.events.set(event.id, event);
	}

	public getEvent(eventId: TimerEventType): TimerEvent | undefined {
		return this.events.get(eventId);
	}

	public stopEvent(id: TimerEventType): void {
		const event = this.events.get(id);
		if (event) {
			event.stop();
			this.events.delete(id);
		}
	}

	public stopAll(): void {
		this.events.clear();
	}

	private update(): void {
		this.events.forEach((event) => event.update(this.tickInterval));
	}
}
