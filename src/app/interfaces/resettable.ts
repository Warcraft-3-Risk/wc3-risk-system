export interface Resetable<T = void> {
	reset(context: T): void;
}
