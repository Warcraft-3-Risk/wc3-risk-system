import { Bonus } from './bonus';

export class Bounty implements Bonus {
	public static readonly factor: number = 0.25;
	public static readonly interval: number = 1;

	private delta: number;
	private total: number;

	constructor() {
		this.delta = 0;
		this.total = 0;
	}

	public reset(): void {
		this.delta = 0;
	}

	public add(val: number): number {
		let bonusAmount: number = 0;

		this.delta += val * Bounty.factor;

		if (this.delta >= Bounty.interval) {
			bonusAmount = this.processBonus();
		}

		return bonusAmount;
	}

	public getTotal(): number {
		return this.total;
	}

	private processBonus(): number {
		let bonusAmount: number = Math.floor(this.delta);

		this.delta -= bonusAmount;
		this.total += bonusAmount;

		return bonusAmount;
	}
}
