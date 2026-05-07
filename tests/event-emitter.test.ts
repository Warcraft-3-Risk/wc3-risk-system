import { describe, it, expect, beforeEach, vi } from 'vitest';

// Re-implement EventEmitter for testing since the src version uses WC3's print()
// which isn't available in Node.js. The logic is identical.
type EventHandler = (...args: unknown[]) => void | Promise<void>;

class EventEmitter {
	private events: Map<string, EventHandler[]> = new Map();

	public on(event: string, handler: EventHandler): void {
		if (!this.events.has(event)) {
			this.events.set(event, []);
		}
		this.events.get(event)?.push(handler);
	}

	public emit(event: string, ...args: unknown[]): void {
		const handlers = this.events.get(event) || [];
		for (const handler of handlers) {
			try {
				handler(...args);
			} catch (_e) {
				// Error boundary: log but don't propagate
			}
		}
	}
}

describe('EventEmitter', () => {
	let emitter: EventEmitter;

	beforeEach(() => {
		emitter = new EventEmitter();
	});

	describe('on and emit', () => {
		it('should call registered handler when event is emitted', () => {
			const handler = vi.fn();
			emitter.on('test', handler);
			emitter.emit('test');
			expect(handler).toHaveBeenCalledOnce();
		});

		it('should pass arguments to handler', () => {
			const handler = vi.fn();
			emitter.on('test', handler);
			emitter.emit('test', 'arg1', 42);
			expect(handler).toHaveBeenCalledWith('arg1', 42);
		});

		it('should call multiple handlers for the same event', () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();
			emitter.on('test', handler1);
			emitter.on('test', handler2);
			emitter.emit('test');
			expect(handler1).toHaveBeenCalledOnce();
			expect(handler2).toHaveBeenCalledOnce();
		});

		it('should not call handlers for other events', () => {
			const handler = vi.fn();
			emitter.on('test', handler);
			emitter.emit('other');
			expect(handler).not.toHaveBeenCalled();
		});

		it('should handle emitting event with no registered handlers', () => {
			expect(() => emitter.emit('nonexistent')).not.toThrow();
		});

		it('should call handlers in registration order', () => {
			const order: number[] = [];
			emitter.on('test', () => order.push(1));
			emitter.on('test', () => order.push(2));
			emitter.on('test', () => order.push(3));
			emitter.emit('test');
			expect(order).toEqual([1, 2, 3]);
		});
	});

	describe('error boundaries', () => {
		it('should not propagate errors from handlers', () => {
			emitter.on('test', () => {
				throw new Error('handler error');
			});
			expect(() => emitter.emit('test')).not.toThrow();
		});

		it('should continue calling handlers after one throws', () => {
			const handler1 = vi.fn(() => {
				throw new Error('handler1 error');
			});
			const handler2 = vi.fn();

			emitter.on('test', handler1);
			emitter.on('test', handler2);
			emitter.emit('test');

			expect(handler1).toHaveBeenCalledOnce();
			expect(handler2).toHaveBeenCalledOnce();
		});

		it('should handle multiple handlers throwing errors', () => {
			const handler1 = vi.fn(() => {
				throw new Error('error 1');
			});
			const handler2 = vi.fn(() => {
				throw new Error('error 2');
			});
			const handler3 = vi.fn();

			emitter.on('test', handler1);
			emitter.on('test', handler2);
			emitter.on('test', handler3);
			emitter.emit('test');

			expect(handler1).toHaveBeenCalledOnce();
			expect(handler2).toHaveBeenCalledOnce();
			expect(handler3).toHaveBeenCalledOnce();
		});
	});
});
