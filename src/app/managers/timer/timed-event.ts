import { TimerEventType } from './timed-event-type';

export class TimedEvent {
	public id: TimerEventType;
	private interval: number;
	private duration: number;
	private repeating: boolean;
	private executeOnTick: boolean;
	private callback: (remainingTime?: number) => void;

	constructor(
		id: TimerEventType,
		interval: number,
		repeating: boolean,
		executeOnTick: boolean,
		callback: (remainingTime?: number) => void
	) {
		this.id = id;
		this.interval = interval;
		this.duration = interval;
		this.repeating = repeating;
		this.executeOnTick = executeOnTick;
		this.callback = (remainingTime?: number) => callback(remainingTime);
	}

	public update(delta: number): boolean {
		this.duration -= delta;

		if (this.executeOnTick) {
			this.callback(this.duration);
		}

		if (this.duration <= 0) {
			this.callback();

			if (this.repeating) {
				this.reset();
			} else {
				// Remove timer from EventTimerQueue
				return false;
			}
		}

		// Do not remove timer from EventTimerQueue
		return true;
	}

	public reset(): void {
		this.duration = this.interval;
	}

	public getRemainingTime(): number {
		return this.duration;
	}
}
