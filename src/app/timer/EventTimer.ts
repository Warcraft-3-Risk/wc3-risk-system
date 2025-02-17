import { TimerEvent } from './TimerEvent';
import { TimerEventType } from './TimerEventType';

export class EventTimer {
	private static instance: EventTimer;
	private timer: timer;
	private events: Map<TimerEventType, TimerEvent> = new Map();
	private tickInterval: number;

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

	public addEvent(id: TimerEventType, interval: number, repeating: boolean, callback: () => void): void {
		this.events.set(id, {
			id: id,
			interval: interval,
			remainingTime: interval,
			repeating: repeating,
			callback: callback,
		});
	}

	public getEvent(eventId: TimerEventType): TimerEvent {
		return this.events.get(eventId);
	}

	public stop(): void {
		this.events.forEach((event) => this.stopEvent(event.id));
	}

	public stopEvent(id: TimerEventType): void {
		this.removeEvent(id);
	}

	private update(): void {
		this.events.forEach((event) => {
			event.callback();

			event.remainingTime -= this.tickInterval;

			if (event.remainingTime <= 0) {
				if (event.repeating) {
					event.remainingTime = event.interval;
				} else {
					this.removeEvent(event.id);
				}
			}
		});
	}

	private removeEvent(id: TimerEventType): void {
		this.events.delete(id);
	}
}
