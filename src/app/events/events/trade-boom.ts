import { RandomEvent } from '../random-event';
import { RandomEventManager } from '../random-event-manager';
import { HexColors } from 'src/app/utils/hex-colors';

export class TradeBoom implements RandomEvent {
	readonly id = 'trade-boom';
	readonly name = 'Trade Boom';
	readonly category = 'economic' as const;
	readonly duration = 2;

	announce(): string {
		return `${HexColors.GREEN}+50%|r country bonus income for ${this.duration} turns.`;
	}

	activate(): void {
		RandomEventManager.getInstance().incomeMultiplier = 1.5;
	}

	deactivate(): void {
		RandomEventManager.getInstance().incomeMultiplier = 1.0;
	}
}
