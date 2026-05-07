import { GameEventMap } from './event-map';

type EventHandler = (...args: any[]) => void | Promise<void>;

export class EventEmitter {
	private static instance: EventEmitter;
	private events: Map<string, EventHandler[]> = new Map();

	private constructor() {}

	public static getInstance(): EventEmitter {
		if (!EventEmitter.instance) {
			EventEmitter.instance = new EventEmitter();
		}
		return EventEmitter.instance;
	}

	/**
	 * Reset the singleton instance. For testing purposes only.
	 */
	public static resetInstance(): void {
		EventEmitter.instance = undefined as unknown as EventEmitter;
	}

	public on<K extends keyof GameEventMap>(event: K, handler: (...args: GameEventMap[K]) => void | Promise<void>): void;
	public on(event: string, handler: EventHandler): void;
	public on(event: string, handler: EventHandler): void {
		if (!this.events.has(event)) {
			this.events.set(event, []);
		}
		this.events.get(event)?.push(handler);
	}

	public emit<K extends keyof GameEventMap>(event: K, ...args: GameEventMap[K]): void;
	public emit(event: string, ...args: any[]): void;
	public emit(event: string, ...args: any[]): void {
		const handlers = this.events.get(event) || [];
		for (const handler of handlers) {
			try {
				handler(...args);
			} catch (e) {
				print(`[EventEmitter] Error in handler for '${event}': ${e}`);
			}
		}
	}
}
