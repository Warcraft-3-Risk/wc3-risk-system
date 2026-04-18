import { RandomEventManager } from './random-event-manager';
import { TradeBoom } from './events/trade-boom';
import { Famine } from './events/famine';
import { WarProfiteering } from './events/war-profiteering';

export function registerAllEvents(): void {
	const manager = RandomEventManager.getInstance();
	manager.registerEvent(new TradeBoom());
	manager.registerEvent(new Famine());
	manager.registerEvent(new WarProfiteering());
}
