import { RandomEvent } from '../random-event';
import { RandomEventManager } from '../random-event-manager';
import { HexColors } from 'src/app/utils/hex-colors';

export class WarProfiteering implements RandomEvent {
	readonly id = 'war-profiteering';
	readonly name = 'War Profiteering';
	readonly category = 'economic' as const;
	readonly duration = 2;

	announce(): string {
		return `Bounty increased to ${HexColors.GREEN}50%|r of unit value for ${this.duration} turns.`;
	}

	activate(): void {
		RandomEventManager.getInstance().bountyMultiplier = 2.0;
	}

	deactivate(): void {
		RandomEventManager.getInstance().bountyMultiplier = 1.0;
	}
}
