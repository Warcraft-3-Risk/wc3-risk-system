import { describe, test, expect } from 'vitest';
import { DoublyLinkedList } from '../src/app/utils/doubly-linked-list';

describe('DoublyLinkedList', () => {
	describe('constructor and basic state', () => {
		test('new list is empty', () => {
			const list = new DoublyLinkedList<number>();
			expect(list.isEmpty()).toBe(true);
			expect(list.length()).toBe(0);
		});

		test('getFirst and getLast return null on empty list', () => {
			const list = new DoublyLinkedList<number>();
			expect(list.getFirst()).toBeNull();
			expect(list.getLast()).toBeNull();
		});
	});

	describe('addFirst', () => {
		test('adds element to front of empty list', () => {
			const list = new DoublyLinkedList<number>();
			list.addFirst(1);
			expect(list.length()).toBe(1);
			expect(list.getFirst()).toBe(1);
			expect(list.getLast()).toBe(1);
		});

		test('adds elements to front in reverse order', () => {
			const list = new DoublyLinkedList<number>();
			list.addFirst(1);
			list.addFirst(2);
			list.addFirst(3);
			expect(list.getFirst()).toBe(3);
			expect(list.getLast()).toBe(1);
			expect(list.length()).toBe(3);
		});
	});

	describe('addLast', () => {
		test('adds element to back of empty list', () => {
			const list = new DoublyLinkedList<number>();
			list.addLast(1);
			expect(list.length()).toBe(1);
			expect(list.getFirst()).toBe(1);
			expect(list.getLast()).toBe(1);
		});

		test('adds elements to back in order', () => {
			const list = new DoublyLinkedList<number>();
			list.addLast(1);
			list.addLast(2);
			list.addLast(3);
			expect(list.getFirst()).toBe(1);
			expect(list.getLast()).toBe(3);
			expect(list.length()).toBe(3);
		});
	});

	describe('get', () => {
		test('retrieves elements by index', () => {
			const list = new DoublyLinkedList<string>();
			list.addLast('a');
			list.addLast('b');
			list.addLast('c');
			expect(list.get(0)).toBe('a');
			expect(list.get(1)).toBe('b');
			expect(list.get(2)).toBe('c');
		});

		test('throws RangeError for out-of-bounds index', () => {
			const list = new DoublyLinkedList<number>();
			list.addLast(1);
			expect(() => list.get(-1)).toThrow(RangeError);
			expect(() => list.get(1)).toThrow(RangeError);
			expect(() => list.get(100)).toThrow(RangeError);
		});

		test('throws RangeError for empty list', () => {
			const list = new DoublyLinkedList<number>();
			expect(() => list.get(0)).toThrow(RangeError);
		});
	});

	describe('contains', () => {
		test('returns false for empty list', () => {
			const list = new DoublyLinkedList<number>();
			expect(list.contains(1)).toBe(false);
		});

		test('finds existing elements', () => {
			const list = new DoublyLinkedList<number>();
			list.addLast(1);
			list.addLast(2);
			list.addLast(3);
			expect(list.contains(1)).toBe(true);
			expect(list.contains(2)).toBe(true);
			expect(list.contains(3)).toBe(true);
		});

		test('returns false for non-existing elements', () => {
			const list = new DoublyLinkedList<number>();
			list.addLast(1);
			list.addLast(2);
			expect(list.contains(3)).toBe(false);
		});
	});

	describe('indexOf', () => {
		test('returns -1 for empty list', () => {
			const list = new DoublyLinkedList<number>();
			expect(list.indexOf(1)).toBe(-1);
		});

		test('returns correct index for existing elements', () => {
			const list = new DoublyLinkedList<string>();
			list.addLast('a');
			list.addLast('b');
			list.addLast('c');
			expect(list.indexOf('a')).toBe(0);
			expect(list.indexOf('b')).toBe(1);
			expect(list.indexOf('c')).toBe(2);
		});

		test('returns -1 for non-existing elements', () => {
			const list = new DoublyLinkedList<string>();
			list.addLast('a');
			expect(list.indexOf('z')).toBe(-1);
		});
	});

	describe('remove', () => {
		test('removes head element', () => {
			const list = new DoublyLinkedList<number>();
			list.addLast(1);
			list.addLast(2);
			list.addLast(3);
			list.remove(1);
			expect(list.length()).toBe(2);
			expect(list.getFirst()).toBe(2);
		});

		test('removes tail element', () => {
			const list = new DoublyLinkedList<number>();
			list.addLast(1);
			list.addLast(2);
			list.addLast(3);
			list.remove(3);
			expect(list.length()).toBe(2);
			expect(list.getLast()).toBe(2);
		});

		test('removes middle element', () => {
			const list = new DoublyLinkedList<number>();
			list.addLast(1);
			list.addLast(2);
			list.addLast(3);
			list.remove(2);
			expect(list.length()).toBe(2);
			expect(list.get(0)).toBe(1);
			expect(list.get(1)).toBe(3);
		});

		test('does nothing when element not found', () => {
			const list = new DoublyLinkedList<number>();
			list.addLast(1);
			list.addLast(2);
			list.remove(99);
			expect(list.length()).toBe(2);
		});

		test('removes only element in list', () => {
			const list = new DoublyLinkedList<number>();
			list.addLast(1);
			list.remove(1);
			expect(list.isEmpty()).toBe(true);
			expect(list.getFirst()).toBeNull();
			expect(list.getLast()).toBeNull();
		});
	});

	describe('removeFirst', () => {
		test('returns null on empty list', () => {
			const list = new DoublyLinkedList<number>();
			expect(list.removeFirst()).toBeNull();
		});

		test('removes and returns the first element', () => {
			const list = new DoublyLinkedList<number>();
			list.addLast(1);
			list.addLast(2);
			list.addLast(3);
			expect(list.removeFirst()).toBe(1);
			expect(list.length()).toBe(2);
			expect(list.getFirst()).toBe(2);
		});

		test('handles single element list', () => {
			const list = new DoublyLinkedList<number>();
			list.addLast(42);
			expect(list.removeFirst()).toBe(42);
			expect(list.isEmpty()).toBe(true);
		});
	});

	describe('removeLast', () => {
		test('returns null on empty list', () => {
			const list = new DoublyLinkedList<number>();
			expect(list.removeLast()).toBeNull();
		});

		test('removes and returns the last element', () => {
			const list = new DoublyLinkedList<number>();
			list.addLast(1);
			list.addLast(2);
			list.addLast(3);
			expect(list.removeLast()).toBe(3);
			expect(list.length()).toBe(2);
			expect(list.getLast()).toBe(2);
		});

		test('handles single element list', () => {
			const list = new DoublyLinkedList<number>();
			list.addLast(42);
			expect(list.removeLast()).toBe(42);
			expect(list.isEmpty()).toBe(true);
		});
	});

	describe('mixed operations', () => {
		test('addFirst and addLast interleave correctly', () => {
			const list = new DoublyLinkedList<number>();
			list.addLast(2);
			list.addFirst(1);
			list.addLast(3);
			list.addFirst(0);
			// Expected: 0, 1, 2, 3
			expect(list.get(0)).toBe(0);
			expect(list.get(1)).toBe(1);
			expect(list.get(2)).toBe(2);
			expect(list.get(3)).toBe(3);
			expect(list.length()).toBe(4);
		});

		test('remove and add cycle maintains integrity', () => {
			const list = new DoublyLinkedList<number>();
			for (let i = 0; i < 5; i++) {
				list.addLast(i);
			}
			// Remove all via removeFirst
			for (let i = 0; i < 5; i++) {
				expect(list.removeFirst()).toBe(i);
			}
			expect(list.isEmpty()).toBe(true);

			// Re-add via addFirst
			for (let i = 0; i < 5; i++) {
				list.addFirst(i);
			}
			// Expected: 4, 3, 2, 1, 0
			expect(list.getFirst()).toBe(4);
			expect(list.getLast()).toBe(0);
			expect(list.length()).toBe(5);
		});
	});
});
