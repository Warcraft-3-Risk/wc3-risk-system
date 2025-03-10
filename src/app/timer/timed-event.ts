import { TimerEventType } from './timed-event-type';

export class TimedEvent {
	public id: TimerEventType;
	private duration: number;
	private remainingTime: number;
	private repeating: boolean;
	private executeOnTick: boolean;
	private callback: (remainingTime?: number) => void;

	constructor(
		id: TimerEventType,
		duration: number,
		repeating: boolean,
		executeOnTick: boolean,
		callback: (remainingTime?: number) => void
	) {
		this.id = id;
		this.duration = duration;
		this.remainingTime = duration;
		this.repeating = repeating;
		this.executeOnTick = executeOnTick;
		this.callback = (remainingTime?: number) => callback(remainingTime);
	}

	public update(delta: number): boolean {
		if (this.executeOnTick) {
			this.callback(this.remainingTime);
		}

		if (this.remainingTime <= 0) {
			this.callback();

			if (this.repeating) {
				this.reset();
			} else {
				// Remove timer from EventTimerQueue
				return false;
			}
		}

		this.remainingTime -= delta;
		// Do not remove timer from EventTimerQueue
		return true;
	}

	public reset(): void {
		this.remainingTime = this.duration;
	}

	public getRemainingTime(): number {
		return this.remainingTime;
	}
}
