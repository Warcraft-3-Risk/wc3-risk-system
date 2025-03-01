import { EventTimer } from './EventTimer';
import { TimerEventType } from './TimerEventType';

export class TimerEvent {
	public id: TimerEventType;
	protected interval: number;
	protected duration: number;
	protected repeating: boolean;
	protected executeOnTick: boolean;
	protected callback: (remainingTime?: number) => void;

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
		this.callback = callback;
	}

	public update(delta: number): void {
		this.duration -= delta;

		if (this.executeOnTick) {
			this.callback(this.duration);
		}

		if (this.duration <= 0) {
			this.callback();

			if (this.repeating) {
				this.reset();
			} else {
				this.stop();
			}
		}
	}

	public reset(): void {
		this.duration = this.interval;
	}

	public stop(): void {
		EventTimer.getInstance().stopEvent(this.id);
	}

	public getRemainingTime(): number {
		return this.duration;
	}
}
