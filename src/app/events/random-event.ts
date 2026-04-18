export type EventCategory = 'economic' | 'combat' | 'naval' | 'territorial' | 'strategic';

export interface RandomEvent {
	readonly id: string;
	readonly name: string;
	readonly category: EventCategory;
	readonly duration: number;
	announce(): string;
	activate(): void;
	deactivate(): void;
	isEligible?(): boolean;
}
