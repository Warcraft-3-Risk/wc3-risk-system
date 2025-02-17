class DoublyLinkedListNode<T> {
	public value: T;
	public next: DoublyLinkedListNode<T> | null;
	public prev: DoublyLinkedListNode<T> | null;

	constructor(value?: T) {
		this.value = value!;
		this.next = null;
		this.prev = null;
	}
}

export class DoublyLinkedList<T> {
	private head: DoublyLinkedListNode<T> | null;
	private tail: DoublyLinkedListNode<T> | null;
	private size: number;

	constructor() {
		this.head = null;
		this.tail = null;
		this.size = 0;
	}

	public length(): number {
		return this.size;
	}

	public isEmpty(): boolean {
		return this.size <= 0;
	}

	public contains(value: T): boolean {
		let tmp = this.head;
		while (tmp) {
			if (tmp.value === value) {
				return true;
			}
			tmp = tmp.next;
		}
		return false;
	}

	public get(index: number): T {
		if (index >= this.size || index < 0 || this.isEmpty()) {
			throw new RangeError('Index out of range.');
		}

		let tmp: DoublyLinkedListNode<T> | null = this.head;

		for (let i = 0; i < index; i++) {
			if (tmp) tmp = tmp.next;
		}

		return tmp!.value;
	}

	public getFirst(): T | null {
		return this.head ? this.head.value : null;
	}

	public getLast(): T | null {
		return this.tail ? this.tail.value : null;
	}

	public addLast(value: T): void {
		const newNode = new DoublyLinkedListNode(value);
		if (this.isEmpty()) {
			this.head = newNode;
			this.tail = newNode;
		} else {
			if (this.tail) {
				this.tail.next = newNode;
				newNode.prev = this.tail;
				this.tail = newNode;
			}
		}
		this.size++;
	}

	public addFirst(value: T): void {
		const newNode = new DoublyLinkedListNode(value);
		if (this.isEmpty()) {
			this.head = newNode;
			this.tail = newNode;
		} else {
			if (this.head) {
				this.head.prev = newNode;
				newNode.next = this.head;
				this.head = newNode;
			}
		}
		this.size++;
	}

	public remove(value: T): void {
		let tmp = this.head;
		while (tmp) {
			if (tmp.value === value) {
				if (tmp.prev) {
					tmp.prev.next = tmp.next;
				} else {
					this.head = tmp.next;
				}
				if (tmp.next) {
					tmp.next.prev = tmp.prev;
				} else {
					this.tail = tmp.prev;
				}
				this.size--;
				return;
			}
			tmp = tmp.next;
		}
	}

	public removeFirst(): T | null {
		if (this.isEmpty()) {
			return null;
		}
		const removedValue = this.head!.value;
		if (this.size === 1) {
			this.head = null;
			this.tail = null;
		} else {
			if (this.head) {
				this.head = this.head.next;
				this.head!.prev = null;
			}
		}
		this.size--;
		return removedValue;
	}

	public removeLast(): T | null {
		if (this.isEmpty()) {
			return null;
		}
		const removedValue = this.tail!.value;
		if (this.size === 1) {
			this.head = null;
			this.tail = null;
		} else {
			if (this.tail) {
				this.tail = this.tail.prev;
				this.tail!.next = null;
			}
		}
		this.size--;
		return removedValue;
	}

	public indexOf(value: T): number {
		let index = 0;
		let tmp = this.head;
		while (tmp) {
			if (tmp.value === value) {
				return index;
			}
			tmp = tmp.next;
			index++;
		}
		return -1;
	}
}
