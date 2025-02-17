import { TimerEventType } from './TimerEventType';

export type TimerEvent = {
	id: TimerEventType;
	interval: number;
	remainingTime: number;
	repeating: boolean;
	callback: () => void;
};
